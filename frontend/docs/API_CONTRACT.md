# FloodOps API contract (as used by the frontend)

Verified against `backend/app/main.py`, `backend/app/models/*.py` and `backend/voice/webhook.py`
on 2026-10-18 (branch `backend`, commit `c6caf0d`), and exercised against a running backend.
The frontend only calls the routes listed here. All calls go through `src/api/floodops.js`.

## General

- Base URL: same origin by default; `VITE_API_BASE_URL` overrides it. In development Vite proxies
  `/api` to `http://127.0.0.1:8000`.
- **Authentication: none.** No route checks identity or permissions. CORS allows
  `http://localhost:5173` and `http://127.0.0.1:5173`, methods GET/POST/PATCH, header `Content-Type`.
- Errors are FastAPI style: `{"detail": "text"}` (HTTPException) or
  `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` (validation, 422).
- **Timestamps** are UTC. Records read back from SQLite have no timezone suffix
  (`2026-10-18T15:43:25.693168`); freshly created records may include `Z`. The client treats both as UTC.
- No pagination, filtering or sorting parameters exist on any list route.

## Records

### Incident
| Field | Type | Notes |
|---|---|---|
| `id` | string | `INC-xxxxxxxx` (web form), `OBS-xxxxxxxx` (drone), `CALL-xxxxxxxx` (phone), or seeded IDs |
| `description` | string | `""` when none was given |
| `people_count` | int \| null | `>= 0`; null = unknown |
| `phone` | string \| null | call-back number |
| `reporter_type` | string | `SELF`, `THIRD_PARTY` (web form), `PHONE_CALL` (voice webhook), `DRONE` (drone ingestion) |
| `status` | string | one of `NEW`, `NEEDS_REVIEW`, `VERIFIED`, `ASSIGNED`, `RESOLVED`, `REJECTED`, `DUPLICATE` |
| `latitude`, `longitude` | float \| null | always both or neither |
| `location_method` | string \| null | `GPS`, `MAP_PIN`, `MANUAL`, `DRONE_ESTIMATE`, `VOICE`, `UNKNOWN` (free string on input) |
| `address_text` | string \| null | |
| `created_at`, `updated_at` | datetime | `created_at` is the time the server received the report |

### IncidentEvent (status history)
`id` int, `incident_id`, `previous_status` (null for the creation event), `new_status`, `note`, `created_at`.

### Evidence
`id` int, `incident_id`, `filename`, `content_type`, `storage_key` (server file path; not shown in the UI), `created_at`.

## Routes used

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/api/health` | – | 200 `{"status":"ok"}` | – |
| POST | `/api/reports` | JSON `ReportCreate` (below) | 201 Incident (`status` `NEW`) | 422 validation, 422 `"Provide coordinates or address_text"` |
| GET | `/api/incidents` | – | 200 Incident[] (all) | – |
| GET | `/api/incidents/{id}` | – | 200 Incident | 404 |
| PATCH | `/api/incidents/{id}/status` | JSON `{status, note?}` | 200 Incident; history event recorded | 400 invalid status, 404 |
| GET | `/api/incidents/{id}/events` | – | 200 IncidentEvent[] oldest first | 404 |
| GET | `/api/incidents/{id}/evidence` | – | 200 Evidence[] | 404 |
| POST | `/api/incidents/{id}/evidence` | multipart `file` (jpeg/png/webp) | 201 `{id, filename, incident_id}` | 400 type, 404 |
| POST | `/api/drone/observations` | multipart `file`, optional `latitude`, `longitude`, `platform`, `note` | 201 `{id, status:"NEEDS_REVIEW", received_at, platform, has_coordinates, evidence_filename, message}` | 400 type, 422 coordinates |

`ReportCreate`:
```json
{
  "reporter_type": "SELF | THIRD_PARTY",
  "description": "string ≤ 2000 | null",
  "people_count": "int ≥ 0 | null",
  "phone": "^\\+?[0-9 ().-]{6,31}$ | null",
  "location": { "latitude": null, "longitude": null, "method": "GPS | MAP_PIN | MANUAL", "address_text": null }
}
```
Unknown JSON fields are silently ignored by the backend, so the frontend never sends any.

Status transitions: the backend accepts **any** allowed status from any status. The UI offers all
statuses except the current one and asks for confirmation; it does not invent a workflow.

## Routes that exist but the frontend does not call

- `GET /api/map/items` — duplicates `/api/incidents` filtered to records with coordinates; the client filters itself.
- `POST /api/voice/retell/webhook` — server-to-server (Retell), signed.

## Missing capabilities (not implemented by the backend)

The frontend shows these as unavailable rather than inventing them:

| Capability | Effect in the UI |
|---|---|
| Authentication / authorization | Access page states that access is not enforced; no credential form |
| Rescue teams, positions, assignments | Teams view shows "no data source" in Live mode; team metrics "Not available" |
| Safety confirmations | Category empty in Live mode; "Confirmed safe today" metric "Not available" |
| Severity and water-level fields | Collected on the report form and written as labelled lines at the start of `description` |
| Serving stored image files | Evidence viewer shows file metadata only; "preview unavailable" |
| Drone capture time, mission ID | Shown as "Not recorded by the backend" (platform is parsed from the intake event note) |
| Global event history / push updates (SSE, WebSocket) | Activity Log loads `/events` per incident; data is refreshed by polling (15/30/60 s) |
| Notifications | No notification control is shown |
| Flood extent, shelters, infrastructure, weather data | Layers listed as "No data source" |
| Pagination / server-side filters | All filtering is client-side on the full list |
