import hashlib
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.models import (
    User, Camera, CameraHealthLog, ResponseUnit, Dataset, ScenarioAnnotation,
    ModelVersion, TrainingRun, Incident, ResponseRequest, Prediction,
    RiskAssessment, Alert, InvestigationCase, CaseEvidence, CaseNote, AuditLog,
    PublicIncidentReport, VehicleDetection
)
from app.core.security import get_password_hash

def seed_database(db: Session):
    # Check if database is already seeded with new camera IDs
    existing = db.query(Camera).filter(Camera.camera_id == "CAM-17-001").first()
    if existing:
        return

    # Clear old cameras and seed complete Chandigarh Smart City network
    db.query(CameraHealthLog).delete()
    db.query(Alert).delete()
    db.query(ResponseRequest).delete()
    db.query(Incident).delete()
    db.query(Prediction).delete()
    db.query(RiskAssessment).delete()
    db.query(Camera).delete()
    db.commit()

    print("Seeding CIIRS Command Centre reference network...")

    # 1. Users
    if not db.query(User).first():
        users = [
            User(
                username="admin",
                email="admin@ciirs.gov.in",
                hashed_password=get_password_hash("admin123"),
                full_name="Operations Director Sarah Vance",
                role="ADMIN",
                badge_number="DIR-001",
                department="Command & Control Room"
            ),
            User(
                username="investigator",
                email="investigator@ciirs.gov.in",
                hashed_password=get_password_hash("investigate123"),
                full_name="Senior Investigator Maya Lin",
                role="INVESTIGATOR",
                badge_number="INV-902",
                department="Forensic Incident Reconstruction"
            ),
            User(
                username="operator",
                email="operator@ciirs.gov.in",
                hashed_password=get_password_hash("operator123"),
                full_name="Control Room Operator Arjun Singh",
                role="OPERATOR",
                badge_number="OPR-402",
                department="City Surveillance Control"
            )
        ]
        db.add_all(users)
        db.commit()

    # 2. Cameras matching the Reference Screenshot exactly
    primary_cameras = [
        Camera(
            camera_id="CAM-17-001",
            name="Sector 17 - Plaza",
            latitude=30.7398,
            longitude=76.7827,
            address="Sector 17 Central Plaza, Commercial Promenade",
            area_zone="Sector 17",
            status="ONLINE",
            stream_url="demo://cam_17_001_plaza",
            resolution="1920x1080",
            fps=30.0,
            trust_score=99.4,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-22-003",
            name="Sector 22 - Market",
            latitude=30.7290,
            longitude=76.7725,
            address="Sector 22 Shastri Market Pedestrian Walkway",
            area_zone="Sector 22",
            status="ONLINE",
            stream_url="demo://cam_22_003_market",
            resolution="1920x1080",
            fps=29.8,
            trust_score=97.2,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-35-002",
            name="Sector 35 - Roundabout",
            latitude=30.7210,
            longitude=76.7620,
            address="Sector 35 Rotary Intersection & Avenue 3",
            area_zone="Sector 35",
            status="ONLINE",
            stream_url="demo://cam_35_002_roundabout",
            resolution="1920x1080",
            fps=30.0,
            trust_score=98.6,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-43-001",
            name="Sector 43 - Residential",
            latitude=30.7180,
            longitude=76.7460,
            address="Sector 43 Residential Avenue & ISBT Link",
            area_zone="Sector 43",
            status="ONLINE",
            stream_url="demo://cam_43_001_residential",
            resolution="1920x1080",
            fps=29.4,
            trust_score=96.8,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-08-001",
            name="Sector 8 - Market",
            latitude=30.7480,
            longitude=76.7930,
            address="Sector 8 Inner Market Corridor",
            area_zone="Sector 8",
            status="OFFLINE",
            stream_url="demo://cam_08_001_market",
            resolution="1920x1080",
            fps=0.0,
            trust_score=24.0,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-10-004",
            name="Sukhna Lake Promenade",
            latitude=30.7421,
            longitude=76.8188,
            address="Sukhna Lake Waterfront Promenade & Trail",
            area_zone="Sukhna Lake",
            status="ONLINE",
            stream_url="demo://cam_10_004_lake",
            resolution="2560x1440",
            fps=30.0,
            trust_score=99.1,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-14-002",
            name="Punjab University Gate",
            latitude=30.7600,
            longitude=76.7680,
            address="Panjab University Sector 14 Main Entry Road",
            area_zone="University",
            status="ONLINE",
            stream_url="demo://cam_14_002_pu",
            resolution="1920x1080",
            fps=30.0,
            trust_score=98.0,
            is_tampered=False,
            is_obstructed=False
        ),
        Camera(
            camera_id="CAM-20-001",
            name="IT Park Tech Boulevard",
            latitude=30.7245,
            longitude=76.8375,
            address="Rajiv Gandhi IT Park Tech Park Concourse",
            area_zone="IT Park",
            status="ONLINE",
            stream_url="demo://cam_20_001_itpark",
            resolution="1920x1080",
            fps=30.0,
            trust_score=99.5,
            is_tampered=False,
            is_obstructed=False
        )
    ]
    db.add_all(primary_cameras)
    db.commit()

    # Generate additional registered cameras to total exactly 100 cameras
    # (86 Connected/Online, 5 with Alert status, 9 Offline - matching reference dashboard card!)
    total_needed = 100 - len(primary_cameras)
    sectors = ["Sector 17", "Sector 22", "Sector 35", "Sector 43", "Sector 8", "Sector 9", "Sector 10", "Sector 15", "Sector 26", "Sector 34", "Sector 42", "IT Park", "Sukhna Lake", "Industrial Area"]
    
    extra_cameras = []
    # 86 online total: currently 7 online + 1 offline. We need 79 online and 8 more offline.
    offline_to_create = 8
    
    for i in range(total_needed):
        sec = sectors[i % len(sectors)]
        sec_num = sec.replace("Sector ", "").replace("IT Park", "20").replace("Sukhna Lake", "10").replace("Industrial Area", "28")
        cam_code = f"CAM-{sec_num.zfill(2)}-{100 + i}"
        is_off = i < offline_to_create
        
        # Center around Chandigarh (lat: 30.71 to 30.76, lon: 76.74 to 76.84)
        c_lat = 30.7150 + random.uniform(0.005, 0.045)
        c_lon = 76.7450 + random.uniform(0.005, 0.085)
        
        c = Camera(
            camera_id=cam_code,
            name=f"{sec} - Node {i+1}",
            latitude=round(c_lat, 6),
            longitude=round(c_lon, 6),
            address=f"{sec} Public Corridor Node #{i+1}, City Surveillance Grid",
            area_zone=sec,
            status="OFFLINE" if is_off else "ONLINE",
            stream_url=f"demo://{cam_code.lower()}",
            resolution="1920x1080",
            fps=0.0 if is_off else round(random.uniform(28.5, 30.0), 1),
            trust_score=round(random.uniform(20.0, 45.0) if is_off else random.uniform(92.0, 99.8), 1),
            is_tampered=False,
            is_obstructed=False
        )
        extra_cameras.append(c)

    db.add_all(extra_cameras)
    db.commit()

    # 3. Vehicle Detections matching Reference Screenshot
    detections = [
        VehicleDetection(
            plate_number="CH01AB1234",
            camera_id="CAM-17-001",
            camera_name="Sector 17 - Plaza",
            vehicle_type="Car (SUV)",
            confidence=0.963,
            speed_kmh=42.0,
            is_watchlist=True,
            watchlist_reason="Flagged in public safety registry",
            timestamp=datetime.utcnow() - timedelta(minutes=6, seconds=35)
        ),
        VehicleDetection(
            plate_number="CH01CD5678",
            camera_id="CAM-22-003",
            camera_name="Sector 22 - Market",
            vehicle_type="SUV",
            confidence=0.941,
            speed_kmh=35.0,
            is_watchlist=False,
            timestamp=datetime.utcnow() - timedelta(minutes=10, seconds=2)
        ),
        VehicleDetection(
            plate_number="PB65EF9012",
            camera_id="CAM-35-002",
            camera_name="Sector 35 - Roundabout",
            vehicle_type="Motorcycle",
            confidence=0.917,
            speed_kmh=48.0,
            is_watchlist=False,
            timestamp=datetime.utcnow() - timedelta(minutes=11, seconds=25)
        ),
        VehicleDetection(
            plate_number="CH01GH3456",
            camera_id="CAM-43-001",
            camera_name="Sector 43 - Residential",
            vehicle_type="Car",
            confidence=0.952,
            speed_kmh=28.0,
            is_watchlist=False,
            timestamp=datetime.utcnow() - timedelta(minutes=13, seconds=45)
        )
    ]
    db.add_all(detections)
    db.commit()

    # 4. Recent Alerts matching Reference Screenshot exactly
    cam17 = primary_cameras[0]
    cam22 = primary_cameras[1]
    cam35 = primary_cameras[2]
    cam43 = primary_cameras[3]
    cam08 = primary_cameras[4]

    alerts_list = [
        Alert(
            alert_type="UNATTENDED_OBJECT",
            severity="CRITICAL",
            camera_id=cam22.id,
            title="Unattended Object",
            message="Unattended baggage detected at Sector 22 Market pedestrian concourse for >45s. Requires operator verification.",
            deduplication_key="alert-cam22-unattended",
            is_acknowledged=False,
            created_at=datetime.utcnow() - timedelta(minutes=4, seconds=15)
        ),
        Alert(
            alert_type="WATCHLIST_VEHICLE",
            severity="HIGH",
            camera_id=cam17.id,
            title="Watchlist Vehicle (ANPR)",
            message="Plate CH01AB1234 identified at Sector 17 Plaza with 96.3% confidence.",
            deduplication_key="alert-cam17-anpr",
            is_acknowledged=False,
            created_at=datetime.utcnow() - timedelta(minutes=6, seconds=40)
        ),
        Alert(
            alert_type="SUSPICIOUS_MOVEMENT",
            severity="HIGH",
            camera_id=cam35.id,
            title="Suspicious Movement",
            message="Kinetic acceleration and erratic direction changes detected at Sector 35 Roundabout.",
            deduplication_key="alert-cam35-movement",
            is_acknowledged=False,
            created_at=datetime.utcnow() - timedelta(minutes=12, seconds=10)
        ),
        Alert(
            alert_type="CAMERA_OFFLINE",
            severity="LOW",
            camera_id=cam08.id,
            title="Camera Offline",
            message="CAM-08-001 connection timeout. Sensor telemetry stopped reporting.",
            deduplication_key="alert-cam08-offline",
            is_acknowledged=True,
            created_at=datetime.utcnow() - timedelta(minutes=47, seconds=20)
        ),
        Alert(
            alert_type="RESTRICTED_ZONE",
            severity="HIGH",
            camera_id=cam43.id,
            title="Vehicle in Restricted Zone",
            message="Vehicle traversal detected in pedestrian walkway zone at Sector 43.",
            deduplication_key="alert-cam43-restricted",
            is_acknowledged=False,
            created_at=datetime.utcnow() - timedelta(minutes=60, seconds=10)
        )
    ]
    db.add_all(alerts_list)
    db.commit()

    # 5. Incidents
    inc1 = Incident(
        incident_number="INC-2026-001",
        camera_id=cam22.id,
        category="Unattended Object",
        severity="HIGH",
        latitude=cam22.latitude,
        longitude=cam22.longitude,
        address=cam22.address,
        status="OPERATOR_VERIFYING",
        ai_confidence=0.942,
        ai_explanation="Stationary luggage identified without guardian proximity for >45 continuous temporal frames.",
        observed_indicators=["Stationary luggage dwell time >45s", "Owner departure without baggage"],
        evidence_snapshot="/static/snapshot_unattended.jpg"
    )
    inc2 = Incident(
        incident_number="INC-2026-002",
        camera_id=cam35.id,
        category="Suspicious Movement",
        severity="MODERATE",
        latitude=cam35.latitude,
        longitude=cam35.longitude,
        address=cam35.address,
        status="VERIFIED",
        ai_confidence=0.895,
        ai_explanation="Pacing and abrupt direction divergence exceeding baseline pedestrian corridor flow.",
        observed_indicators=["Erratic velocity changes", "Corridor lingering"],
        verified_by="Control Room Operator Arjun Singh",
        verified_at=datetime.utcnow() - timedelta(minutes=8)
    )
    db.add_all([inc1, inc2])
    db.commit()

    # 6. Public Incident Reports
    reports = [
        PublicIncidentReport(
            report_code="REP-2026-7841",
            category="Unattended Object",
            description="Unattended black backpack noticed near entrance gate of Sector 22 market.",
            latitude=30.7291,
            longitude=76.7728,
            address="Sector 22 Market, Chandigarh",
            status="UNDER_REVIEW",
            reporter_contact="+91 98140 55122"
        ),
        PublicIncidentReport(
            report_code="REP-2026-7842",
            category="Traffic Incident",
            description="Vehicle speeding through pedestrian walkway zone near Sector 43.",
            latitude=30.7182,
            longitude=76.7465,
            address="Sector 43 Residential Walkway",
            status="VERIFIED",
            reporter_contact="+91 98150 99411"
        )
    ]
    db.add_all(reports)

    # 7. Response Units in Chandigarh
    units = [
        ResponseUnit(
            unit_callsign="PCR-PATROL-17",
            agency_type="POLICE",
            status="AVAILABLE",
            latitude=30.7380,
            longitude=76.7800,
            heading_deg=90.0,
            speed_kmh=40.0,
            commander_name="SI Gurpreet Singh",
            contact_number="+91 98765 01701",
            vehicle_type="Police PCR Van"
        ),
        ResponseUnit(
            unit_callsign="PCR-PATROL-22",
            agency_type="POLICE",
            status="AVAILABLE",
            latitude=30.7280,
            longitude=76.7700,
            heading_deg=180.0,
            speed_kmh=35.0,
            commander_name="ASI Ramesh Kumar",
            contact_number="+91 98765 02202",
            vehicle_type="Police Rapid Motorcycle"
        ),
        ResponseUnit(
            unit_callsign="AMB-EMS-43",
            agency_type="MEDICAL",
            status="AVAILABLE",
            latitude=30.7190,
            longitude=76.7480,
            heading_deg=45.0,
            speed_kmh=0.0,
            commander_name="Dr. Harleen Kaur",
            contact_number="+91 98765 04303",
            vehicle_type="Advance Life Support Ambulance"
        )
    ]
    db.add_all(units)
    db.commit()

    # 8. Investigation Case
    case1 = InvestigationCase(
        case_number="CASE-2026-0042",
        title="Incident Reconstruction: Sector 22 Market Unattended Object Verification",
        incident_id=inc1.id,
        assigned_investigator="Senior Investigator Maya Lin",
        status="OPEN",
        priority="HIGH",
        summary="Analysis of multi-camera CCTV sequences and temporal dwell time relating to unattended baggage in Sector 22 concourse.",
        ai_preliminary_findings="Model identified stationary object at 14:28:15 UTC. Persistence exceeded calibrated dwell threshold of 30 seconds.",
        operator_verified_facts="Control room operator confirmed unattended item. Area marshals notified for perimeter security.",
        investigator_conclusions="Preliminary video reconstruction established time of deposit at 14:27:30 UTC by subject exiting toward Sector 23 link."
    )
    db.add(case1)
    db.commit()

    print("Reference dataset successfully seeded.")
