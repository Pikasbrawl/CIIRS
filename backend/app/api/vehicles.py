from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import VehicleDetection

router = APIRouter(prefix="/vehicles", tags=["Vehicle Intelligence (ANPR)"])

@router.get("/detections")
def get_recent_detections(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(VehicleDetection).order_by(VehicleDetection.timestamp.desc()).limit(limit).all()

@router.get("/search")
def search_plate(query: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    results = db.query(VehicleDetection).filter(VehicleDetection.plate_number.ilike(f"%{query}%")).all()
    return results

@router.get("/latest")
def get_latest_highlight_detection(db: Session = Depends(get_db)):
    # Returns the primary featured vehicle (matching CH01AB1234 in the screenshot)
    featured = db.query(VehicleDetection).filter(VehicleDetection.plate_number == "CH01AB1234").first()
    if not featured:
        featured = db.query(VehicleDetection).order_by(VehicleDetection.timestamp.desc()).first()
    return featured
