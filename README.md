# CIIRS — CCTV Incident Intelligence & Reconstruction System

> **Team:** PANDA  
> **Hackathon:** Zinnovatio 4.0 – Gen Z Innovations Hackathon 2026  
> **Theme:** Smart & Sustainable Cities  
> **Core Principle:** Prevention-First Public Safety & Observational Activity Analysis (Zero demographic/biometric profiling)

---

## 🌟 Overview

**CIIRS** (CCTV Incident Intelligence & Reconstruction System) is an enterprise-grade public safety command centre platform designed for smart city surveillance and emergency response coordination. It combines real-time CCTV monitoring, temporal behaviour intelligence, multi-camera incident reconstruction, and a genuine OpenStreetMap GPS-powered GIS mapping interface for Chandigarh.

### Key Capabilities
- **Command Centre Dashboard:** Real-time surveillance grid, KPI ribbons, CCTV video feeds, ANPR telemetry, and incident timelines.
- **Genuine GPS Chandigarh City Map:** OpenStreetMap street-level tile rendering, actual Chandigarh sector geography, Nominatim geocoding search, and real device GPS navigation tracking (`getCurrentPosition`, `watchPosition`, `clearWatch`).
- **Temporal Behaviour Intelligence:** Observational scene pattern recognition for early warning indicators (unattended baggage, perimeter breach, road accidents, suspicious movement).
- **Multi-Camera Incident Reconstruction:** Synchronized multi-angle temporal alignment and trail tracking across city camera nodes.
- **Vehicle Intelligence (ANPR):** Optical character recognition, license plate search, and vehicle movement history.
- **Emergency Response Coordination:** Automated agency dispatch routing (Police, Medical, Fire) with verification workflows.

---

## 🏗️ System Architecture

- **Backend:** FastAPI (Python 3.11), SQLAlchemy, SQLite (`ciirs.db`), WebSockets, PyTorch temporal sequence inference models.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **GIS / Mapping:** Leaflet 1.9, OpenStreetMap raster street tiles, OpenStreetMap Nominatim geocoding, W3C Geolocation API.
- **Video Delivery:** HTML5 H.264 video streaming with simulated CCTV telemetry and status overlays.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- `uv` (recommended for Python environment management)

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the application locally at `http://localhost:5173`.

### 3. Production Build & Serving
```bash
cd frontend
npm run build
```
The FastAPI backend is pre-configured to mount and serve `frontend/dist` automatically at `http://localhost:8000/`.

---

## 📍 Chandigarh City Map Specifications
- **Map Center:** Latitude `30.7333° N`, Longitude `76.7794° E` (Default Zoom: 13)
- **Base Layer:** OpenStreetMap standard street tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Location Search:** OpenStreetMap Nominatim Geocoding API + pre-indexed gazetteer for key sectors and landmarks.
- **GPS Navigation:** Browser Geolocation API integration with high accuracy, live coordinate badges, soft accuracy circles, and follow-mode camera controls.

---

## 🛡️ Ethical AI & Privacy Compliance
CIIRS is built strictly around **observable scene-level activity indicators**. It does not perform facial recognition, demographic classification, biometric profiling, or predictive criminality scoring. All automated incident signals require human operator verification before official emergency response dispatch.
