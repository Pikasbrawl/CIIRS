import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "CIIRS – CCTV Incident Intelligence & Reconstruction System"
    TEAM_NAME: str = "PANDA"
    HACKATHON: str = "Zinnovatio 4.0 – Gen Z Innovations Hackathon 2026"
    CATEGORY: str = "Smart & Sustainable Cities"
    
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ciirs-super-secure-key-2026-zinnovatio-panda")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ciirs.db")
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    MODEL_DIR: str = os.path.join(BASE_DIR, "models")
    DATASET_DIR: str = os.path.join(BASE_DIR, "datasets")
    REPORT_DIR: str = os.path.join(BASE_DIR, "reports")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.MODEL_DIR, exist_ok=True)
os.makedirs(settings.DATASET_DIR, exist_ok=True)
os.makedirs(settings.REPORT_DIR, exist_ok=True)
