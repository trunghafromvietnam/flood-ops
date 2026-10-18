# Demo guide

## Run

```bash
# backend (from backend/)
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# frontend (from frontend/)
npm install
npm run dev        # http://localhost:5173
```

## Live walkthrough

1. `/`: choose **Report an Emergency**.
2. Use **Select on map** and tap a point, or type a place description. Set water level, severity,
   and people (leave empty if unknown). Submit. The confirmation shows the ID the server returned.
3. `/` → **Rescue Operations** → **Continue**. The Overview shows the report in the metrics,
   the activity list and on the map.
4. Gear menu → **Reports** → select the report → **Change status** (confirmation dialog). The
   status history updates from the server.
5. **Drone Evidence** → upload a JPEG with optional coordinates. It appears as `NEEDS_REVIEW`.

## Simulation and replay

The synthetic scenario `qb-kien-giang-v1` (14 events around Kien Giang, Le Thuy and Dong Hoi)
contains form, phone and drone intake, operator status changes and team safety confirmations.
All IDs start with `SIM-`. Nothing in it is a real call, person, image or rescue.

- **Settings → Data mode → Simulation** shows the full scenario. Simulated teams, positions
  (one stale, one missing) and an illustrative flood polygon appear.
- **Settings → Data mode → Replay** starts at event 0. Use **Start**, **Pause**, **Resume**,
  **Next event** and **Reset** in the bar under the header. Playback advances one event every
  2.5 s. The same steps always give the same sequence.
- **Return to live** in the mode bar goes back to the backend. Reloading the page also returns to Live.
- If the backend is down in Live mode, the error bar offers **Switch to simulation**; it never switches on its own.

Simulation and replay are read-only: status changes and uploads are disabled and nothing is sent to the backend.
