import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import InvestigationCase, CaseEvidence, CaseNote, Incident, AuditLog
from app.schemas.schemas import CaseCreate, CaseNoteCreate
from app.services.reporting import reporting_service

router = APIRouter(prefix="/investigations", tags=["Investigation Workspace"])

@router.get("/cases")
def get_cases(db: Session = Depends(get_db)):
    return db.query(InvestigationCase).order_by(InvestigationCase.created_at.desc()).all()

@router.get("/cases/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")
        
    incident = db.query(Incident).filter(Incident.id == case.incident_id).first() if case.incident_id else None
    evidences = db.query(CaseEvidence).filter(CaseEvidence.case_id == case.id).all()
    notes = db.query(CaseNote).filter(CaseNote.case_id == case.id).order_by(CaseNote.created_at.desc()).all()

    return {
        "case": case,
        "incident": incident,
        "evidence_items": evidences,
        "notes": notes
    }

@router.post("/cases")
def create_case(req: CaseCreate, db: Session = Depends(get_db)):
    case_num = f"CASE-2026-{9000 + db.query(InvestigationCase).count() + 1}"
    
    inc = None
    if req.incident_id:
        inc = db.query(Incident).filter(Incident.id == req.incident_id).first()

    case = InvestigationCase(
        case_number=case_num,
        title=req.title,
        incident_id=req.incident_id,
        assigned_investigator=req.assigned_investigator,
        status="OPEN",
        priority=req.priority,
        summary=req.summary,
        ai_preliminary_findings=inc.ai_explanation if inc else "Initial telemetry logged by automated monitor.",
        operator_verified_facts=inc.operator_notes if inc else "Pending formal operator sign-off.",
        investigator_conclusions="Preliminary investigation opened. Awaiting forensic trace review."
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    # Automatically attach evidence snapshot if incident exists
    if inc and inc.evidence_snapshot:
        dummy_hash = hashlib.sha256(f"{case.case_number}_{inc.incident_number}".encode()).hexdigest()
        ev = CaseEvidence(
            case_id=case.id,
            evidence_type="FRAME_SNAPSHOT",
            title=f"Incident Snapshot {inc.incident_number}",
            file_path=inc.evidence_snapshot,
            sha256_hash=dummy_hash,
            notes="Cryptographically anchored frame telemetry from incident trigger."
        )
        db.add(ev)
        db.commit()

    return case

@router.post("/cases/{case_id}/notes")
def add_case_note(case_id: int, req: CaseNoteCreate, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    note = CaseNote(
        case_id=case.id,
        author_name="Detective Maya Lin",
        note_type=req.note_type,
        content=req.content
    )
    db.add(note)
    db.commit()
    return note

@router.get("/cases/{case_id}/export-pdf")
def export_case_pdf(case_id: int, db: Session = Depends(get_db)):
    """
    Exports full forensic incident report as downloadable PDF document.
    """
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    inc = db.query(Incident).filter(Incident.id == case.incident_id).first() if case.incident_id else None
    evidences = db.query(CaseEvidence).filter(CaseEvidence.case_id == case.id).all()

    case_payload = {
        "case_number": case.case_number,
        "status": case.status,
        "assigned_investigator": case.assigned_investigator,
        "priority": case.priority,
        "incident_ref": inc.incident_number if inc else "N/A",
        "summary": case.summary,
        "ai_preliminary_findings": case.ai_preliminary_findings or "No automated telemetry available.",
        "operator_verified_facts": case.operator_verified_facts or "Operator review pending.",
        "investigator_conclusions": case.investigator_conclusions or "In progress.",
        "evidence_items": [
            {
                "title": ev.title,
                "type": ev.evidence_type,
                "hash": ev.sha256_hash,
                "verified": ev.is_tamper_verified
            }
            for ev in evidences
        ]
    }

    pdf_path = reporting_service.generate_case_pdf(case_payload)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"CIIRS_{case.case_number}_Forensic_Report.pdf"
    )
