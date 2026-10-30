import random
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import PublicIncidentReport, Incident, Alert, IncidentAuditEntry
import hashlib

router = APIRouter(prefix="/reports", tags=["Public Incident Reporting"])

class ReportSubmitRequest(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    address: str = "Chandigarh Public Sector"
    reporter_name: Optional[str] = "Pooja Sharma"
    reporter_contact: Optional[str] = ""
    attachment_url: Optional[str] = None

class ReportVerifyRequest(BaseModel):
    action: str # UNDER_REVIEW, VERIFY_AND_CONVERT, DISMISS
    review_notes: str
    operator_name: Optional[str] = "Senior Operator Arjun Singh"
    severity: Optional[str] = "HIGH"

@router.post("")
def submit_public_report(payload: ReportSubmitRequest, db: Session = Depends(get_db)):
    code = f"CIT-2026-{random.randint(1000, 9999)}"
    now = datetime.utcnow()
    
    # Initialize public tracking timeline
    initial_history = [
        {
            "status": "SUBMITTED",
            "timestamp": now.strftime("%d %b %Y, %H:%M IST"),
            "note": "Incident report successfully logged in Chandigarh Public Safety Network."
        }
    ]

    report = PublicIncidentReport(
        report_code=code,
        category=payload.category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        reporter_name=payload.reporter_name or "Anonymous Citizen",
        reporter_contact=payload.reporter_contact,
        attachment_url=payload.attachment_url,
        status="SUBMITTED",
        status_history=initial_history,
        created_at=now
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Automatically notify control room via system Alert
    alert = Alert(
        alert_type="EARLY_WARNING",
        severity="MODERATE",
        title=f"New Citizen Report: {payload.category}",
        message=f"{code} logged at {payload.address}. Pending operator verification.",
        deduplication_key=f"CIT_ALERT_{code}",
        created_at=now
    )
    db.add(alert)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Incident report logged successfully. Your report has been transmitted to Chandigarh Police Operations.",
        "report_code": code,
        "report": {
            "id": report.id,
            "report_code": report.report_code,
            "category": report.category,
            "description": report.description,
            "address": report.address,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "attachment_url": report.attachment_url,
            "status": report.status,
            "status_history": report.status_history,
            "created_at": report.created_at.isoformat()
        }
    }

@router.get("")
def list_reports(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Police / Operations endpoint to inspect incoming citizen reports.
    """
    query = db.query(PublicIncidentReport)
    if status:
        query = query.filter(PublicIncidentReport.status == status)
    return query.order_by(PublicIncidentReport.created_at.desc()).limit(limit).all()

@router.get("/{report_code}")
def track_report(report_code: str, db: Session = Depends(get_db)):
    """
    Citizen-facing status tracking endpoint.
    Returns permitted status updates, timestamps, and jurisdiction notes without exposing internal police investigations.
    """
    rep = db.query(PublicIncidentReport).filter(PublicIncidentReport.report_code == report_code).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Incident report code not found. Please verify your reference number.")
    
    return {
        "report_code": rep.report_code,
        "category": rep.category,
        "description": rep.description,
        "address": rep.address,
        "attachment_url": rep.attachment_url,
        "status": rep.status,
        "status_history": rep.status_history or [],
        "created_at": rep.created_at.isoformat(),
        "assigned_division": "Chandigarh Police — Sector 17 & 22 Sub-Divisional Operations Desk",
        "privacy_guarantee": "Citizen Privacy Assured — Internal investigation forensics and CCTV streams are restricted to authorized police personnel."
    }

@router.post("/{report_code}/verify")
def verify_citizen_report(
    report_code: str, 
    payload: ReportVerifyRequest, 
    db: Session = Depends(get_db)
):
    """
    Police Operator verification endpoint:
    - UNDER_REVIEW: Assigns to local desk
    - VERIFY_AND_CONVERT: Generates formal Incident (e.g. INC-2026-XXXX), links it, dispatches response
    - DISMISS: Records dismissal reason
    """
    rep = db.query(PublicIncidentReport).filter(PublicIncidentReport.report_code == report_code).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Incident report not found")

    now = datetime.utcnow()
    current_history = list(rep.status_history or [])

    if payload.action == "VERIFY_AND_CONVERT":
        # Create corresponding formal Incident
        new_inc_num = f"INC-2026-{random.randint(2000, 9999)}"
        inc = Incident(
            incident_number=new_inc_num,
            camera_id=1, # Default link to nearby camera
            category=rep.category,
            severity=payload.severity or "HIGH",
            latitude=rep.latitude,
            longitude=rep.longitude,
            address=rep.address or "Chandigarh City Area",
            status="VERIFIED",
            ai_confidence=0.92,
            ai_explanation=f"Verified citizen report ({report_code}): {rep.description}",
            operator_notes=f"Converted by {payload.operator_name}. {payload.review_notes}",
            verified_by=payload.operator_name,
            verified_at=now,
            created_at=now
        )
        db.add(inc)
        db.commit()
        db.refresh(inc)

        rep.status = "VERIFIED"
        rep.incident_id = inc.id
        rep.incident_number = inc.incident_number
        rep.review_notes = payload.review_notes

        current_history.append({
            "status": "VERIFIED",
            "timestamp": now.strftime("%d %b %Y, %H:%M IST"),
            "note": f"Report verified by Operations Control. Assigned formal response case {new_inc_num}. Field responders dispatched."
        })
        rep.status_history = current_history

        # Also add initial entry into Incident Audit ledger
        prev_hash = "0" * 64
        entry_raw = f"{prev_hash}:{new_inc_num}:{payload.operator_name}:Control Room:CITIZEN_CONVERSION:{rep.description}:{now.isoformat()}"
        cur_hash = hashlib.sha256(entry_raw.encode("utf-8")).hexdigest()

        audit_entry = IncidentAuditEntry(
            incident_id=inc.id,
            incident_number=new_inc_num,
            agency_type="CONTROL_ROOM",
            role="Control-Room Operator",
            author_name=payload.operator_name,
            organization="Chandigarh Smart City Integrated Operations Centre",
            entry_title=f"Citizen Report {report_code} Verified & Converted",
            entry_category="INITIAL_SCENE_ASSESSMENT",
            description=f"Citizen Report {report_code} verified. Location: {rep.address}. Operator notes: {payload.review_notes}",
            location=rep.address or "Chandigarh",
            evidence_url=rep.attachment_url,
            previous_entry_hash=prev_hash,
            entry_hash=cur_hash,
            created_at=now
        )
        db.add(audit_entry)
        db.commit()

        return {
            "status": "SUCCESS",
            "action": "VERIFIED_AND_CONVERTED",
            "incident_number": new_inc_num,
            "incident_id": inc.id,
            "message": f"Report {report_code} verified and successfully converted to Incident {new_inc_num}."
        }

    elif payload.action == "UNDER_REVIEW":
        rep.status = "UNDER_REVIEW"
        rep.review_notes = payload.review_notes
        current_history.append({
            "status": "UNDER_REVIEW",
            "timestamp": now.strftime("%d %b %Y, %H:%M IST"),
            "note": f"Report assigned to {payload.operator_name} for active verification and CCTV correlation."
        })
        rep.status_history = current_history
        db.commit()

        return {
            "status": "SUCCESS",
            "action": "UNDER_REVIEW",
            "message": f"Report {report_code} marked Under Review."
        }

    elif payload.action == "DISMISS":
        rep.status = "DISMISSED"
        rep.review_notes = payload.review_notes
        current_history.append({
            "status": "DISMISSED",
            "timestamp": now.strftime("%d %b %Y, %H:%M IST"),
            "note": f"Report evaluated and marked resolved/non-actionable: {payload.review_notes}"
        })
        rep.status_history = current_history
        db.commit()

        return {
            "status": "SUCCESS",
            "action": "DISMISSED",
            "message": f"Report {report_code} dismissed with reason."
        }

    return {"status": "ERROR", "message": "Unknown action"}
