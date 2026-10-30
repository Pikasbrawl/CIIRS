from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Camera
from app.services.multi_camera import multi_camera_service

router = APIRouter(prefix="/multi-camera", tags=["Multi-Camera Intelligence"])

@router.get("/correlations")
def get_cross_camera_correlations(db: Session = Depends(get_db)):
    """
    Returns unified multi-camera trajectory chains correlating anonymous movement
    vectors across cameras over time.
    """
    cams = {c.camera_id: c for c in db.query(Camera).all()}
    
    # Synthetic realistic spatio-temporal observation sequences
    now = datetime.utcnow()
    observations = [
        {
            "camera_id": "CAM-01",
            "camera_name": cams.get("CAM-01").name if "CAM-01" in cams else "Main Concourse",
            "coordinates": [28.6139, 77.2090],
            "timestamp": now - timedelta(minutes=6, seconds=20),
            "heading": "Northbound corridor",
            "motion_variance": 1.2
        },
        {
            "camera_id": "CAM-08",
            "camera_name": cams.get("CAM-08").name if "CAM-08" in cams else "Skywalk Escalator Bank",
            "coordinates": [28.6145, 77.2078],
            "timestamp": now - timedelta(minutes=4, seconds=45),
            "heading": "Ascending to upper mezzanine",
            "motion_variance": 1.5
        },
        {
            "camera_id": "CAM-02",
            "camera_name": cams.get("CAM-02").name if "CAM-02" in cams else "North Metro Platform 3",
            "coordinates": [28.6152, 77.2105],
            "timestamp": now - timedelta(minutes=2, seconds=10),
            "heading": "Approach towards Gate 4B",
            "motion_variance": 5.2 # Triggers UNCERTAIN association flag for human review
        }
    ]

    chains = multi_camera_service.correlate_trajectories(observations)

    # Timeline events
    timeline = [
        {
            "time": (now - timedelta(minutes=6, seconds=20)).strftime("%H:%M:%S"),
            "camera_id": "CAM-01",
            "camera_name": "Main Terminal Concourse",
            "event": "Initial detection: Individual walking at 1.4 m/s towards north accessway.",
            "type": "NORMAL_TRANSIT"
        },
        {
            "time": (now - timedelta(minutes=4, seconds=45)).strftime("%H:%M:%S"),
            "camera_id": "CAM-08",
            "camera_name": "Skywalk Escalator Bank",
            "event": "Correlated trajectory: Traversal through escalator bank. Direction vector confirmed.",
            "type": "TRANSIT_CORRIDOR"
        },
        {
            "time": (now - timedelta(minutes=2, seconds=10)).strftime("%H:%M:%S"),
            "camera_id": "CAM-02",
            "camera_name": "North Metro Platform 3",
            "event": "Spatial anomaly: Sudden crowd density buildup at platform bottleneck.",
            "type": "EARLY_WARNING",
            "human_review_required": True
        }
    ]

    return {
        "chains": chains,
        "unified_timeline": timeline,
        "active_cross_nodes": len(observations),
        "anonymity_standard": "Compliant (Zero facial/biometric tracking; kinematic vectors only)"
    }
