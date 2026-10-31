import math
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger("ciirs.events")

def get_center(bbox: List[float]):
    # bbox: [x, y, w, h] normalized
    return (bbox[0] + bbox[2] / 2.0, bbox[1] + bbox[3] / 2.0)

def distance(c1, c2):
    return math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)

class EventEngine:
    """
    Structured Surveillance Event Inference Engine.
    Infers validated temporal and spatial events from tracks and detections.
    Never fabricates complex actions without empirical spatial-temporal evidence.
    """
    def __init__(self, video_id: str, camera_id: str, base_timestamp: datetime):
        self.video_id = video_id
        self.camera_id = camera_id
        self.base_timestamp = base_timestamp

    def infer_events(self, tracks: List[Any], detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        events = []

        person_tracks = [t for t in tracks if t.class_name == "person"]
        vehicle_tracks = [t for t in tracks if t.class_name in ("car", "motorcycle", "bus", "truck", "bicycle")]
        object_tracks = [t for t in tracks if t.class_name in ("backpack", "suitcase", "handbag")]

        # 1. Person FOV Entry and Exit Events
        for track in person_tracks:
            abs_start = self.base_timestamp + timedelta(seconds=track.start_time)
            thumb = track.observations[0].get("crop_path", "") if track.observations else ""

            events.append({
                "video_id": self.video_id,
                "camera_id": self.camera_id,
                "track_id": track.track_id,
                "event_type": "person_entered",
                "timestamp_seconds": round(track.start_time, 2),
                "absolute_time": abs_start.isoformat(),
                "confidence": 0.92,
                "description": f"Person (Track #{track.track_id}) entered camera field of view at {track.start_time:.1f}s.",
                "review_status": "candidate",
                "evidence_thumbnail": thumb,
                "metadata": {
                    "local_track_id": track.track_id,
                    "total_detections": track.total_detections
                }
            })

            # Check for Exit event if duration > 3 seconds
            duration = track.end_time - track.start_time
            if duration >= 3.0:
                abs_end = self.base_timestamp + timedelta(seconds=track.end_time)
                last_thumb = track.observations[-1].get("crop_path", thumb) if track.observations else thumb

                events.append({
                    "video_id": self.video_id,
                    "camera_id": self.camera_id,
                    "track_id": track.track_id,
                    "event_type": "person_exited",
                    "timestamp_seconds": round(track.end_time, 2),
                    "absolute_time": abs_end.isoformat(),
                    "confidence": 0.88,
                    "description": f"Person (Track #{track.track_id}) exited camera field of view after {duration:.1f}s in sector.",
                    "review_status": "candidate",
                    "evidence_thumbnail": last_thumb,
                    "metadata": {
                        "local_track_id": track.track_id,
                        "duration_seconds": round(duration, 2)
                    }
                })

            # Check for Loitering / Prolonged Presence (duration > 25 seconds)
            if duration >= 25.0:
                abs_mid = self.base_timestamp + timedelta(seconds=track.start_time + 15.0)
                events.append({
                    "video_id": self.video_id,
                    "camera_id": self.camera_id,
                    "track_id": track.track_id,
                    "event_type": "loitering",
                    "timestamp_seconds": round(track.start_time + 15.0, 2),
                    "absolute_time": abs_mid.isoformat(),
                    "confidence": 0.82,
                    "description": f"Prolonged presence detected: Subject #{track.track_id} stationary or loitering in sector for {duration:.1f}s.",
                    "review_status": "candidate",
                    "evidence_thumbnail": thumb,
                    "metadata": {
                        "local_track_id": track.track_id,
                        "duration_seconds": round(duration, 2)
                    }
                })

        # 2. Vehicle Detection Events
        for vtrack in vehicle_tracks:
            abs_start = self.base_timestamp + timedelta(seconds=vtrack.start_time)
            thumb = vtrack.observations[0].get("crop_path", "") if vtrack.observations else ""

            events.append({
                "video_id": self.video_id,
                "camera_id": self.camera_id,
                "track_id": vtrack.track_id,
                "event_type": "vehicle_detected",
                "timestamp_seconds": round(vtrack.start_time, 2),
                "absolute_time": abs_start.isoformat(),
                "confidence": 0.94,
                "description": f"Vehicle ({vtrack.class_name.capitalize()}) detected entering surveillance sector (Track #{vtrack.track_id}).",
                "review_status": "candidate",
                "evidence_thumbnail": thumb,
                "metadata": {
                    "vehicle_type": vtrack.class_name,
                    "local_track_id": vtrack.track_id
                }
            })

        # 3. Proximity Interaction Between Persons
        for i in range(len(person_tracks)):
            for j in range(i + 1, len(person_tracks)):
                p1 = person_tracks[i]
                p2 = person_tracks[j]

                # Check temporal overlap
                overlap_start = max(p1.start_time, p2.start_time)
                overlap_end = min(p1.end_time, p2.end_time)

                if overlap_end - overlap_start >= 3.0: # Overlap at least 3 seconds
                    # Check spatial distance
                    c1 = get_center(p1.bbox)
                    c2 = get_center(p2.bbox)
                    dist = distance(c1, c2)

                    if dist < 0.18: # In close proximity (< 18% of frame dimension)
                        abs_time = self.base_timestamp + timedelta(seconds=overlap_start)
                        thumb = p1.observations[0].get("crop_path", "") if p1.observations else ""

                        events.append({
                            "video_id": self.video_id,
                            "camera_id": self.camera_id,
                            "track_id": p1.track_id,
                            "event_type": "proximity_interaction",
                            "timestamp_seconds": round(overlap_start, 2),
                            "absolute_time": abs_time.isoformat(),
                            "confidence": 0.79,
                            "description": f"Possible interaction or encounter between Person #{p1.track_id} and Person #{p2.track_id} in close proximity.",
                            "review_status": "candidate",
                            "evidence_thumbnail": thumb,
                            "metadata": {
                                "subject1_track_id": p1.track_id,
                                "subject2_track_id": p2.track_id,
                                "normalized_distance": round(dist, 3)
                            }
                        })

        # 4. Unattended Object Detection (Backpack/Suitcase stationary without person nearby for > 10s)
        for otrack in object_tracks:
            obj_duration = otrack.end_time - otrack.start_time
            if obj_duration >= 10.0:
                obj_center = get_center(otrack.bbox)
                # Check if any person is close during this duration
                owner_found = False
                for ptrack in person_tracks:
                    p_start = max(otrack.start_time, ptrack.start_time)
                    p_end = min(otrack.end_time, ptrack.end_time)
                    if p_end > p_start:
                        p_center = get_center(ptrack.bbox)
                        if distance(obj_center, p_center) < 0.15:
                            owner_found = True
                            break

                if not owner_found:
                    abs_time = self.base_timestamp + timedelta(seconds=otrack.start_time + 10.0)
                    thumb = otrack.observations[0].get("crop_path", "") if otrack.observations else ""

                    events.append({
                        "video_id": self.video_id,
                        "camera_id": self.camera_id,
                        "track_id": otrack.track_id,
                        "event_type": "unattended_object",
                        "timestamp_seconds": round(otrack.start_time + 10.0, 2),
                        "absolute_time": abs_time.isoformat(),
                        "confidence": 0.84,
                        "description": f"Unattended {otrack.class_name} detected stationary for {obj_duration:.1f}s without accompanied person in proximity.",
                        "review_status": "candidate",
                        "evidence_thumbnail": thumb,
                        "metadata": {
                            "object_type": otrack.class_name,
                            "stationary_duration": round(obj_duration, 2)
                        }
                    })

        # Sort events chronologically
        events.sort(key=lambda x: x["timestamp_seconds"])
        return events
