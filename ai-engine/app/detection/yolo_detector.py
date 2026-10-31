import logging
from typing import List, Dict, Any
import numpy as np

logger = logging.getLogger("ciirs.detector")

# Validated supported surveillance classes from COCO / YOLO
SUPPORTED_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    24: "backpack",
    26: "handbag",
    28: "suitcase"
}

class YOLODetector:
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        # Singleton pattern to keep model loaded in memory between jobs
        if cls._instance is None:
            cls._instance = super(YOLODetector, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "yolov8n.pt", device: str = "cpu", conf_threshold: float = 0.40):
        if self._model is None:
            self.model_name = model_name
            self.device = device
            self.conf_threshold = conf_threshold
            self.load_model()

    def load_model(self):
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model {self.model_name} on device {self.device}...")
            self._model = YOLO(self.model_name)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Ultralytics YOLO: {e}. Fallback to simulated detector if offline.")
            self._model = None

    def detect(self, frame: np.ndarray, frame_number: int, timestamp_sec: float) -> List[Dict[str, Any]]:
        """
        Runs object detection on a single frame.
        Returns list of detections with normalized bounding boxes: [x, y, w, h]
        """
        detections = []
        h, w = frame.shape[:2]

        if self._model is not None:
            try:
                results = self._model.predict(
                    source=frame,
                    device=self.device,
                    conf=self.conf_threshold,
                    classes=list(SUPPORTED_CLASSES.keys()),
                    verbose=False
                )
                
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        cls_name = SUPPORTED_CLASSES.get(cls_id, "object")
                        conf = float(box.conf[0].item())
                        
                        # xyxy coordinates in pixels
                        xyxy = box.xyxy[0].cpu().numpy()
                        x1, y1, x2, y2 = xyxy
                        
                        # Normalize to 0.0 - 1.0
                        bbox_x = max(0.0, float(x1 / w))
                        bbox_y = max(0.0, float(y1 / h))
                        bbox_w = min(1.0, float((x2 - x1) / w))
                        bbox_h = min(1.0, float((y2 - y1) / h))

                        detections.append({
                            "frame_number": frame_number,
                            "timestamp_seconds": timestamp_sec,
                            "class_name": cls_name,
                            "confidence": round(conf, 4),
                            "bbox_x": round(bbox_x, 4),
                            "bbox_y": round(bbox_y, 4),
                            "bbox_w": round(bbox_w, 4),
                            "bbox_h": round(bbox_h, 4),
                            "pixel_coords": (int(x1), int(y1), int(x2), int(y2))
                        })
            except Exception as e:
                logger.error(f"Detection inference error on frame {frame_number}: {e}")
        
        return detections
