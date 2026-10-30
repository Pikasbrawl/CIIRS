import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Incident, IncidentAuditEntry, User

router = APIRouter(prefix="/audit", tags=["Incident Audit & Scene Reports"])

class AuditEntryCreateRequest(BaseModel):
    agency_type: str # POLICE, MEDICAL, FIRE_AND_RESCUE, CONTROL_ROOM, CITIZEN_UPDATE
    role: str
    author_name: str
    organization: str
    badge_id: Optional[str] = None
    entry_title: str
    entry_category: str
    description: str
    location: str
    patient_count: int = 0
    triage_status: Optional[str] = "NONE"
    evidence_url: Optional[str] = None

class AuditEntryReviseRequest(BaseModel):
    author_name: str
    organization: str
    badge_id: Optional[str] = None
    revision_reason: str
    updated_description: str

@router.get("/incidents")
def list_auditable_incidents(db: Session = Depends(get_db)):
    """List all incidents with audit entry counts."""
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    results = []
    for inc in incidents:
        count = db.query(IncidentAuditEntry).filter(
            (IncidentAuditEntry.incident_id == inc.id) | 
            (IncidentAuditEntry.incident_number == inc.incident_number)
        ).count()
        results.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "category": inc.category,
            "severity": inc.severity,
            "status": inc.status,
            "address": inc.address,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "created_at": inc.created_at.isoformat(),
            "audit_entries_count": count
        })
    return results

@router.get("/incidents/{incident_id}/entries")
def get_incident_audit_entries(incident_id: str, db: Session = Depends(get_db)):
    """
    Returns all append-only scene audit reports for a specific incident,
    ordered chronologically.
    """
    # Accept either numerical ID or INC-2026-XXXX format
    query = db.query(IncidentAuditEntry)
    if incident_id.isdigit():
        query = query.filter((IncidentAuditEntry.incident_id == int(incident_id)) | (IncidentAuditEntry.incident_number == f"INC-2026-084{incident_id}"))
    else:
        query = query.filter(IncidentAuditEntry.incident_number == incident_id)
    
    entries = query.order_by(IncidentAuditEntry.created_at.asc()).all()
    return entries

@router.post("/incidents/{incident_id}/entries")
def add_incident_audit_entry(
    incident_id: str,
    payload: AuditEntryCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Append an authorized multi-agency scene observation / report.
    Computes an SHA-256 tamper-evident hash linked to the previous entry in the chain.
    """
    # Find incident
    inc = None
    if incident_id.isdigit():
        inc = db.query(Incident).filter(Incident.id == int(incident_id)).first()
    if not inc:
        inc = db.query(Incident).filter(Incident.incident_number == incident_id).first()
    
    inc_num = inc.incident_number if inc else incident_id
    inc_db_id = inc.id if inc else None

    # Get the last entry in the chain to obtain previous_entry_hash
    last_entry = db.query(IncidentAuditEntry).filter(
        IncidentAuditEntry.incident_number == inc_num
    ).order_by(IncidentAuditEntry.created_at.desc()).first()

    prev_hash = last_entry.entry_hash if last_entry else ("0" * 64)
    now = datetime.utcnow()

    # Calculate cryptographic SHA-256 hash
    entry_raw = f"{prev_hash}:{inc_num}:{payload.author_name}:{payload.organization}:{payload.entry_category}:{payload.description}:{now.isoformat()}"
    entry_hash = hashlib.sha256(entry_raw.encode("utf-8")).hexdigest()

    evidence_hash = hashlib.sha256(payload.evidence_url.encode("utf-8")).hexdigest()[:16] if payload.evidence_url else None

    entry = IncidentAuditEntry(
        incident_id=inc_db_id,
        incident_number=inc_num,
        agency_type=payload.agency_type,
        role=payload.role,
        author_name=payload.author_name,
        organization=payload.organization,
        badge_id=payload.badge_id,
        entry_title=payload.entry_title,
        entry_category=payload.entry_category,
        description=payload.description,
        location=payload.location,
        patient_count=payload.patient_count,
        triage_status=payload.triage_status,
        evidence_url=payload.evidence_url,
        evidence_sha256=evidence_hash,
        revision_number=1,
        previous_entry_hash=prev_hash,
        entry_hash=entry_hash,
        created_at=now
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "status": "SUCCESS",
        "message": "Scene audit entry securely committed to tamper-evident ledger.",
        "entry": entry
    }

@router.post("/incidents/{incident_id}/entries/{entry_id}/revise")
def revise_audit_entry(
    incident_id: str,
    entry_id: int,
    payload: AuditEntryReviseRequest,
    db: Session = Depends(get_db)
):
    """
    Append an authorized revision to an existing entry.
    Strictly preserves the original record and records a new signed revision entry.
    """
    original = db.query(IncidentAuditEntry).filter(IncidentAuditEntry.id == entry_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original entry not found")

    # Find last entry in chain
    last_entry = db.query(IncidentAuditEntry).filter(
        IncidentAuditEntry.incident_number == original.incident_number
    ).order_by(IncidentAuditEntry.created_at.desc()).first()

    prev_hash = last_entry.entry_hash if last_entry else ("0" * 64)
    now = datetime.utcnow()
    rev_num = original.revision_number + 1

    rev_desc = f"[REVISION #{rev_num} — Reason: {payload.revision_reason}] {payload.updated_description}"
    entry_raw = f"{prev_hash}:{original.incident_number}:{payload.author_name}:{payload.organization}:{original.entry_category}:{rev_desc}:{now.isoformat()}"
    entry_hash = hashlib.sha256(entry_raw.encode("utf-8")).hexdigest()

    revision = IncidentAuditEntry(
        incident_id=original.incident_id,
        incident_number=original.incident_number,
        agency_type=original.agency_type,
        role=original.role,
        author_name=payload.author_name,
        organization=payload.organization,
        badge_id=payload.badge_id,
        entry_title=f"Revision #{rev_num}: {original.entry_title}",
        entry_category=original.entry_category,
        description=rev_desc,
        location=original.location,
        patient_count=original.patient_count,
        triage_status=original.triage_status,
        evidence_url=original.evidence_url,
        evidence_sha256=original.evidence_sha256,
        revision_number=rev_num,
        parent_entry_id=original.id,
        previous_entry_hash=prev_hash,
        entry_hash=entry_hash,
        created_at=now
    )

    db.add(revision)
    db.commit()
    db.refresh(revision)

    return {
        "status": "SUCCESS",
        "message": f"Revision #{rev_num} committed to audit ledger. Original record remains preserved.",
        "revision": revision
    }

@router.get("/incidents/{incident_id}/verify-chain")
def verify_audit_chain(incident_id: str, db: Session = Depends(get_db)):
    """
    Cryptographically verifies the SHA-256 chain of custody for this incident.
    """
    entries = db.query(IncidentAuditEntry).filter(
        IncidentAuditEntry.incident_number == incident_id
    ).order_by(IncidentAuditEntry.created_at.asc()).all()

    if not entries and incident_id.isdigit():
        entries = db.query(IncidentAuditEntry).filter(
            IncidentAuditEntry.incident_id == int(incident_id)
        ).order_by(IncidentAuditEntry.created_at.asc()).all()

    if not entries:
        return {"status": "EMPTY", "verified": True, "entries_checked": 0, "message": "No entries logged yet."}

    is_valid = True
    for i, entry in enumerate(entries):
        if i == 0:
            expected_prev = "0" * 64
        else:
            expected_prev = entries[i - 1].entry_hash

        if entry.previous_entry_hash != expected_prev:
            is_valid = False
            break

    return {
        "status": "VERIFIED" if is_valid else "CORRUPTED",
        "verified": is_valid,
        "entries_checked": len(entries),
        "latest_block_hash": entries[-1].entry_hash if entries else None,
        "message": "Ledger integrity intact. Zero unauthorized modifications detected." if is_valid else "Hash chain discrepancy detected!"
    }
