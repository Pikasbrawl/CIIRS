import threading
import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.config import config
from app.embeddings.clip_search import SemanticTextVisualEncoder
from app.workers.job_worker import AIJobWorker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ciirs.ai_service")

app = FastAPI(title="CIIRS AI Engine Microservice", version="1.0.0")
clip_encoder = SemanticTextVisualEncoder(device=config.DEVICE)

class TextEmbedRequest(BaseModel):
    query: str

class EmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CIIRS AI Engine",
        "device": config.DEVICE,
        "yolo_model": config.AI_YOLO_MODEL,
        "frame_fps": config.AI_FRAME_FPS
    }

@app.post("/api/embed_text", response_model=EmbedResponse)
def embed_text(req: TextEmbedRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    vec = clip_encoder.embed_text(req.query)
    return EmbedResponse(embedding=vec, dimension=len(vec))

def start_worker_thread():
    logger.info("Initializing AI Job Worker in background thread...")
    worker = AIJobWorker()
    worker.run()

if __name__ == "__main__":
    logger.info("=============================================================")
    logger.info(" CIIRS AI Engine — Team PANDA | Zinnovatio 4.0              ")
    logger.info(f" Compute Device: {config.DEVICE} (Apple M4 Optimized)       ")
    logger.info("=============================================================")

    # Spawn job worker thread
    t = threading.Thread(target=start_worker_thread, daemon=True)
    t.start()

    # Run FastAPI server for embeddings
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
