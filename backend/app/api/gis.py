from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Camera, Incident, ResponseUnit, PublicIncidentReport, Alert
from app.services.gis_service import gis_service

router = APIRouter(prefix="/gis", tags=["GIS Location & Mapping"])

@router.get("/layers")
def get_gis_layers(db: Session = Depends(get_db)):
    """
    Returns full GIS layer data:
    1. Registered CCTV cameras (with coordinates, zone, status, trust score)
    2. Active incidents (with severity, coordinates, status)
    3. Authorized response units (Police, Medical, Fire with real-time GPS, speed, heading)
    4. Public incident reports (with coordinates and status)
    5. AI alerts/warnings
    """
    cameras = db.query(Camera).all()
    incidents = db.query(Incident).filter(Incident.status.notin_(["RESOLVED", "DISMISSED"])).all()
    units = db.query(ResponseUnit).all()
    public_reports = db.query(PublicIncidentReport).all()
    alerts = db.query(Alert).all()

    camera_markers = []
    for c in cameras:
        camera_markers.append({
            "id": c.id,
            "camera_id": c.camera_id,
            "name": c.name,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "address": c.address,
            "area_zone": c.area_zone,
            "status": c.status,
            "trust_score": c.trust_score,
            "fps": c.fps,
            "source_type": "REGISTERED_CCTV_METADATA"
        })

    incident_markers = []
    for inc in incidents:
        incident_markers.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "category": inc.category,
            "severity": inc.severity,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "address": inc.address,
            "status": inc.status,
            "confidence": inc.ai_confidence,
            "observed_indicators": inc.observed_indicators,
            "source_type": "REGISTERED_CAMERA_COORDINATES"
        })

    responder_markers = []
    for u in units:
        responder_markers.append({
            "id": u.id,
            "unit_callsign": u.unit_callsign,
            "agency_type": u.agency_type,
            "status": u.status,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "heading": u.heading_deg,
            "speed_kmh": u.speed_kmh,
            "commander": u.commander_name,
            "vehicle_type": u.vehicle_type,
            "source_type": "RESPONDER_TELEMETRY_GPS"
        })

    report_markers = []
    for r in public_reports:
        report_markers.append({
            "id": r.id,
            "report_code": r.report_code,
            "category": r.category,
            "description": r.description,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "address": r.address,
            "status": r.status,
            "reporter_name": r.reporter_contact or "Anonymous Citizen",
            "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
            "source_type": "PUBLIC_REPORT"
        })

    alert_markers = []
    for a in alerts:
        cam = db.query(Camera).filter(Camera.id == a.camera_id).first() if a.camera_id else None
        lat = cam.latitude if cam else 30.7333
        lon = cam.longitude if cam else 76.7794
        alert_markers.append({
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "camera_id": cam.camera_id if cam else "CAM-CITY",
            "camera_name": cam.name if cam else "City Surveillance",
            "latitude": lat,
            "longitude": lon,
            "location": cam.area_zone if cam else "Chandigarh",
            "is_resolved": a.is_resolved,
            "created_at": a.created_at.isoformat() if hasattr(a.created_at, "isoformat") else str(a.created_at),
            "source_type": "AI_EARLY_WARNING"
        })

    return {
        "cameras": camera_markers,
        "incidents": incident_markers,
        "responders": responder_markers,
        "units": responder_markers,
        "reports": report_markers,
        "alerts": alert_markers
    }

@router.get("/nearest-responders")
def find_nearest_responders(
    incident_id: int,
    agency_type: str = "POLICE",
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        # Default Chandigarh center
        inc_lat, inc_lon = 30.7333, 76.7794
    else:
        inc_lat, inc_lon = inc.latitude, inc.longitude

    units = db.query(ResponseUnit).all()
    units_dict = [
        {
            "id": u.id,
            "unit_callsign": u.unit_callsign,
            "agency_type": u.agency_type,
            "status": u.status,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "speed_kmh": u.speed_kmh,
            "commander_name": u.commander_name,
            "vehicle_type": u.vehicle_type
        }
        for u in units
    ]

    nearest = gis_service.find_nearest_responders(inc_lat, inc_lon, units_dict, agency_type, limit=4)
    
    # Calculate routing waypoints to the closest unit
    route = []
    if nearest:
        closest = nearest[0]
        route = gis_service.generate_route_waypoints(
            closest["latitude"], closest["longitude"],
            inc_lat, inc_lon,
            num_waypoints=8
        )

    return {
        "incident_coordinates": [inc_lat, inc_lon],
        "nearest_units": nearest,
        "route_to_primary": route
    }
