import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import PublicIncidentReport

router = APIRouter(prefix="/reports", tags=["Public Incident Reporting"])

class ReportSubmitRequest(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    address: str = "Chandigarh Public Sector"
    reporter_contact: str = ""

@router.post("")
def submit_public_report(payload: ReportSubmitRequest, db: Session = Depends(get_db)):
    code = f"REP-2026-{random.randint(1000, 9999)}"
    report = PublicIncidentReport(
        report_code=code,
        category=payload.category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        reporter_contact=payload.reporter_contact,
        status="UNDER_REVIEW"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {
        "status": "SUCCESS",
        "message": "Incident report submitted successfully. Public safety operations room notified for verification.",
        "report_code": code,
        "report": report
    }

@router.get("")
def list_reports(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(PublicIncidentReport).order_by(PublicIncidentReport.created_at.desc()).limit(limit).all()

@router.get("/{report_code}")
def track_report(report_code: str, db: Session = Depends(get_db)):
    rep = db.query(PublicIncidentReport).filter(PublicIncidentReport.report_code == report_code).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Incident report code not found")
    return rep
