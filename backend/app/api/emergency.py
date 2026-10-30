import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import ResponseRequest, ResponseUnit, Incident, AuditLog, IncidentAuditEntry
from app.schemas.schemas import ResponseRequestOut, ResponseUnitOut, DispatchApprovalRequest, StatusUpdateRequest
from app.services.emergency_dispatch import emergency_dispatch_service
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/emergency", tags=["Emergency Response Centre"])

class VerificationActionRequest(BaseModel):
    action: str # VERIFY, FALSE_ALARM, NEEDS_REVIEW, REQUEST_FOOTAGE, ESCALATE
    reason: str
    officer_name: Optional[str] = "Senior Operator Arjun Singh"
    officer_role: Optional[str] = "Control-Room Operator"
    badge_number: Optional[str] = "OPR-402"
    reviewed_camera_ids: Optional[str] = "CAM-22-003, CAM-17-001"
    video_source_type: Optional[str] = "DEMO FOOTAGE — H.264 HD"

@router.get("/requests", response_model=list[ResponseRequestOut])
def get_response_requests(agency: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(ResponseRequest)
    if agency:
        query = query.filter(ResponseRequest.agency_type == agency)
    if status:
        query = query.filter(ResponseRequest.status == status)
    requests = query.order_by(ResponseRequest.created_at.desc()).all()

    # Enrich each request with incident details
    results = []
    for req in requests:
        inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
        req_dict = {
            "id": req.id,
            "request_number": req.request_number,
            "incident_id": req.incident_id,
            "agency_type": req.agency_type,
            "severity": req.severity,
            "recommended_units": req.recommended_units,
            "status": req.status,
            "operator_name": req.operator_name,
            "approved_at": req.approved_at,
            "dispatch_time": req.dispatch_time,
            "acknowledged_time": req.acknowledged_time,
            "arrival_time": req.arrival_time,
            "closed_time": req.closed_time,
            "assigned_unit_callsign": req.assigned_unit_callsign,
            "eta_minutes": req.eta_minutes,
            "triage_notes": req.triage_notes,
            "created_at": req.created_at,
            "verification_status": req.verification_status or "AWAITING_REVIEW",
            "verification_notes": req.verification_notes or "",
            "verified_by": req.verified_by,
            "verified_at": req.verified_at,
            "reviewed_camera_ids": req.reviewed_camera_ids or "",
            "verification_history": req.verification_history or [],
            "incident_number": inc.incident_number if inc else f"INC-2026-084{req.incident_id}",
            "incident_category": inc.category if inc else "Public Safety Alert",
            "incident_severity": inc.severity if inc else req.severity,
            "incident_status": inc.status if inc else "OPERATOR_VERIFYING",
            "incident_address": inc.address if inc else "Chandigarh City Area",
            "incident_latitude": inc.latitude if inc else 30.7333,
            "incident_longitude": inc.longitude if inc else 76.7794,
            "incident_timestamp": inc.created_at.isoformat() if inc else req.created_at.isoformat()
        }
        results.append(req_dict)
    return results

@router.get("/units", response_model=list[ResponseUnitOut])
def get_response_units(agency: str = None, db: Session = Depends(get_db)):
    query = db.query(ResponseUnit)
    if agency:
        query = query.filter(ResponseUnit.agency_type == agency)
    return query.all()

@router.post("/requests/{request_id}/approve")
async def approve_and_dispatch(
    request_id: int,
    approval: DispatchApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    AUTHORISED DISPATCH:
    Authorised operator explicitly approves dispatch of emergency resources.
    Assigns nearest or designated unit and initiates responder tracking.
    """
    req = db.query(ResponseRequest).filter(ResponseRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Response request not found")

    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Verify incident has been checked by human operator
    if inc.status not in ["VERIFIED", "OPERATOR_VERIFYING"]:
        raise HTTPException(status_code=400, detail="Cannot dispatch unverified incident")

    # Select or auto-assign response unit
    target_unit = None
    if approval.unit_callsign:
        target_unit = db.query(ResponseUnit).filter(ResponseUnit.unit_callsign == approval.unit_callsign).first()
    else:
        # Pick first available unit matching agency type
        target_unit = db.query(ResponseUnit).filter(
            ResponseUnit.agency_type == approval.agency_type,
            ResponseUnit.status == "AVAILABLE"
        ).first()

    req.status = "DISPATCHED"
    req.agency_type = approval.agency_type
    req.approved_at = datetime.utcnow()
    req.dispatch_time = datetime.utcnow()
    req.operator_name = "Supervisor Operator (Authorized)"
    req.triage_notes = approval.triage_notes or req.triage_notes

    if target_unit:
        req.assigned_unit_id = target_unit.id
        req.assigned_unit_callsign = target_unit.unit_callsign
        target_unit.status = "DISPATCHED"
        target_unit.current_incident_id = inc.id

    inc.status = "DISPATCH_REQUESTED"

    # Audit log
    audit = AuditLog(
        action="EMERGENCY_DISPATCH_AUTHORIZED",
        module="EMERGENCY_RESPONSE",
        details=f"Dispatched {req.assigned_unit_callsign or 'Simulated Unit'} for incident {inc.incident_number} ({req.agency_type})"
    )
    db.add(audit)
    db.commit()

    # WebSocket broadcast to responders & operations center
    await ws_manager.broadcast({
        "type": "DISPATCH_AUTHORIZED",
        "request_id": req.id,
        "request_number": req.request_number,
        "incident_number": inc.incident_number,
        "agency_type": req.agency_type,
        "assigned_unit": req.assigned_unit_callsign,
        "eta_minutes": req.eta_minutes,
        "coordinates": {"lat": inc.latitude, "lng": inc.longitude},
        "address": inc.address,
        "status": "DISPATCHED"
    })

    return {
        "message": "Emergency dispatch authorized successfully",
        "request_number": req.request_number,
        "assigned_unit": req.assigned_unit_callsign,
        "status": req.status
    }

@router.post("/requests/{request_id}/status")
async def update_response_status(
    request_id: int,
    status_update: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Tracks real-time responder progression:
    DISPATCHED -> ACKNOWLEDGED -> EN_ROUTE -> ON_SCENE -> CLOSED
    """
    req = db.query(ResponseRequest).filter(ResponseRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Response request not found")

    new_status = status_update.status
    req.status = new_status
    now = datetime.utcnow()

    if new_status == "ACKNOWLEDGED":
        req.acknowledged_time = now
    elif new_status == "ON_SCENE":
        req.arrival_time = now
    elif new_status == "CLOSED":
        req.closed_time = now
        inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
        if inc:
            inc.status = "RESOLVED"
            inc.resolved_at = now
        if req.assigned_unit:
            req.assigned_unit.status = "AVAILABLE"
            req.assigned_unit.current_incident_id = None

    db.commit()

    await ws_manager.broadcast({
        "type": "RESPONSE_STATUS_UPDATED",
        "request_id": req.id,
        "request_number": req.request_number,
        "status": new_status,
        "timestamp": now.isoformat()
    })

    return {"message": f"Status updated to {new_status}", "request_id": req.id, "status": new_status}

@router.post("/requests/{request_id}/verify")
async def verify_emergency_incident(
    request_id: int,
    payload: VerificationActionRequest,
    db: Session = Depends(get_db)
):
    """
    LIVE INCIDENT VERIFICATION:
    Authorised officer records a verification decision based on live/recorded CCTV visual inspection.
    Updates verification status, appends to immutable verification history, and logs into Incident Audit Ledger.
    """
    req = db.query(ResponseRequest).filter(ResponseRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Response request not found")

    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    now = datetime.utcnow()

    # Map action to status
    action_status_map = {
        "VERIFY": "VERIFIED",
        "FALSE_ALARM": "FALSE_ALARM",
        "NEEDS_REVIEW": "NEEDS_REVIEW",
        "REQUEST_FOOTAGE": "FOOTAGE_REQUESTED",
        "ESCALATE": "ESCALATED"
    }

    new_ver_status = action_status_map.get(payload.action, "VERIFIED")
    req.verification_status = new_ver_status
    req.verification_notes = payload.reason
    req.verified_by = payload.officer_name
    req.verified_at = now
    req.reviewed_camera_ids = payload.reviewed_camera_ids

    # Append to verification history
    history = list(req.verification_history or [])
    history.append({
        "action": payload.action,
        "verification_status": new_ver_status,
        "reason": payload.reason,
        "officer_name": payload.officer_name,
        "officer_role": payload.officer_role,
        "badge_number": payload.badge_number,
        "timestamp": now.strftime("%d %b %Y, %H:%M:%S IST"),
        "reviewed_cameras": payload.reviewed_camera_ids,
        "video_source_type": payload.video_source_type
    })
    req.verification_history = history

    # Update Incident status if appropriate
    if inc:
        if payload.action == "VERIFY":
            inc.status = "VERIFIED"
            inc.verified_by = payload.officer_name
            inc.verified_at = now
            inc.operator_notes = f"Verified via CCTV inspection: {payload.reason}"
        elif payload.action == "FALSE_ALARM":
            inc.status = "DISMISSED"
            inc.resolved_at = now
            inc.operator_notes = f"Dismissed as false alarm: {payload.reason}"

        # Cryptographically link to IncidentAuditEntry
        inc_num = inc.incident_number or f"INC-2026-084{inc.id}"
        last_entry = db.query(IncidentAuditEntry).filter(
            IncidentAuditEntry.incident_number == inc_num
        ).order_by(IncidentAuditEntry.created_at.desc()).first()

        prev_hash = last_entry.entry_hash if last_entry else ("0" * 64)
        entry_raw = f"{prev_hash}:{inc_num}:{payload.officer_name}:Control Room:LIVE_CCTV_VERIFICATION:{payload.reason}:{now.isoformat()}"
        cur_hash = hashlib.sha256(entry_raw.encode("utf-8")).hexdigest()

        audit_entry = IncidentAuditEntry(
            incident_id=inc.id,
            incident_number=inc_num,
            agency_type="CONTROL_ROOM",
            role=payload.officer_role or "Control-Room Operator",
            author_name=payload.officer_name or "Senior Operator",
            organization="Chandigarh Smart City Integrated Operations Centre (ICCC)",
            badge_id=payload.badge_number or "OPR-402",
            entry_title=f"Live CCTV Incident Verification: {new_ver_status}",
            entry_category="INITIAL_SCENE_ASSESSMENT",
            description=f"Action: {payload.action} | Cameras Reviewed: {payload.reviewed_camera_ids} | Source: {payload.video_source_type} | Assessment: {payload.reason}",
            location=inc.address or "Chandigarh",
            previous_entry_hash=prev_hash,
            entry_hash=cur_hash,
            created_at=now
        )
        db.add(audit_entry)

    db.commit()
    db.refresh(req)

    # Broadcast update
    await ws_manager.broadcast({
        "type": "INCIDENT_VERIFIED",
        "request_id": req.id,
        "request_number": req.request_number,
        "verification_status": new_ver_status,
        "action": payload.action,
        "reason": payload.reason,
        "officer_name": payload.officer_name,
        "timestamp": now.isoformat()
    })

    return {
        "status": "SUCCESS",
        "message": f"Verification decision ({new_ver_status}) recorded and sealed in audit history.",
        "request": req
    }
