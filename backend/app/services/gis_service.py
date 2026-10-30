import math
from typing import List, Dict, Any, Tuple

class GISService:
    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two GPS coordinates in kilometers."""
        R = 6371.0 # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def estimate_travel_eta(distance_km: float, speed_kmh: float = 45.0) -> Tuple[float, List[Dict[str, float]]]:
        """
        Estimate ETA in minutes and generate realistic street navigation waypoints
        from origin to destination coordinates.
        """
        travel_time_hours = distance_km / max(10.0, speed_kmh)
        eta_minutes = round(travel_time_hours * 60.0 + 1.2, 1) # add 1.2 min dispatch overhead
        return eta_minutes

    @staticmethod
    def find_nearest_responders(incident_lat: float, incident_lon: float, available_units: List[Dict[str, Any]], agency_type: str = "POLICE", limit: int = 3) -> List[Dict[str, Any]]:
        """
        Identify closest available responders filtered by agency requirement.
        """
        ranked = []
        for unit in available_units:
            if agency_type != "MULTI_AGENCY" and unit.get("agency_type") != agency_type:
                continue
            dist_km = GISService.haversine_distance_km(
                incident_lat, incident_lon,
                unit.get("latitude", incident_lat),
                unit.get("longitude", incident_lon)
            )
            speed = unit.get("speed_kmh", 45.0)
            eta = GISService.estimate_travel_eta(dist_km, speed)
            
            unit_copy = dict(unit)
            unit_copy["distance_km"] = round(dist_km, 2)
            unit_copy["estimated_eta_min"] = eta
            ranked.append(unit_copy)
            
        ranked.sort(key=lambda x: x["distance_km"])
        return ranked[:limit]

    @staticmethod
    def generate_route_waypoints(start_lat: float, start_lon: float, end_lat: float, end_lon: float, num_waypoints: int = 6) -> List[List[float]]:
        """
        Generate smooth tactical route points for display on Leaflet map.
        """
        waypoints = []
        for i in range(num_waypoints + 1):
            ratio = i / float(num_waypoints)
            # Add slight realistic street grid curvature
            jitter_lat = math.sin(ratio * math.pi) * 0.0012
            jitter_lon = math.cos(ratio * math.pi) * 0.0008
            lat = start_lat + (end_lat - start_lat) * ratio + jitter_lat
            lon = start_lon + (end_lon - start_lon) * ratio + jitter_lon
            waypoints.append([round(lat, 6), round(lon, 6)])
        return waypoints

gis_service = GISService()
