import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Incident, ReconstructionBookmark, ReconstructionSnapshot, ReconstructionClip, Camera

router = APIRouter(prefix="/reconstruction", tags=["Forensic Incident Reconstruction"])

class BookmarkCreateRequest(BaseModel):
    incident_id: Optional[int] = None
    camera_id: str
    timestamp_seconds: float
    time_display: str
    label: str
    notes: Optional[str] = ""
    author_name: Optional[str] = "Forensic Analyst"

class SnapshotCreateRequest(BaseModel):
    incident_id: Optional[int] = None
    camera_id: str
    timestamp_seconds: float
    time_display: str
    image_url: str
    captured_by: Optional[str] = "Forensic Unit"
    notes: Optional[str] = ""

class ClipCreateRequest(BaseModel):
    incident_id: Optional[int] = None
    camera_id: str
    start_seconds: float
    end_seconds: float
    title: str
    video_url: str
    exported_by: Optional[str] = "Forensic Investigator"

@router.get("/bookmarks")
def list_bookmarks(incident_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ReconstructionBookmark)
    if incident_id:
        query = query.filter(ReconstructionBookmark.incident_id == incident_id)
    return query.order_by(ReconstructionBookmark.timestamp_seconds.asc()).all()

@router.post("/bookmarks")
def create_bookmark(payload: BookmarkCreateRequest, db: Session = Depends(get_db)):
    bm = ReconstructionBookmark(
        incident_id=payload.incident_id,
        camera_id=payload.camera_id,
        timestamp_seconds=payload.timestamp_seconds,
        time_display=payload.time_display,
        label=payload.label,
        notes=payload.notes,
        author_name=payload.author_name,
        created_at=datetime.utcnow()
    )
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm

@router.delete("/bookmarks/{bookmark_id}")
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    bm = db.query(ReconstructionBookmark).filter(ReconstructionBookmark.id == bookmark_id).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()
    return {"status": "SUCCESS", "message": "Bookmark removed"}

@router.get("/snapshots")
def list_snapshots(incident_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ReconstructionSnapshot)
    if incident_id:
        query = query.filter(ReconstructionSnapshot.incident_id == incident_id)
    return query.order_by(ReconstructionSnapshot.created_at.desc()).all()

@router.post("/snapshots")
def create_snapshot(payload: SnapshotCreateRequest, db: Session = Depends(get_db)):
    # Generate cryptographic hash for the forensic image snapshot
    raw_id = f"{payload.camera_id}:{payload.timestamp_seconds}:{datetime.utcnow().isoformat()}"
    sha256 = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()

    snap = ReconstructionSnapshot(
        incident_id=payload.incident_id,
        camera_id=payload.camera_id,
        timestamp_seconds=payload.timestamp_seconds,
        time_display=payload.time_display,
        image_url=payload.image_url,
        sha256_hash=sha256,
        captured_by=payload.captured_by,
        notes=payload.notes,
        created_at=datetime.utcnow()
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap

@router.get("/clips")
def list_clips(incident_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ReconstructionClip)
    if incident_id:
        query = query.filter(ReconstructionClip.incident_id == incident_id)
    return query.order_by(ReconstructionClip.created_at.desc()).all()

@router.post("/clips")
def create_clip(payload: ClipCreateRequest, db: Session = Depends(get_db)):
    raw = f"{payload.camera_id}:{payload.start_seconds}:{payload.end_seconds}:{payload.title}"
    sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    clip = ReconstructionClip(
        incident_id=payload.incident_id,
        camera_id=payload.camera_id,
        start_seconds=payload.start_seconds,
        end_seconds=payload.end_seconds,
        title=payload.title,
        video_url=payload.video_url,
        sha256_hash=sha256,
        exported_by=payload.exported_by,
        created_at=datetime.utcnow()
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return clip
