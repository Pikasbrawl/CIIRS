import cv2
import os
import math
import logging
from typing import Generator, Tuple, Dict, Any

logger = logging.getLogger("ciirs.decoder")

class VideoDecoder:
    def __init__(self, video_path: str, target_fps: float = 1.5):
        self.video_path = video_path
        self.target_fps = target_fps
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise ValueError(f"Unable to open video stream: {video_path}")
            
        self.native_fps = self.cap.get(cv2.CAP_PROP_FPS) or 25.0
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        self.duration_seconds = self.total_frames / self.native_fps if self.native_fps > 0 else 0.0

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "native_fps": self.native_fps,
            "target_fps": self.target_fps,
            "total_frames": self.total_frames,
            "width": self.width,
            "height": self.height,
            "duration_seconds": self.duration_seconds
        }

    def extract_frames(self) -> Generator[Tuple[int, float, Any], None, None]:
        """
        Extracts frames at target_fps rate to optimize processing on M4 hardware.
        Yields: (frame_number, timestamp_seconds, frame_bgr)
        """
        frame_interval = max(1, int(round(self.native_fps / self.target_fps)))
        current_frame = 0

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    break

                if current_frame % frame_interval == 0:
                    timestamp_sec = current_frame / self.native_fps
                    yield current_frame, timestamp_sec, frame

                current_frame += 1
        finally:
            self.cap.release()

    def generate_thumbnail(self, output_path: str) -> str:
        """Saves a representative thumbnail frame from 10% into the video"""
        cap = cv2.VideoCapture(self.video_path)
        try:
            target_frame = min(int(self.total_frames * 0.1), self.total_frames - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, target_frame))
            ret, frame = cap.read()
            if ret and frame is not None:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                # Resize thumbnail to standard 640x360
                thumb = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)
                cv2.imwrite(output_path, thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
                return output_path
        finally:
            cap.release()
        return ""
