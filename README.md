# FloodOps

Flood-rescue coordination prototype. Citizens and third parties submit distress reports. Rescue teams can upload drone imagery. Responders review incidents on a map and update status.

This is a hackathon prototype. It is not an operational emergency service. Use synthetic data for demos.

## Quick start

### Backend
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
API docs: http://127.0.0.1:8000/docs
```

### Frontend


## Main API Endpoints
```bash
POST /api/reports — create incident from human report
GET /api/incidents — list all
GET /api/incidents/{id} — detail
PATCH /api/incidents/{id}/status — update status
POST /api/incidents/{id}/evidence — attach image
POST /api/drone/observations — ingest drone image + optional GPS
GET /api/map/items — items with valid coordinates for map
```

## Limitations
- No authentication
- In-memory/SQLite only
- Drone images are stored and displayed; no production AI inference is claimed
- Not for real emergency use

