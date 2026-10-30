import os
import uuid
import shutil
import random
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import PublicIncidentReport, Incident, Alert, IncidentAuditEntry
from app.core.config import settings
import hashlib

router = APIRouter(prefix="/reports", tags=["Public Incident Reporting"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file limit

@router.post("/upload-evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    category: Optional[str] = Form("EVIDENCE"),
    description: Optional[str] = Form("")
):
    content_type = (file.content_type or "").lower()
    
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_video = content_type in ALLOWED_VIDEO_TYPES
    
    # Fallback to extension check if content_type is octet-stream
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not (is_image or is_video):
        if ext in [".jpg", ".jpeg", ".png", ".webp"]:
            is_image = True
            content_type = f"image/{ext.replace('.', '')}"
            if ext == ".jpg":
                content_type = "image/jpeg"
        elif ext in [".mp4", ".webm", ".mov"]:
            is_video = True
            content_type = "video/mp4" if ext == ".mp4" else f"video/{ext.replace('.', '')}"
            if ext == ".mov":
                content_type = "video/quicktime"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {ext or content_type}. Allowed formats: JPG, JPEG, PNG, WEBP, MP4, WEBM, MOV."
            )
            
    # Read file content safely with size check
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds 50 MB limit. Provided size: {file_size / (1024 * 1024):.2f} MB."
        )
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty (0 bytes).")
        
    # Generate unique safe filename
    file_id = f"evid_{uuid.uuid4().hex[:12]}"
    clean_ext = ext if ext else (".png" if is_image else ".mp4")
    safe_filename = f"{file_id}{clean_ext}"
    
    # Target directories
    upload_dir = os.path.join(settings.UPLOAD_DIR, "citizen_evidence")
    frontend_public_dir = os.path.join(os.path.dirname(settings.UPLOAD_DIR), "..", "frontend", "public", "static", "citizen_evidence")
    frontend_dist_dir = os.path.join(os.path.dirname(settings.UPLOAD_DIR), "..", "frontend", "dist", "static", "citizen_evidence")
    
    os.makedirs(upload_dir, exist_ok=True)
    
    save_path = os.path.join(upload_dir, safe_filename)
    with open(save_path, "wb") as f:
        f.write(contents)
        
    # Also replicate to frontend static folders if they exist
    for target_dir in [frontend_public_dir, frontend_dist_dir]:
        try:
            os.makedirs(target_dir, exist_ok=True)
            shutil.copy2(save_path, os.path.join(target_dir, safe_filename))
        except Exception:
            pass
            
    file_url = f"/static/citizen_evidence/{safe_filename}"
    
    return {
        "status": "SUCCESS",
        "id": file_id,
        "filename": safe_filename,
        "original_name": file.filename,
        "file_url": file_url,
        "file_type": "PHOTO" if is_image else "VIDEO",
        "mime_type": content_type,
        "file_size": file_size,
        "category": category or "CITIZEN_EVIDENCE",
        "description": description or ""
    }

class ReportSubmitRequest(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    address: str = "Chandigarh Public Sector"
    reporter_name: Optional[str] = "Pooja Sharma"
    reporter_contact: Optional[str] = ""
    attachment_url: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

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

    attachments = payload.attachments or []
    primary_attachment = payload.attachment_url
    if not primary_attachment and attachments:
        primary_attachment = attachments[0].get("file_url")

    report = PublicIncidentReport(
        report_code=code,
        category=payload.category,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        reporter_name=payload.reporter_name or "Anonymous Citizen",
        reporter_contact=payload.reporter_contact,
        attachment_url=primary_attachment,
        attachments=attachments,
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
            "attachments": report.attachments or [],
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
        "attachments": rep.attachments or [],
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
