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
```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```
- `/` report form (citizen)
- `/admin` dispatcher map
- `/sos` voice call demo page (still mock data)

Vite proxies `/api` to the backend on port 8000 (`frontend/vite.config.js`), so start the backend first.

Extra backend setup used by the frontend and voice:
```bash
cd backend
pip install python-multipart       # needed for photo uploads
cp .env.example .env               # then fill in RETELL_API_KEY (ask the team privately)
python seed.py                     # optional: load 8 demo cases (FO-xxxx)
uvicorn app.main:app --reload --port 8000 --env-file .env
```
If you pull a change that adds a column to a model (e.g. `phone`), delete `backend/floodops.db`
and run again (SQLite tables are not migrated automatically).

Endpoints added for the frontend and voice:
```
GET  /api/incidents/{id}/events    status history
POST /api/voice/retell/webhook     Retell call events (signed with RETELL_API_KEY)
```

#### Voice (phone calls)
Flow: caller dials the Photon number (+1 425 264 4623) -> Photon forwards the call over SIP
to the Retell voice agent -> after the call Retell sends a `call_analyzed` webhook to
`POST /api/voice/retell/webhook` -> the backend creates a `PHONE_CALL` incident (red marker)
and geocodes the spoken address.

To receive calls on your machine:
1. Put `RETELL_API_KEY` in `backend/.env` and start the backend as above.
2. Expose the backend: `ngrok http 8000` and copy the `https://...ngrok-free.dev` URL.
3. In the Retell agent, set **Webhook URL** to `https://<ngrok-url>/api/voice/retell/webhook`.
4. Call the number, hang up, and watch `/admin` (requests are visible at http://localhost:4040).

Only one machine can receive calls at a time: the one whose ngrok URL is in Retell.
The free ngrok URL changes every time ngrok restarts, so update Retell when it does.

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

