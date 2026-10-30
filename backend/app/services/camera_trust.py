import numpy as np
from datetime import datetime
from typing import Dict, Any, List

class CameraTrustService:
    @staticmethod
    def evaluate_stream_health(
        ping_ms: float,
        fps_actual: float,
        fps_nominal: float = 30.0,
        dropped_frames: int = 0,
        frozen_frames: int = 0,
        obstruction_score: float = 0.0,
        is_tampered: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates a technical reliability score (0 - 100) based on
        measurable physical stream integrity parameters.
        """
        # Baseline score: 100 points
        score = 100.0
        degradation_reasons = []

        # 1. Ping / Latency penalty
        if ping_ms > 120.0:
            penalty = min(20.0, (ping_ms - 120.0) * 0.15)
            score -= penalty
            degradation_reasons.append(f"High network latency ({ping_ms:.1f}ms)")
        elif ping_ms > 60.0:
            score -= 5.0

        # 2. Frame rate variance penalty
        fps_ratio = fps_actual / max(1.0, fps_nominal)
        if fps_ratio < 0.70:
            penalty = min(25.0, (1.0 - fps_ratio) * 35.0)
            score -= penalty
            degradation_reasons.append(f"Frame rate degradation ({fps_actual:.1f} / {fps_nominal:.0f} FPS)")

        # 3. Dropped frames penalty
        if dropped_frames > 5:
            penalty = min(20.0, dropped_frames * 1.5)
            score -= penalty
            degradation_reasons.append(f"Packet loss: {dropped_frames} frames dropped")

        # 4. Frozen frames penalty
        if frozen_frames > 2:
            penalty = min(30.0, frozen_frames * 5.0)
            score -= penalty
            degradation_reasons.append(f"Stream stall: {frozen_frames} consecutive frozen frames")

        # 5. Physical obstruction penalty (e.g. lens spray, cover, blur)
        if obstruction_score > 0.35:
            penalty = min(35.0, obstruction_score * 40.0)
            score -= penalty
            degradation_reasons.append(f"Visual obstruction detected ({obstruction_score*100:.0f}% field obscured)")

        # 6. Video tampering flag
        if is_tampered:
            score -= 40.0
            degradation_reasons.append("Critical: Stream integrity mismatch or unauthorized re-encoding")

        final_trust = float(np.clip(score, 0.0, 100.0))
        
        # Determine operational status tier
        if final_trust >= 85.0:
            status = "HEALTHY"
            trust_grade = "HIGH_TRUST"
        elif final_trust >= 60.0:
            status = "DEGRADED"
            trust_grade = "MODERATE_TRUST"
        else:
            status = "UNRELIABLE"
            trust_grade = "LOW_TRUST"

        requires_technical_review = final_trust < 70.0

        return {
            "trust_score": round(final_trust, 1),
            "trust_grade": trust_grade,
            "status": status,
            "requires_technical_review": requires_technical_review,
            "degradation_reasons": degradation_reasons if degradation_reasons else ["Nominal stream telemetry"],
            "metrics": {
                "ping_ms": round(ping_ms, 1),
                "fps_actual": round(fps_actual, 1),
                "dropped_frames": dropped_frames,
                "frozen_frames": frozen_frames,
                "obstruction_score": round(obstruction_score, 2),
                "tampering_detected": is_tampered
            },
            "timestamp": datetime.utcnow().isoformat()
        }

camera_trust_service = CameraTrustService()
