from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Camera, CameraHealthLog
from app.schemas.schemas import CameraOut, CameraCreate, CameraHealthUpdate
from app.services.camera_trust import camera_trust_service

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=list[CameraOut])
def get_all_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()

@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter((Camera.camera_id == camera_id) | (Camera.id == int(camera_id) if camera_id.isdigit() else False)).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam

@router.post("/{camera_id}/telemetry")
def update_camera_telemetry(camera_id: str, telemetry: CameraHealthUpdate, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter((Camera.camera_id == camera_id) | (Camera.id == int(camera_id) if camera_id.isdigit() else False)).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    eval_result = camera_trust_service.evaluate_stream_health(
        ping_ms=telemetry.ping_ms,
        fps_actual=telemetry.fps_actual,
        fps_nominal=cam.fps,
        dropped_frames=telemetry.dropped_frames,
        frozen_frames=telemetry.frozen_frames,
        obstruction_score=0.45 if telemetry.is_obstructed else 0.0,
        is_tampered=telemetry.is_tampered
    )
    
    cam.trust_score = eval_result["trust_score"]
    cam.status = eval_result["status"]
    cam.is_tampered = telemetry.is_tampered
    cam.is_obstructed = telemetry.is_obstructed
    
    health_log = CameraHealthLog(
        camera_id=cam.id,
        ping_ms=telemetry.ping_ms,
        fps_actual=telemetry.fps_actual,
        dropped_frames=telemetry.dropped_frames,
        frozen_frames=telemetry.frozen_frames,
        obstruction_score=0.45 if telemetry.is_obstructed else 0.0,
        trust_score=eval_result["trust_score"],
        status_message=", ".join(eval_result["degradation_reasons"])
    )
    db.add(health_log)
    db.commit()
    
    return eval_result

@router.post("", response_model=CameraOut)
def register_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    cam = Camera(
        camera_id=payload.camera_id,
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        area_zone=payload.area_zone,
        stream_url=payload.stream_url,
        resolution=payload.resolution,
        fps=payload.fps,
        status="ONLINE",
        trust_score=98.0
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam

@router.put("/{camera_id}", response_model=CameraOut)
def update_camera(camera_id: str, payload: CameraCreate, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter((Camera.camera_id == camera_id) | (Camera.id == int(camera_id) if camera_id.isdigit() else False)).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam.name = payload.name
    cam.latitude = payload.latitude
    cam.longitude = payload.longitude
    cam.address = payload.address
    cam.area_zone = payload.area_zone
    cam.stream_url = payload.stream_url
    cam.resolution = payload.resolution
    cam.fps = payload.fps
    db.commit()
    db.refresh(cam)
    return cam

@router.delete("/{camera_id}")
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter((Camera.camera_id == camera_id) | (Camera.id == int(camera_id) if camera_id.isdigit() else False)).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(cam)
    db.commit()
    return {"message": "Camera deactivated and removed from active monitoring registry"}

@router.get("/{camera_id}/health-logs")
def get_camera_health_logs(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter((Camera.camera_id == camera_id) | (Camera.id == int(camera_id) if camera_id.isdigit() else False)).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    logs = db.query(CameraHealthLog).filter(CameraHealthLog.camera_id == cam.id).order_by(CameraHealthLog.timestamp.desc()).limit(20).all()
    return logs
