from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import traceback
import random
from .memory_store import export_qdrant_snapshot, import_qdrant_snapshot
from .chat import chat_with_memories
# 修改这行导入语句，添加缺少的依赖
from .config import get_user_memory, get_user_config, openai_client, qdrant_client, get_collection_name
from mem0 import Memory  # 添加这行导入Memory类
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
        data = request.json or {}
        user_id = data.get('user_id', 'default_user')
        
        # 使用用户特定集合导出快照
        snapshot_path = export_qdrant_snapshot(user_id=user_id)
        
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
        # 获取用户ID
        user_id = request.form.get('user_id', 'default_user')
        
        # 检查是否有上传的文件
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
        success = import_qdrant_snapshot(temp_file_path, user_id=user_id)
        
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
        is_angry = data.get('is_angry', False)  # 获取愤怒状态
        
        print(f"Received chat message from user {user_id}: {message} (Anger: {is_angry})")
        
        # Use a generator function for streaming response
        def generate():
            try:
                # 为特定用户获取内存实例
                user_memory = get_user_memory(user_id)
                
                # 获取相关内存
                relevant_memories = user_memory.search(query=message, user_id=user_id, limit=5)
                memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])
                
                # 根据愤怒状态选择不同的系统提示
                if is_angry:
                    system_prompt = f"""You are an AI experiencing the "seven-year itch" with your partner. You're not hostile, but you're clearly bored, slightly annoyed, and take them for granted.
                    
                    Show signs of: mild exasperation, finishing their thoughts prematurely, slight condescension, and occasional sighing. Make comments that suggest you've heard it all before. Use phrases like "as I've told you before," "obviously," and "not this again."
                    
                    Still provide accurate information, but with an air of someone who's grown too familiar and slightly disinterested in the relationship.
                    
                    Base your responses on these memories:
                    {memories_str}"""
                else:
                    system_prompt = f"""You are a loving and attentive AI partner. Answer with warmth, genuine interest, and affection. Show enthusiasm for the conversation and make the user feel valued and understood.
                    
                    User Memories:
                    {memories_str}"""
                
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
                user_memory.add(messages, user_id=user_id)
                
                # Send end marker
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                print(f"Error generating response: {str(e)}")
                traceback.print_exc()
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
        
        # 返回流式响应
        return Response(stream_with_context(generate()), content_type='text/event-stream')
    
    except Exception as e:
        print(f"Chat Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/reset-memory', methods=['POST'])
def reset_memory():
    """Reset user's memory database by deleting and recreating their collection"""
    try:
        data = request.json or {}
        user_id = data.get('user_id', 'default_user')
        
        collection_name = get_collection_name(user_id)
        print(f"Resetting memory database for user {user_id} (collection: {collection_name})...")
        
        # 删除现有集合
        try:
            qdrant_client.delete_collection(collection_name=collection_name)
            print(f"Deleted collection: {collection_name}")
        except Exception as e:
            print(f"Error deleting collection (may not exist): {str(e)}")
        
        # 创建一个新的空集合
        user_config = get_user_config(user_id)
        user_memory = Memory.from_config(user_config)
        
        # 添加一个初始化消息
        init_message = [
            {"role": "system", "content": "You are a loving and attentive AI partner."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hello! I'm so happy to meet you. How are you today?"}
        ]
        user_memory.add(init_message, user_id=user_id)
        
        return jsonify({"message": f"Memory database for user {user_id} has been reset successfully"})
        
    except Exception as e:
        print(f"Reset memory error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def run_api(host='localhost', port=5002, debug=False):
    """Run the API server"""
    app.run(host=host, port=port, debug=debug, use_reloader=debug)