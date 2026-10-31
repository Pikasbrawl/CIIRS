import os
import cv2
import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import execute_values
import redis

from app.config import config
from app.ingestion.decoder import VideoDecoder
from app.detection.yolo_detector import YOLODetector
from app.tracking.bytetrack_tracker import ByteTracker
from app.reid.embedder import ReIDEmbedder
from app.embeddings.clip_search import SemanticTextVisualEncoder
from app.events.event_engine import EventEngine

logger = logging.getLogger("ciirs.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

class AIJobWorker:
    def __init__(self):
        self.detector = YOLODetector(model_name=config.AI_YOLO_MODEL, device=config.DEVICE, conf_threshold=config.AI_DETECTION_CONF)
        self.reid_embedder = ReIDEmbedder(device=config.DEVICE)
        self.clip_encoder = SemanticTextVisualEncoder(device=config.DEVICE)
        self.redis_client = None
        self.init_redis()

    def init_redis(self):
        try:
            self.redis_client = redis.Redis(
                host=config.REDIS_HOST,
                port=config.REDIS_PORT,
                password=config.REDIS_PASSWORD,
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {config.REDIS_HOST}:{config.REDIS_PORT}")
            # Ensure consumer group
            try:
                self.redis_client.xgroup_create(config.REDIS_JOB_STREAM, config.REDIS_GROUP, id="0", mkstream=True)
            except redis.exceptions.ResponseError as e:
                if "BUSYGROUP" not in str(e):
                    logger.warning(f"Consumer group notice: {e}")
        except Exception as e:
            logger.warning(f"Redis not available ({e}). Worker will fallback to database polling.")
            self.redis_client = None

    def get_db_connection(self):
        return psycopg2.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            dbname=config.DB_NAME
        )

    def publish_status(self, job_id: str, video_id: str, status: str, progress: int, stage: str, error_msg: str = ""):
        payload = {
            "job_id": job_id,
            "video_id": video_id,
            "status": status,
            "progress": progress,
            "stage": stage,
            "error_message": error_msg,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        # 1. Update in Redis Stream
        if self.redis_client:
            try:
                self.redis_client.xadd(config.REDIS_STATUS_STREAM, {"payload": json.dumps(payload)})
            except Exception as e:
                logger.error(f"Error publishing status to Redis: {e}")

        # 2. Update directly in PostgreSQL
        try:
            conn = self.get_db_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE processing_jobs
                    SET status = %s, progress = %s, stage = %s, error_message = %s,
                        started_at = CASE WHEN started_at IS NULL AND %s = 'processing' THEN CURRENT_TIMESTAMP ELSE started_at END,
                        completed_at = CASE WHEN %s IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
                    WHERE id = %s
                """, (status, progress, stage, error_msg, status, status, job_id))
                
                # Also update video status
                if video_id:
                    v_stat = status
                    if status not in ("processing", "completed", "failed"):
                        v_stat = "processing"
                    cur.execute("UPDATE videos SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (v_stat, video_id))
                
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating job status in DB: {e}")

    def process_video_job(self, job_payload: Dict[str, Any]):
        job_id = job_payload["job_id"]
        video_id = job_payload["video_id"]
        camera_id = job_payload["camera_id"]
        file_path = job_payload["file_path"]
        fps = job_payload.get("fps", config.AI_FRAME_FPS)

        logger.info(f"Starting processing job {job_id} for video {video_id} at {file_path}")
        self.publish_status(job_id, video_id, "processing", 5, "Decoding CCTV video and extracting metadata")

        try:
            # 1. Ingestion & Decoder
            decoder = VideoDecoder(file_path, target_fps=fps)
            meta = decoder.get_metadata()
            logger.info(f"Video metadata: {meta}")

            # Generate thumbnail
            thumb_name = f"thumb_{video_id}.jpg"
            thumb_path = os.path.join(config.STORAGE_THUMBNAILS, thumb_name)
            decoder.generate_thumbnail(thumb_path)
            rel_thumb = f"/storage/thumbnails/{thumb_name}"

            # Query video base recorded timestamp from DB
            base_recorded_time = datetime.now(timezone.utc)
            try:
                conn = self.get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("SELECT recorded_at_start FROM videos WHERE id = %s", (video_id,))
                    row = cur.fetchone()
                    if row and row[0]:
                        base_recorded_time = row[0]
                conn.close()
            except Exception as e:
                logger.warning(f"Could not fetch recorded_at_start from DB ({e}), using current time.")

            # 2. Object Detection & ByteTrack
            self.publish_status(job_id, video_id, "processing", 20, "Running YOLO detection & ByteTrack tracking")
            tracker = ByteTracker(max_lost_frames=10)
            
            all_detections = []
            frame_crops = [] # For appearance and embeddings

            for frame_num, timestamp_sec, frame in decoder.extract_frames():
                # Detect supported classes
                dets = self.detector.detect(frame, frame_num, timestamp_sec)
                # Track detections
                tracked_dets = tracker.update(dets, frame_num)
                all_detections.extend(tracked_dets)

                # Extract observation crops for persons and objects
                for d in tracked_dets:
                    crop = self.reid_embedder.extract_crop(frame, [d["bbox_x"], d["bbox_y"], d["bbox_w"], d["bbox_h"]])
                    if crop is not None:
                        crop_filename = f"crop_{video_id}_{frame_num}_{d.get('local_track_id', 0)}.jpg"
                        crop_disk_path = os.path.join(config.STORAGE_EVIDENCE, crop_filename)
                        cv2.imwrite(crop_disk_path, crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
                        d["crop_path"] = f"/storage/evidence/{crop_filename}"
                        d["crop_disk_path"] = crop_disk_path
                        frame_crops.append((d, crop))

            # 3. Person Re-ID Appearance Embeddings
            self.publish_status(job_id, video_id, "processing", 55, "Generating Re-ID appearance embeddings")
            all_tracks = tracker.get_all_tracks()
            reid_embeddings = []

            for d, crop in frame_crops:
                if d["class_name"] == "person":
                    emb_vec = self.reid_embedder.compute_embedding(crop)
                    reid_embeddings.append({
                        "video_id": video_id,
                        "camera_id": camera_id,
                        "track_id": d.get("local_track_id"),
                        "embedding_type": "reid",
                        "vector": emb_vec,
                        "crop_path": d.get("crop_path"),
                        "timestamp_seconds": d["timestamp_seconds"],
                        "description": f"Person appearance in Camera {camera_id[:8]} at {d['timestamp_seconds']:.1f}s"
                    })

            # 4. Multimodal Semantic Visual Indexing (CLIP)
            self.publish_status(job_id, video_id, "processing", 70, "Indexing visual keyframes with CLIP embeddings")
            clip_embeddings = []
            # Index sample crops for semantic video search
            step = max(1, len(frame_crops) // 15) if frame_crops else 1
            for idx in range(0, len(frame_crops), step):
                d, crop = frame_crops[idx]
                c_vec = self.clip_encoder.embed_image(crop)
                desc = f"{d['class_name'].capitalize()} observed at {d['timestamp_seconds']:.1f}s in Camera {camera_id[:8]}"
                clip_embeddings.append({
                    "video_id": video_id,
                    "camera_id": camera_id,
                    "track_id": d.get("local_track_id"),
                    "embedding_type": "clip",
                    "vector": c_vec,
                    "crop_path": d.get("crop_path"),
                    "timestamp_seconds": d["timestamp_seconds"],
                    "description": desc
                })

            # 5. Structured Event Extraction
            self.publish_status(job_id, video_id, "processing", 85, "Inferring surveillance events from temporal tracks")
            event_engine = EventEngine(video_id=video_id, camera_id=camera_id, base_timestamp=base_recorded_time)
            events = event_engine.infer_events(all_tracks, all_detections)

            # 6. Database Storage in PostgreSQL
            self.publish_status(job_id, video_id, "processing", 92, "Persisting detections, tracks, embeddings and events to database")
            self._save_results_to_db(video_id, camera_id, meta, all_detections, all_tracks, reid_embeddings + clip_embeddings, events)

            # Complete!
            self.publish_status(job_id, video_id, "completed", 100, f"Analysis complete: {len(all_detections)} detections, {len(all_tracks)} tracks, {len(events)} events extracted")
            logger.info(f"Successfully finished processing job {job_id}")

        except Exception as e:
            logger.error(f"Failed processing job {job_id}: {e}", exc_info=True)
            self.publish_status(job_id, video_id, "failed", 0, "Processing failed", str(e))

    def _save_results_to_db(self, video_id, camera_id, meta, detections, tracks, embeddings, events):
        conn = self.get_db_connection()
        try:
            with conn.cursor() as cur:
                # Update video metadata
                cur.execute("""
                    UPDATE videos
                    SET duration_seconds = %s, fps = %s, width = %s, height = %s, status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (meta["duration_seconds"], meta["native_fps"], meta["width"], meta["height"], video_id))

                # Batch insert detections
                if detections:
                    det_values = [
                        (video_id, d["frame_number"], d["timestamp_seconds"], d["class_name"], d["confidence"],
                         d["bbox_x"], d["bbox_y"], d["bbox_w"], d["bbox_h"])
                        for d in detections[:1000] # store up to 1000 key observations
                    ]
                    execute_values(cur, """
                        INSERT INTO detections (video_id, frame_number, timestamp_seconds, class_name, confidence, bbox_x, bbox_y, bbox_w, bbox_h)
                        VALUES %s
                    """, det_values)

                # Batch insert tracks
                track_id_map = {}
                for t in tracks:
                    sample_crop = t.observations[0].get("crop_path", "") if t.observations else ""
                    cur.execute("""
                        INSERT INTO tracks (video_id, camera_id, local_track_id, class_name, start_time, end_time, total_detections, sample_crop_path)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (video_id, camera_id, t.track_id, t.class_name, t.start_time, t.end_time, t.total_detections, sample_crop))
                    row = cur.fetchone()
                    if row:
                        track_id_map[t.track_id] = row[0]

                # Batch insert embeddings
                if embeddings:
                    emb_values = [
                        (track_id_map.get(e.get("track_id")), video_id, camera_id, e["embedding_type"],
                         json.dumps(e["vector"]), e.get("crop_path"), e.get("timestamp_seconds"), e.get("description"))
                        for e in embeddings
                    ]
                    execute_values(cur, """
                        INSERT INTO embeddings (track_id, video_id, camera_id, embedding_type, vector, crop_path, timestamp_seconds, description)
                        VALUES %s
                    """, emb_values)

                # Batch insert events
                if events:
                    ev_values = [
                        (video_id, camera_id, track_id_map.get(ev.get("track_id")), ev["event_type"],
                         ev["timestamp_seconds"], ev["absolute_time"], ev["confidence"], ev["description"],
                         ev["review_status"], ev.get("evidence_thumbnail"), json.dumps(ev.get("metadata", {})))
                        for ev in events
                    ]
                    execute_values(cur, """
                        INSERT INTO events (video_id, camera_id, track_id, event_type, timestamp_seconds, absolute_time, confidence, description, review_status, evidence_thumbnail, metadata)
                        VALUES %s
                    """, ev_values)

            conn.commit()
        finally:
            conn.close()

    def run(self):
        logger.info("AI Worker started and listening for jobs...")
        consumer_id = f"worker-{os.getpid()}"

        while True:
            job_found = False
            # 0. Publish Heartbeat to Redis
            if self.redis_client:
                try:
                    self.redis_client.set("ciirs:worker:heartbeat", json.dumps({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "pid": os.getpid(),
                        "device": config.DEVICE,
                        "yolo_model": config.AI_YOLO_MODEL,
                        "frame_fps": config.AI_FRAME_FPS,
                        "status": "listening",
                        "service": "CIIRS Python AI Worker Microservice"
                    }), ex=15)
                except Exception as e:
                    pass

            # 1. Check Redis Streams
            if self.redis_client:
                try:
                    entries = self.redis_client.xreadgroup(
                        groupname=config.REDIS_GROUP,
                        consumername=consumer_id,
                        streams={config.REDIS_JOB_STREAM: ">"},
                        count=1,
                        block=2000
                    )
                    if entries:
                        for stream_name, messages in entries:
                            for msg_id, data in messages:
                                payload_str = data.get("payload", "{}")
                                job_payload = json.loads(payload_str)
                                self.process_video_job(job_payload)
                                self.redis_client.xack(config.REDIS_JOB_STREAM, config.REDIS_GROUP, msg_id)
                                job_found = True
                except Exception as e:
                    logger.warning(f"Redis poll warning: {e}")

            # 2. Check Database Queued Jobs as fallback
            if not job_found:
                try:
                    conn = self.get_db_connection()
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT j.id, j.video_id, v.camera_id, v.file_path, j.job_type
                            FROM processing_jobs j
                            JOIN videos v ON j.video_id = v.id
                            WHERE j.status = 'queued'
                            ORDER BY j.created_at ASC
                            LIMIT 1
                        """)
                        row = cur.fetchone()
                        if row:
                            job_payload = {
                                "job_id": str(row[0]),
                                "video_id": str(row[1]),
                                "camera_id": str(row[2]),
                                "file_path": row[3],
                                "job_type": row[4]
                            }
                            # Mark processing to avoid duplicate pickup
                            cur.execute("UPDATE processing_jobs SET status = 'processing', started_at = CURRENT_TIMESTAMP WHERE id = %s", (row[0],))
                            conn.commit()
                            self.process_video_job(job_payload)
                            job_found = True
                    conn.close()
                except Exception as e:
                    # DB not up yet or quiet
                    pass

            if not job_found:
                time.sleep(1.5)
