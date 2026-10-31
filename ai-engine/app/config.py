import os
import torch
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../.env")

class Config:
    ENV = os.getenv("ENV", "development")
    
    # Database
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "ciirs_db")
    
    @property
    def DB_DSN(self):
        return f"dbname={self.DB_NAME} user={self.DB_USER} password={self.DB_PASSWORD} host={self.DB_HOST} port={self.DB_PORT}"
    
    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
    REDIS_JOB_STREAM = os.getenv("REDIS_JOB_STREAM", "ciirs:jobs:stream")
    REDIS_STATUS_STREAM = os.getenv("REDIS_STATUS_STREAM", "ciirs:status:stream")
    REDIS_GROUP = os.getenv("REDIS_GROUP", "ciirs_workers")
    
    # Storage
    STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage")
    STORAGE_ORIGINALS = os.getenv("STORAGE_ORIGINALS", "./storage/originals")
    STORAGE_PROCESSED = os.getenv("STORAGE_PROCESSED", "./storage/processed")
    STORAGE_THUMBNAILS = os.getenv("STORAGE_THUMBNAILS", "./storage/thumbnails")
    STORAGE_EVIDENCE = os.getenv("STORAGE_EVIDENCE", "./storage/evidence")
    STORAGE_REPORTS = os.getenv("STORAGE_REPORTS", "./storage/reports")
    
    # AI Performance Settings (Optimized for Apple M4 Unified Memory)
    AI_FRAME_FPS = float(os.getenv("AI_FRAME_FPS", "1.5")) # 1.5 FPS controlled extraction
    AI_DETECTION_CONF = float(os.getenv("AI_DETECTION_CONF", "0.40"))
    AI_REID_THRESHOLD = float(os.getenv("AI_REID_THRESHOLD", "0.68"))
    AI_YOLO_MODEL = os.getenv("AI_YOLO_MODEL", "yolov8n.pt")
    
    # Hardware Device Detection
    if torch.backends.mps.is_available():
        DEVICE = "mps" # Apple Silicon Metal Performance Shaders
    elif torch.cuda.is_available():
        DEVICE = "cuda"
    else:
        DEVICE = "cpu"
        
    # Optional LLM API Key
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

config = Config()
