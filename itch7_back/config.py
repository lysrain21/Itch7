# Configuration information
from openai import OpenAI
from mem0 import Memory
from qdrant_client import QdrantClient
import os

# API configuration
API_KEY = 
BASE_URL = "https://api.deepseek.com"

# Set environment variables
os.environ["OPENAI_API_KEY"] = API_KEY
os.environ["OPENAI_API_BASE"] = BASE_URL

# 基础集合名称前缀
BASE_COLLECTION_NAME = "itch7_memory"

# 根据用户ID生成集合名称
def get_collection_name(user_id="default_user"):
    return f"{BASE_COLLECTION_NAME}_{user_id}"

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
            "collection_name": BASE_COLLECTION_NAME,  # 默认集合名称，将根据用户ID动态替换
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

# 获取用户特定的内存配置
def get_user_config(user_id="default_user"):
    user_config = config.copy()
    user_config["vector_store"] = config["vector_store"].copy()
    user_config["vector_store"]["config"] = config["vector_store"]["config"].copy()
    user_config["vector_store"]["config"]["collection_name"] = get_collection_name(user_id)
    return user_config

# 获取用户特定的内存实例
def get_user_memory(user_id="default_user"):
    user_config = get_user_config(user_id)
    return Memory.from_config(user_config)

# 默认内存对象
memory = Memory.from_config(config)
