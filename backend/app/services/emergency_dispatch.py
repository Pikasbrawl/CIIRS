from datetime import datetime
from typing import Dict, Any, Optional

class EmergencyDispatchService:
    VALID_STATUSES = [
        "PENDING_APPROVAL",
        "APPROVED",
        "DISPATCHED",
        "ACKNOWLEDGED",
        "EN_ROUTE",
        "ON_SCENE",
        "CLOSED"
    ]

    AGENCY_RECOMMENDATIONS = {
        "Crowd Surge": ("POLICE", "2 Rapid Response Units & Crowd Control"),
        "Physical Altercation Indicators": ("POLICE", "1 Armed/Patrol Unit & Sector Supervisor"),
        "Sudden Running": ("POLICE", "1 Perimeter Patrol Unit"),
        "Fall Detection": ("MEDICAL", "1 Advanced Life Support Ambulance (ALS)"),
        "Possible Medical Distress": ("MEDICAL", "1 Paramedic First Responder + ALS Unit"),
        "Unattended Object": ("POLICE", "Bomb Disposal / Canine Sweep Assessment Team"),
        "Restricted-Area Entry": ("POLICE", "Facility Security Rapid Intercept Unit"),
        "Unusual Movement": ("POLICE", "1 Mobile Patrol Unit"),
        "Fire Indicator": ("FIRE_AND_RESCUE", "1 Fire Engine + HAZMAT Assessment"),
        "Multi-Casualty Event": ("MULTI_AGENCY", "Police Tactical + Medical Mobile Clinic + Fire")
    }

    @staticmethod
    def get_recommendation_for_event(event_category: str) -> tuple[str, str]:
        return EmergencyDispatchService.AGENCY_RECOMMENDATIONS.get(
            event_category,
            ("POLICE", "1 Standard Patrol Unit")
        )

    @staticmethod
    def transition_dispatch_status(current_status: str, next_status: str) -> bool:
        """Enforce strict dispatch lifecycle state machine."""
        order = {
            "PENDING_APPROVAL": 0,
            "APPROVED": 1,
            "DISPATCHED": 2,
            "ACKNOWLEDGED": 3,
            "EN_ROUTE": 4,
            "ON_SCENE": 5,
            "CLOSED": 6
        }
        curr_idx = order.get(current_status, -1)
        next_idx = order.get(next_status, -1)
        return next_idx > curr_idx or next_status == "CLOSED"

emergency_dispatch_service = EmergencyDispatchService()
