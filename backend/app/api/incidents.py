from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Incident, ResponseRequest, RiskAssessment, Alert, AuditLog
from app.schemas.schemas import IncidentOut, IncidentVerifyRequest
from app.services.emergency_dispatch import emergency_dispatch_service
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/incidents", tags=["Incidents & Verification"])

@router.get("", response_model=list[IncidentOut])
def get_incidents(status: str = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    return query.order_by(Incident.created_at.desc()).limit(limit).all()

@router.get("/alerts")
def get_all_alerts(limit: int = 30, db: Session = Depends(get_db)):
    from app.database.models import Camera
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    results = []
    for a in alerts:
        cam = db.query(Camera).filter(Camera.id == a.camera_id).first() if a.camera_id else None
        results.append({
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "camera_id": cam.camera_id if cam else "CAM-01",
            "camera_name": cam.name if cam else "General Surveillance",
            "location": cam.area_zone if cam else "City Network",
            "is_acknowledged": a.is_acknowledged,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at.isoformat()
        })
    return results

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.post("/{incident_id}/verify")
async def verify_incident(
    incident_id: int,
    req: IncidentVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    HUMAN-IN-THE-LOOP VERIFICATION:
    An authorized operator confirms or dismisses the AI early warning.
    Dispatches can only proceed once human verification is established.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if req.verified:
        inc.status = "VERIFIED"
        inc.verified_by = "Control Operator (Verified)"
        inc.verified_at = datetime.utcnow()
        inc.operator_notes = req.operator_notes
        
        # Update or create corresponding ResponseRequest
        resp_req = db.query(ResponseRequest).filter(ResponseRequest.incident_id == inc.id).first()
        if not resp_req:
            rec_agency, rec_units = emergency_dispatch_service.get_recommendation_for_event(inc.category)
            resp_req = ResponseRequest(
                request_number=f"REQ-2026-{1000 + inc.id}",
                incident_id=inc.id,
                agency_type=req.recommended_agency or rec_agency,
                severity=req.priority or inc.severity,
                recommended_units=rec_units,
                status="PENDING_APPROVAL"
            )
            db.add(resp_req)
        else:
            resp_req.agency_type = req.recommended_agency
            resp_req.severity = req.priority
            
        action_msg = "Incident verified by operator. Response dispatch ready for authorization."
    else:
        inc.status = "DISMISSED"
        inc.resolved_at = datetime.utcnow()
        inc.operator_notes = f"Dismissed as false positive / benign: {req.operator_notes}"
        action_msg = "Incident dismissed by operator as non-threatening."

    # Audit log
    audit = AuditLog(
        action="INCIDENT_VERIFIED" if req.verified else "INCIDENT_DISMISSED",
        module="VERIFICATION",
        details=f"{inc.incident_number} status set to {inc.status}. Notes: {req.operator_notes}"
    )
    db.add(audit)
    db.commit()

    # WebSocket broadcast
    await ws_manager.broadcast({
        "type": "INCIDENT_STATUS_CHANGED",
        "incident_id": inc.id,
        "incident_number": inc.incident_number,
        "status": inc.status,
        "verified": req.verified,
        "message": action_msg
    })

    return {"message": action_msg, "status": inc.status}

@router.get("/{incident_id}/risk-assessment")
def get_incident_risk_assessment(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    assessment = db.query(RiskAssessment).filter(RiskAssessment.camera_id == inc.camera_id).order_by(RiskAssessment.created_at.desc()).first()
    return assessment or {}
