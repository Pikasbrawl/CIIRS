from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.seed_data import seed_database

# Import routers
from app.api.auth import router as auth_router
from app.api.cameras import router as cameras_router
from app.api.video_analysis import router as analysis_router
from app.api.training import router as training_router
from app.api.incidents import router as incidents_router
from app.api.emergency import router as emergency_router
from app.api.gis import router as gis_router
from app.api.investigations import router as investigations_router
from app.api.analytics import router as analytics_router
from app.api.multi_camera import router as multi_cam_router
from app.api.vehicles import router as vehicles_router
from app.api.public_reports import router as reports_router
from app.api.audit_reports import router as audit_router
from app.api.reconstruction import router as reconstruction_router
from app.api.system_health import router as system_router
from app.api.ws import router as ws_router

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Seed initial demonstration data
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CIIRS – CCTV Incident Intelligence & Reconstruction System | Team: PANDA | Zinnovatio 4.0 Hackathon 2026",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(training_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(emergency_router, prefix=settings.API_V1_STR)
app.include_router(gis_router, prefix=settings.API_V1_STR)
app.include_router(investigations_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(multi_cam_router, prefix=settings.API_V1_STR)
app.include_router(vehicles_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(reconstruction_router, prefix=settings.API_V1_STR)
app.include_router(system_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

# Mount static directories
uploads_dir = settings.UPLOAD_DIR
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

@app.get("/api/health")
def health_check():
    return {
        "status": "OPERATIONAL",
        "system": settings.PROJECT_NAME,
        "team": settings.TEAM_NAME,
        "hackathon": settings.HACKATHON,
        "category": settings.CATEGORY,
        "architecture": "PyTorch + OpenCV + Temporal Sequence Model (LSTM/Attention) + Leaflet GIS",
        "prevention_first": True,
        "anonymized_compliance": "Strict (No biometric/demographic profiling)"
    }

# Serve Frontend SPA
project_root = os.path.dirname(settings.BASE_DIR)
frontend_dist = os.path.join(project_root, "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.api_route("/", methods=["GET", "HEAD"])
    async def serve_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't hijack /api, /static or /ws
        if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("ws"):
            return FileResponse(os.path.join(frontend_dist, "index.html"))
        target = os.path.join(frontend_dist, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
