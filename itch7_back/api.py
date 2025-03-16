from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import traceback  
from .memory_store import export_qdrant_snapshot, import_qdrant_snapshot
from .chat import chat_with_memories
from .config import memory, openai_client
import logging
from flask import Response, stream_with_context
import json

# Set up logging
logging.basicConfig(
    level=logging.DEBUG, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initializing the Flask application
app = Flask(__name__)
CORS(app)  

@app.route('/api/export-memory', methods=['POST'])
def export_memory():
    """Export memory snapshot and return file download"""
    try:
        # Use the function in memory_store to create a snapshot directly, which will be saved to the your_memory directory
        snapshot_path = export_qdrant_snapshot()
        
        if not snapshot_path or not os.path.exists(snapshot_path):
            return jsonify({"error": "Snapshot export failed"}), 500
            
        # Return to file download
        return send_file(
            snapshot_path,
            as_attachment=True,
            download_name=os.path.basename(snapshot_path),
            mimetype='application/octet-stream'
        )
    except Exception as e:
        print(f"Export Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/import-memory', methods=['POST'])
def import_memory():
    """Importing a memory snapshot from an uploaded file"""
    temp_file_path = None
    try:
        # Check if there is a file uploaded
        if 'snapshot' not in request.files:
            print("Uploaded file not found")
            return jsonify({"error": "Uploaded file not found"}), 400
            
        file = request.files['snapshot']
        
        # Check the file name
        if file.filename == '':
            print("No file selected")
            logger.debug("No file selected: %s", file.filename)
            return jsonify({"error": "No file selected"}), 400
            
        print(f"Received file: {file.filename}")
        
        # Save temporary files
        temp_file_path = tempfile.mktemp(suffix='.snapshot')
        file.save(temp_file_path)
        
        file_size = os.path.getsize(temp_file_path)
        print(f"Saved temporary file: {temp_file_path}, size: {file_size} bytes")
        
        # Importing a Snapshot
        success = import_qdrant_snapshot(temp_file_path)
        
        if success:
            print("Import Success")
            return jsonify({"message": "Memory snapshot imported successfully"})
        else:
            print("Import failed")
            return jsonify({"error": "Memory snapshot import failed"}), 500
    except Exception as e:
        print(f"An error occurred during the import process: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        # Make sure to delete temporary files
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"Temporary file deleted: {temp_file_path}")
            except Exception as e:
                print(f"Failed to delete temporary file: {str(e)}")


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests and return AI responses in a streaming manner"""
    try:
        # Get request data
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "Message cannot be empty"}), 400
            
        message = data['message']
        user_id = data.get('user_id', 'default_user')
        
        print(f"Received chat message: {message}")
        
        # Use a generator function for streaming response
        def generate():
            try:
                # Get relevant memories
                relevant_memories = memory.search(query=message, user_id=user_id, limit=3)
                memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])
                
                # Generate Assistant response
                system_prompt = f"You are a helpful AI. Answer the question based on query and memories.\nUser Memories:\n{memories_str}"
                messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]
                
                # Use streaming output
                stream = openai_client.chat.completions.create(
                    model="deepseek-chat", 
                    messages=messages,
                    stream=True
                )
                
                # Collect the complete response for storage
                assistant_response = ""
                
                for chunk in stream:
                    if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                        content = chunk.choices[0].delta.content
                        if content:
                            # Send data in SSE format
                            yield f"data: {json.dumps({'content': content})}\n\n"
                            assistant_response += content
                
                # Create new conversation memory
                messages.append({"role": "assistant", "content": assistant_response})
                memory.add(messages, user_id=user_id)
                
                # Send end marker
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                print(f"Error generating response: {str(e)}")
                traceback.print_exc()
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            
        return Response(stream_with_context(generate()), 
                        mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", 
                                "X-Accel-Buffering": "no",
                                "Access-Control-Allow-Origin": "*"})
        
    except Exception as e:
        print(f"Error handling chat request: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def run_api(host='localhost', port=5000, debug=False):
    """Run the API server"""
    app.run(host=host, port=port, debug=debug, use_reloader=debug)