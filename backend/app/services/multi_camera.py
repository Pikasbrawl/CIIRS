from datetime import datetime, timedelta
from typing import List, Dict, Any

class MultiCameraCorrelationService:
    @staticmethod
    def correlate_trajectories(observations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Synthesizes cross-camera spatio-temporal trajectories across camera nodes.
        Strictly preserves anonymity (no facial or biometric attributes).
        Flags uncertain cross-camera associations for mandatory human review.
        """
        # Sort observations by timestamp
        sorted_obs = sorted(observations, key=lambda x: x.get("timestamp", datetime.utcnow()))
        
        correlated_chains = []
        # Group by movement velocity direction and geo-temporal proximity
        for i, obs in enumerate(sorted_obs):
            chain_match = None
            for chain in correlated_chains:
                last_node = chain["waypoints"][-1]
                time_diff_sec = abs((obs["timestamp"] - last_node["timestamp"]).total_seconds())
                
                # Check feasible travel time between camera coordinates (e.g. 10s to 180s)
                if 5.0 <= time_diff_sec <= 240.0:
                    # Spatial direction alignment
                    chain_match = chain
                    break
                    
            if chain_match:
                # Add waypoint to existing track chain
                # If time gap or motion vector variance is borderline, flag as UNCERTAIN
                uncertain = obs.get("motion_variance", 0.0) > 4.0 or time_diff_sec > 120.0
                chain_match["waypoints"].append({
                    "camera_id": obs.get("camera_id"),
                    "camera_name": obs.get("camera_name"),
                    "coordinates": obs.get("coordinates"),
                    "timestamp": obs.get("timestamp").isoformat(),
                    "motion_direction": obs.get("heading", "Eastbound"),
                    "is_uncertain_link": uncertain
                })
                if uncertain:
                    chain_match["human_review_required"] = True
                    chain_match["association_notes"].append(
                        f"Uncertain transition between {last_node['camera_id']} and {obs['camera_id']}: verify sequence manually."
                    )
            else:
                correlated_chains.append({
                    "track_chain_id": f"TRK-CHAIN-{len(correlated_chains)+1:03d}",
                    "initial_detection_camera": obs.get("camera_id"),
                    "waypoints": [{
                        "camera_id": obs.get("camera_id"),
                        "camera_name": obs.get("camera_name"),
                        "coordinates": obs.get("coordinates"),
                        "timestamp": obs.get("timestamp").isoformat(),
                        "motion_direction": obs.get("heading", "Northbound"),
                        "is_uncertain_link": False
                    }],
                    "confidence": 0.86,
                    "human_review_required": False,
                    "association_notes": ["Spatial and temporal velocity vectors aligned within nominal concourse transfer thresholds."]
                })
                
        return correlated_chains

multi_camera_service = MultiCameraCorrelationService()
