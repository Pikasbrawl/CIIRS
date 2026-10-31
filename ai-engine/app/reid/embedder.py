import cv2
import numpy as np
import logging
from typing import List, Tuple, Optional
import torch
import torch.nn as nn
import torchvision.transforms as T

logger = logging.getLogger("ciirs.reid")

class LightweightReIDNet(nn.Module):
    """
    Lightweight 512-dimensional person appearance feature extractor
    designed for high throughput and low memory footprint on Apple M4.
    """
    def __init__(self, embedding_dim: int = 512):
        super(LightweightReIDNet, self).__init__()
        try:
            import torchvision.models as models
            # Use MobileNetV3-Small backbone for ultra-fast Re-ID feature extraction
            mobilenet = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
            self.backbone = mobilenet.features
            self.pool = nn.AdaptiveAvgPool2d((1, 1))
            self.fc = nn.Linear(576, embedding_dim)
            self.bn = nn.BatchNorm1d(embedding_dim)
        except Exception as e:
            logger.warning(f"Using standard CNN backbone for Re-ID: {e}")
            self.backbone = nn.Sequential(
                nn.Conv2d(3, 32, 3, stride=2, padding=1),
                nn.ReLU(),
                nn.Conv2d(32, 64, 3, stride=2, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d((4, 4))
            )
            self.pool = nn.AdaptiveAvgPool2d((1, 1))
            self.fc = nn.Linear(64, embedding_dim)
            self.bn = nn.BatchNorm1d(embedding_dim)

    def forward(self, x):
        feat = self.backbone(x)
        feat = self.pool(feat)
        feat = torch.flatten(feat, 1)
        emb = self.fc(feat)
        emb = self.bn(emb)
        # L2 normalize
        norm_emb = nn.functional.normalize(emb, p=2, dim=1)
        return norm_emb

class ReIDEmbedder:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ReIDEmbedder, cls).__new__(cls)
        return cls._instance

    def __init__(self, device: str = "cpu"):
        if not hasattr(self, "initialized"):
            self.device = device
            self.model = LightweightReIDNet(embedding_dim=512)
            self.model.to(self.device)
            self.model.eval()

            # Re-ID standard input dimensions: 256 height x 128 width
            self.transform = T.Compose([
                T.ToPILImage(),
                T.Resize((256, 128)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            self.initialized = True
            logger.info(f"Re-ID Appearance Embedder initialized on {self.device}")

    def extract_crop(self, frame: np.ndarray, bbox: List[float]) -> Optional[np.ndarray]:
        """
        Extracts image crop from frame given normalized bbox [x, y, w, h]
        """
        h, w = frame.shape[:2]
        x1 = max(0, int(bbox[0] * w))
        y1 = max(0, int(bbox[1] * h))
        x2 = min(w, int((bbox[0] + bbox[2]) * w))
        y2 = min(h, int((bbox[1] + bbox[3]) * h))

        if x2 <= x1 or y2 <= y1:
            return None

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
            return None

        return crop

    def compute_embedding(self, crop: np.ndarray) -> List[float]:
        """
        Extracts 512-dimensional L2-normalized appearance vector from a person crop
        """
        try:
            # Convert BGR to RGB
            rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            tensor = self.transform(rgb_crop).unsqueeze(0).to(self.device)
            with torch.no_grad():
                emb = self.model(tensor)
                emb_list = emb.cpu().squeeze(0).numpy().tolist()
                return [round(float(x), 5) for x in emb_list]
        except Exception as e:
            logger.error(f"Error computing Re-ID embedding: {e}")
            # Color histogram fallback normalized to 512 dims
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256])
            norm_hist = cv2.normalize(hist, hist).flatten()
            return [round(float(x), 5) for x in norm_hist.tolist()]

    @staticmethod
    def compute_similarity(emb1: List[float], emb2: List[float]) -> float:
        """
        Cosine similarity between two normalized vectors
        """
        v1 = np.array(emb1, dtype=np.float32)
        v2 = np.array(emb2, dtype=np.float32)
        dot = np.dot(v1, v2)
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 == 0 or n2 == 0:
            return 0.0
        return float(dot / (n1 * n2))
