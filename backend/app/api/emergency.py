from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import ResponseRequest, ResponseUnit, Incident, AuditLog
from app.schemas.schemas import ResponseRequestOut, ResponseUnitOut, DispatchApprovalRequest, StatusUpdateRequest
from app.services.emergency_dispatch import emergency_dispatch_service
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/emergency", tags=["Emergency Response Centre"])

@router.get("/requests", response_model=list[ResponseRequestOut])
def get_response_requests(agency: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(ResponseRequest)
    if agency:
        query = query.filter(ResponseRequest.agency_type == agency)
    if status:
        query = query.filter(ResponseRequest.status == status)
    return query.order_by(ResponseRequest.created_at.desc()).all()

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
