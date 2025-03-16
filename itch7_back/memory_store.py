import os
import datetime
import requests
import traceback
from .config import config, qdrant_client

def export_qdrant_snapshot(collection_name=None, snapshot_path=None):
    """
    Export Qdrant collection to a snapshot file
    
    Args:
        collection_name: Name of the collection to export, default is the collection name in config
        snapshot_path: Path to save the snapshot file, default is a timestamp-named file in the your_memory directory
        
    Returns:
        str: Path where the snapshot file is saved
    """
    if collection_name is None:
        collection_name = config["vector_store"]["config"]["collection_name"]
    
    # Create directory to save the snapshot
    memory_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "your_memory")
    if not os.path.exists(memory_dir):
        print(f"Creating directory: {memory_dir}")
        os.makedirs(memory_dir)
    
    if snapshot_path is None:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_filename = f"{collection_name}_snapshot_{timestamp}"
        snapshot_path = os.path.join(memory_dir, snapshot_filename)
    
    try:
        # Check if the collection exists
        collections = qdrant_client.get_collections()
        collection_exists = any(col.name == collection_name for col in collections.collections)
        
        if not collection_exists:
            print(f"Collection '{collection_name}' does not exist")
            return None
            
        # Step 1: Create snapshot
        print(f"Creating snapshot for collection '{collection_name}'...")
        # Use REST API to create snapshot
        qdrant_host = config["vector_store"]["config"]["host"]
        qdrant_port = config["vector_store"]["config"]["port"]
        create_snapshot_url = f"http://{qdrant_host}:{qdrant_port}/collections/{collection_name}/snapshots"
        
        response = requests.post(create_snapshot_url)
        if response.status_code != 200:
            print(f"Failed to create snapshot: {response.text}")
            return None
        
        # Print full response for debugging
        print(f"API response: {response.text}")
        response_data = response.json()
        
        # Try to get snapshot name from response, handle possible different response structures
        if "name" in response_data:
            snapshot_name = response_data["name"]
        elif "result" in response_data and "name" in response_data["result"]:
            snapshot_name = response_data["result"]["name"]
        else:
            # If name is not found, use timestamp as name
            snapshot_name = f"snapshot-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            print(f"Unable to get snapshot name from response, using temporary name: {snapshot_name}")
        
        print(f"Snapshot created successfully: {snapshot_name}")
        
        # Step 2: Download snapshot
        print(f"Downloading snapshot...")
        download_snapshot_url = f"http://{qdrant_host}:{qdrant_port}/collections/{collection_name}/snapshots/{snapshot_name}"
        
        with requests.get(download_snapshot_url, stream=True) as r:
            if r.status_code != 200:
                print(f"Failed to download snapshot: {r.text}")
                return None
                
            r.raise_for_status()
            output_file = f"{snapshot_path}.snapshot"
            with open(output_file, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        
        full_path = os.path.abspath(f"{snapshot_path}.snapshot")
        print(f"Snapshot successfully exported to: {full_path}")
        return full_path
        
    except Exception as e:
        print(f"Error exporting snapshot: {str(e)}")
        traceback.print_exc()  # Print full error stack
        return None


def import_qdrant_snapshot(snapshot_path, collection_name=None):
    """
    Import Qdrant collection from a snapshot file
    
    Args:
        snapshot_path: Path to the snapshot file
        collection_name: Name of the collection to import to, default is the collection name in config
        
    Returns:
        bool: Whether the import was successful
    """
    if collection_name is None:
        collection_name = config["vector_store"]["config"]["collection_name"]
    
    try:
        # Check if the snapshot file exists
        if not os.path.exists(snapshot_path):
            print(f"Snapshot file does not exist: {snapshot_path}")
            return False
        
        # Configure Qdrant API parameters
        qdrant_host = config["vector_store"]["config"]["host"]
        qdrant_port = config["vector_store"]["config"]["port"]
        
        # Delete existing collection (if exists)
        try:
            print(f"Deleting existing collection '{collection_name}' (if exists)...")
            qdrant_client.delete_collection(collection_name=collection_name)
            print("Collection deleted successfully")
        except Exception as e:
            print(f"Exception occurred while deleting collection (possibly collection does not exist): {str(e)}")
        
        # Check file size and format
        file_size = os.path.getsize(snapshot_path)
        print(f"Snapshot file size: {file_size} bytes")
        
        # Restore collection from snapshot file - use upload endpoint
        print(f"Restoring collection from snapshot file...")
        upload_url = f"http://{qdrant_host}:{qdrant_port}/collections/{collection_name}/snapshots/upload"
        
        # Open file in binary mode and set up request correctly
        with open(snapshot_path, 'rb') as f:
            files = {'snapshot': (os.path.basename(snapshot_path), f)}
            response = requests.post(upload_url, files=files)
        
        # Print detailed response information for debugging
        print(f"Response status code: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code != 200:
            print(f"Failed to restore from snapshot: {response.text}")
            return False
        
        print(f"Snapshot successfully imported to collection '{collection_name}'")
        return True
        
    except Exception as e:
        print(f"Error importing snapshot: {str(e)}")
        traceback.print_exc()  # Print full stack for debugging
        return False