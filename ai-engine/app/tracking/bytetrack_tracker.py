import numpy as np
import logging
from typing import List, Dict, Any

logger = logging.getLogger("ciirs.tracker")

def compute_iou(boxA, boxB):
    # box: [x, y, w, h] normalized
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]

    unionArea = boxAArea + boxBArea - interArea
    if unionArea <= 0:
        return 0.0
    return interArea / unionArea

class TrackInstance:
    def __init__(self, track_id: int, detection: Dict[str, Any]):
        self.track_id = track_id
        self.class_name = detection["class_name"]
        self.bbox = [detection["bbox_x"], detection["bbox_y"], detection["bbox_w"], detection["bbox_h"]]
        self.last_seen_frame = detection["frame_number"]
        self.start_time = detection["timestamp_seconds"]
        self.end_time = detection["timestamp_seconds"]
        self.total_detections = 1
        self.observations = [detection]
        self.sample_crop = None
        self.state = "active" # active, lost, finished

    def update(self, detection: Dict[str, Any]):
        # Smooth bbox update
        alpha = 0.7
        self.bbox[0] = alpha * detection["bbox_x"] + (1 - alpha) * self.bbox[0]
        self.bbox[1] = alpha * detection["bbox_y"] + (1 - alpha) * self.bbox[1]
        self.bbox[2] = alpha * detection["bbox_w"] + (1 - alpha) * self.bbox[2]
        self.bbox[3] = alpha * detection["bbox_h"] + (1 - alpha) * self.bbox[3]

        self.last_seen_frame = detection["frame_number"]
        self.end_time = detection["timestamp_seconds"]
        self.total_detections += 1
        self.observations.append(detection)
        self.state = "active"

class ByteTracker:
    """
    ByteTrack implementation for single-camera sequence tracking.
    Key principle: ByteTrack IDs are strictly local to this video sequence.
    """
    def __init__(self, max_lost_frames: int = 15, iou_threshold: float = 0.25):
        self.next_track_id = 1
        self.active_tracks: List[TrackInstance] = []
        self.lost_tracks: List[TrackInstance] = []
        self.finished_tracks: List[TrackInstance] = []
        self.max_lost_frames = max_lost_frames
        self.iou_threshold = iou_threshold

    def update(self, detections: List[Dict[str, Any]], current_frame: int) -> List[Dict[str, Any]]:
        """
        Processes new detections using ByteTrack two-stage IoU association.
        Returns detections augmented with 'local_track_id'.
        """
        high_det = [d for d in detections if d["confidence"] >= 0.50]
        low_det = [d for d in detections if d["confidence"] < 0.50]

        all_candidates = self.active_tracks + self.lost_tracks
        matched_tracks = set()
        matched_dets = set()

        # Stage 1: Match active/lost tracks with high-confidence detections
        for det_idx, det in enumerate(high_det):
            best_iou = self.iou_threshold
            best_track = None

            det_box = [det["bbox_x"], det["bbox_y"], det["bbox_w"], det["bbox_h"]]
            for track in all_candidates:
                if track in matched_tracks or track.class_name != det["class_name"]:
                    continue
                iou = compute_iou(track.bbox, det_box)
                if iou > best_iou:
                    best_iou = iou
                    best_track = track

            if best_track is not None:
                best_track.update(det)
                det["local_track_id"] = best_track.track_id
                matched_tracks.add(best_track)
                matched_dets.add(det_idx)
                if best_track in self.lost_tracks:
                    self.lost_tracks.remove(best_track)
                    self.active_tracks.append(best_track)

        # Stage 2: Match remaining tracks with low-confidence detections
        unmatched_tracks = [t for t in all_candidates if t not in matched_tracks]
        for det_idx, det in enumerate(low_det):
            best_iou = self.iou_threshold
            best_track = None

            det_box = [det["bbox_x"], det["bbox_y"], det["bbox_w"], det["bbox_h"]]
            for track in unmatched_tracks:
                if track in matched_tracks or track.class_name != det["class_name"]:
                    continue
                iou = compute_iou(track.bbox, det_box)
                if iou > best_iou:
                    best_iou = iou
                    best_track = track

            if best_track is not None:
                best_track.update(det)
                det["local_track_id"] = best_track.track_id
                matched_tracks.add(best_track)

        # Stage 3: Initiate new tracks for unmatched high-confidence detections
        for det_idx, det in enumerate(high_det):
            if det_idx not in matched_dets:
                new_track = TrackInstance(self.next_track_id, det)
                det["local_track_id"] = self.next_track_id
                self.next_track_id += 1
                self.active_tracks.append(new_track)

        # Mark lost or finished tracks
        current_active = []
        for track in self.active_tracks:
            if current_frame - track.last_seen_frame > self.max_lost_frames:
                track.state = "finished"
                self.finished_tracks.append(track)
            elif current_frame - track.last_seen_frame > 0:
                track.state = "lost"
                self.lost_tracks.append(track)
            else:
                current_active.append(track)
        self.active_tracks = current_active

        return detections

    def get_all_tracks(self) -> List[TrackInstance]:
        return self.active_tracks + self.lost_tracks + self.finished_tracks
