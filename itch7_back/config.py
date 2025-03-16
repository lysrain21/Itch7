# Configuration information
from openai import OpenAI
from mem0 import Memory
from qdrant_client import QdrantClient
import os

# API configuration
API_KEY = "Your API Key"
BASE_URL = "https://api.deepseek.com"

# Set environment variables
os.environ["OPENAI_API_KEY"] = API_KEY
os.environ["OPENAI_API_BASE"] = BASE_URL

# Configuration information
config = {
    "llm": {
        "provider": "deepseek",
        "config": {
            "api_key": API_KEY,
            "model": "deepseek-chat",
            "temperature": 0.2,
            "max_tokens": 2000,
            "top_p": 1.0
        }
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "mxbai-embed-large"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "test",
            "host": "localhost",
            "port": 6333,
            "embedding_model_dims": 1024,
        }
    },
    "version": "v1.1",
}

# Initialize client
openai_client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

# Create a direct Qdrant client instance for snapshot operations
qdrant_client = QdrantClient(
    host=config["vector_store"]["config"]["host"],
    port=config["vector_store"]["config"]["port"]
)

# Initialize memory object
memory = Memory.from_config(config)