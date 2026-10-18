# FloodOps frontend architecture

## Stack decision

The repository already used **React 18 + Vite 5 + react-router 6**. The redesign keeps that stack
instead of rewriting to vanilla JavaScript: rewriting would discard working integrations and buy
nothing the spec needs. The spec's module boundaries are applied inside `src/`.

Added dependencies: `maplibre-gl` (map), `lucide-react` (outline icons). Dev: `vitest`,
`@testing-library/*`, `jsdom`.

## Routes

| Path | View | Notes |
|---|---|---|
| `/` | Landing | Two actions: report, operations |
| `/report` | Public emergency report | Always talks to the live backend |
| `/access` | Access step | States that access is not enforced (no backend auth) |
| `/ops` | Overview | Shell: header, gear menu, mode bar |
| `/ops/reports` | Reports | Filters kept in the URL |
| `/ops/map` | Live Map | `?incident=` focuses, `?place=` geocodes |
| `/ops/teams` | Rescue Teams | `?team=` selects |
| `/ops/drone` | Drone Evidence | Upload in Live mode |
| `/ops/activity` | Activity Log | |
| `/ops/settings` | Settings | Mode, local preferences, connection info |
| `/admin/*`, `/sos` | Redirects | Earlier URLs |

The selected incident/team lives in the URL (`?incident=ID`, `?team=ID`). The gear menu carries it
between views, and Back/Forward restore it. No view keeps its own copy of server records.

## Modules (`src/`)

| Module | Responsibility |
|---|---|
| `config.js` | Build-time settings (API base URL, map style, geocoder). No secrets. |
| `api/client.js` | `fetch` wrapper: timeout, cancellation, `ApiError` with user-safe messages |
| `api/contracts.js` | Enum values and record normalisation, taken from the backend source |
| `api/floodops.js` | One function per backend route; the only place API paths appear |
| `api/geocoder.js` | Nominatim place search, rate-limited, used only to move the map |
| `lib/validation.js` | Form, coordinate, people-count, phone, image validation; report payload builder |
| `lib/formatters.js` | Dates, status/source/method labels, coordinates |
| `lib/derive.js` | Metrics, activity events, team freshness, search matching (pure) |
| `state/OpsData.jsx` | Operating mode, live polling, simulation/replay snapshots, status action |
| `state/selection.js` | URL-based selection, safe Back |
| `state/preferences.js` | Local preferences in `localStorage` |
| `map/MapView.jsx` | The only map component: lifecycle, sources, selection, focus, controls |
| `map/mapLayers.js` | GeoJSON builders and layer definitions (pure, tested without WebGL) |
| `map/mapConfig.js` | Region extent, fallback style |
| `demo/scenario.js` | Deterministic synthetic scenario + replay reducer |
| `components/` | Header, gear menu, mode bar, incident detail, activity list, overlays, dialogs |
| `pages/`, `pages/ops/` | Page modules |
| `styles/` | `tokens`, `base`, `components`, `layout`, `map`, `responsive` |

## Data integrity rules (enforced in code)

1. **Live** data comes only from the backend. On failure the mode bar shows the error; the last
   good data stays visible and is marked stale. There is no automatic switch to simulation; the
   user must press "Switch to simulation".
2. **Simulation / Replay** data comes only from `demo/scenario.js` (IDs start with `SIM-`). It is
   read-only: status changes and uploads are disabled, and nothing is sent to the backend.
   A `SIMULATION`/`REPLAY` label is always visible in the header and mode bar.
3. Records without valid coordinates never become map features; they stay in lists marked
   "Location unresolved". Selecting such an event opens its details without moving the map.
4. Success messages appear only after a successful response, with the server-issued ID.
5. Reported values (people count, description, location) are labelled as reported. Verification is
   derived from workflow status (`VERIFIED`/`ASSIGNED` = "Verified by operator").
6. Status changes need confirmation and are reconciled by re-fetching the list.

## Overview metrics

| Metric | Definition | Live availability |
|---|---|---|
| New reports | Incidents with status `NEW` | yes |
| Awaiting review | Incidents with status `NEEDS_REVIEW` | yes |
| People reported | Sum of `people_count` on open incidents (not `RESOLVED`/`REJECTED`/`DUPLICATE`); count of open incidents with unknown count shown separately | yes |
| Confirmed safe today | Sum of people in safety-confirmation events | No (no backend data) |
| Active rescue teams | Teams whose status is not `OFF_DUTY` | No (no backend data) |

## Map

- **Library:** MapLibre GL JS 6 (WebGL, vector tiles). The worker URL is set explicitly
  (`setWorkerUrl`) because Vite's dependency pre-bundling breaks MapLibre's default lookup.
- **Base map:** OpenFreeMap "liberty" style (OpenMapTiles schema, © OpenStreetMap contributors).
  Free and keyless; attribution is shown by the attribution control. Configure `VITE_MAP_STYLE_URL`
  for a provider with a service agreement before production use.
- **Region:** the initial and reset view is an approximate bounding box of historical (pre-2025)
  Quang Binh: lon 105.6–107.15, lat 16.9–18.15. **No administrative boundary dataset is loaded**, so
  the map does not draw the historical province boundary or separate it from current Quang Tri
  administration. Adding one requires a dated, licensed boundary dataset.
- **Layers:** incidents (clustered, coloured by status; drone observations have a navy ring),
  rescue teams (filled = position current ≤ 15 min, hollow = stale), flood extent, and the report
  point. Shelters, infrastructure and weather layers are listed as "No data source".
- **Flood polygons** exist only in the simulation scenario and are labelled "Illustrative polygon.
  Not observed, measured or forecast."
- **Tile failure:** if the style cannot load, a blank fallback style is used and operational layers
  keep working; a banner reports the problem.
- **Place search:** OpenStreetMap Nominatim, triggered by the user only (no autocomplete), at most
  one request per second, biased to the region. Results move the map. On the report form the user
  must still tap the exact point; a geocoded result is never submitted as a position.

## Responsive behaviour

- ≥ 1200 px: header + 380 px panel + map.
- 768–1199 px: 330 px panel; the activity log can be collapsed; detail drawers narrow.
- < 768 px: header wraps (search on its own row); the map comes first (55 vh) and panels stack
  below it; the map drawer becomes a bottom sheet; touch targets are at least 40 px.
- `prefers-reduced-motion` disables transitions and the loading spinner animation.
