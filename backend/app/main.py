from uuid import uuid4
from datetime import datetime, timezone
from pathlib import Path
import shutil

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session, select
from typing import Optional

from app.db.session import create_db_and_tables, get_session
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.evidence import Evidence

app = FastAPI(
    title="FloodOps API",
    description="Incident coordination and evidence ingestion for flood response.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
def on_startup():
    """Create database tables on application start."""
    create_db_and_tables()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LocationInput(BaseModel):
    """Geographic location. Coordinates are optional if address_text is provided."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    method: str = "UNKNOWN"  # GPS | MAP_PIN | MANUAL | DRONE_ESTIMATE | UNKNOWN
    address_text: Optional[str] = None

    @model_validator(mode="after")
    def check_coords(self):
        lat, lon = self.latitude, self.longitude
        if (lat is None) != (lon is None):
            raise ValueError("latitude and longitude must both be present or both be null")
        if lat is not None and not (-90 <= lat <= 90):
            raise ValueError("latitude out of range")
        if lon is not None and not (-180 <= lon <= 180):
            raise ValueError("longitude out of range")
        return self


class ReportCreate(BaseModel):
    """Payload for a human distress report (citizen or third party)."""
    description: Optional[str] = Field(default=None, max_length=2000)
    people_count: Optional[int] = Field(default=None, ge=0)
    reporter_type: str = Field(default="SELF", pattern="^(SELF|THIRD_PARTY)$")
    location: Optional[LocationInput] = None


class StatusUpdate(BaseModel):
    """Request body to change an incident's workflow status."""
    status: str
    note: Optional[str] = None


ALLOWED_STATUSES = {
    "NEW", "NEEDS_REVIEW", "VERIFIED", "ASSIGNED",
    "RESOLVED", "REJECTED", "DUPLICATE"
}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    """Liveness check. Returns 200 if the service is running."""
    return {"status": "ok"}


@app.post("/api/reports", status_code=201)
def create_report(report: ReportCreate, session: Session = Depends(get_session)):
    """
    Create a new incident from a human report.
    Accepts SELF or THIRD_PARTY reporter.
    Location may be coordinates, address text, or both.
    Always creates an IncidentEvent recording the creation.
    """
    incident_id = f"INC-{uuid4().hex[:8].upper()}"

    lat = lon = method = address = None
    if report.location:
        lat = report.location.latitude
        lon = report.location.longitude
        method = report.location.method
        address = report.location.address_text

    if lat is None and not address:
        raise HTTPException(
            status_code=422,
            detail="Provide coordinates or address_text"
        )

    incident = Incident(
        id=incident_id,
        description=report.description or "",
        people_count=report.people_count,
        reporter_type=report.reporter_type,
        status="NEW",
        latitude=lat,
        longitude=lon,
        location_method=method,
        address_text=address,
    )
    session.add(incident)

    event = IncidentEvent(
        incident_id=incident_id,
        previous_status=None,
        new_status="NEW",
        note="Incident created from human report",
    )
    session.add(event)
    session.commit()
    session.refresh(incident)
    return incident


@app.get("/api/incidents")
def list_incidents(session: Session = Depends(get_session)):
    """Return all incidents. Suitable for a responder dashboard list."""
    return session.exec(select(Incident)).all()


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, session: Session = Depends(get_session)):
    """Return a single incident by ID. 404 if not found."""
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.patch("/api/incidents/{incident_id}/status")
def update_status(
    incident_id: str,
    body: StatusUpdate,
    session: Session = Depends(get_session),
):
    """
    Update an incident's status and record the change in IncidentEvent history.
    Only allowed status values are accepted.
    """
    if body.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {ALLOWED_STATUSES}"
        )

    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    previous = incident.status
    incident.status = body.status
    incident.updated_at = datetime.now(timezone.utc)

    event = IncidentEvent(
        incident_id=incident_id,
        previous_status=previous,
        new_status=body.status,
        note=body.note,
    )
    session.add(event)
    session.add(incident)
    session.commit()
    session.refresh(incident)
    return incident


@app.post("/api/incidents/{incident_id}/evidence", status_code=201)
async def upload_evidence(
    incident_id: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    """
    Attach an image to an existing incident.
    Accepts JPEG, PNG, WEBP. Stores the file and creates an Evidence record.
    """
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP allowed")

    safe_name = f"{incident_id}_{uuid4().hex[:8]}_{file.filename}"
    dest = UPLOAD_DIR / safe_name

    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    evidence = Evidence(
        incident_id=incident_id,
        filename=file.filename,
        content_type=file.content_type,
        storage_key=str(dest),
    )
    session.add(evidence)
    session.commit()
    session.refresh(evidence)
    return {
        "id": evidence.id,
        "filename": evidence.filename,
        "incident_id": incident_id,
    }


@app.get("/api/incidents/{incident_id}/evidence")
def list_evidence(incident_id: str, session: Session = Depends(get_session)):
    """Return all evidence records attached to an incident."""
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return session.exec(
        select(Evidence).where(Evidence.incident_id == incident_id)
    ).all()


# ---------------------------------------------------------------------------
# Drone observation ingestion
# Any drone or adapter that can POST multipart data can use this endpoint.
# ---------------------------------------------------------------------------

@app.post("/api/drone/observations", status_code=201)
async def ingest_drone_observation(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    platform: Optional[str] = Form(None),
    note: Optional[str] = Form(None),
    session: Session = Depends(get_session),
):
    """
    Ingest an aerial image from a rescue drone or compatible platform.

    Contract (any drone can implement this):
    - file: the captured image (JPEG/PNG/WEBP)
    - latitude, longitude: estimated position from the drone's GPS at capture time
      (optional; if missing or invalid, observation is stored but not map-ready)
    - platform: free-text identifier of the drone or adapter (e.g. "DJI-Mavic-3", "PX4-SITL")
    - note: optional free text

    Server behavior:
    - Records received_at as the moment the request arrives.
    - Stores the image as Evidence.
    - Creates a DroneObservation-style record (currently stored as an Incident
      with reporter_type="DRONE" and status="NEEDS_REVIEW" for simplicity in MVP).
    - Does not invent coordinates. Does not claim AI analysis has run.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP allowed")

    # Validate coordinates if provided
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="latitude and longitude must both be present or both be null"
        )
    if latitude is not None and not (-90 <= latitude <= 90):
        raise HTTPException(status_code=422, detail="latitude out of range")
    if longitude is not None and not (-180 <= longitude <= 180):
        raise HTTPException(status_code=422, detail="longitude out of range")

    received_at = datetime.now(timezone.utc)
    obs_id = f"OBS-{uuid4().hex[:8].upper()}"

    # Store image
    safe_name = f"{obs_id}_{uuid4().hex[:8]}_{file.filename}"
    dest = UPLOAD_DIR / safe_name
    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create an incident representing the drone observation
    # (MVP simplification: reuse Incident table with clear provenance)
    incident = Incident(
        id=obs_id,
        description=note or f"Drone observation from {platform or 'unknown platform'}",
        people_count=None,
        reporter_type="DRONE",
        status="NEEDS_REVIEW",
        latitude=latitude,
        longitude=longitude,
        location_method="DRONE_ESTIMATE" if latitude is not None else "UNKNOWN",
        address_text=None,
    )
    session.add(incident)

    evidence = Evidence(
        incident_id=obs_id,
        filename=file.filename,
        content_type=file.content_type,
        storage_key=str(dest),
    )
    session.add(evidence)

    event = IncidentEvent(
        incident_id=obs_id,
        previous_status=None,
        new_status="NEEDS_REVIEW",
        note=f"Drone observation received. Platform={platform or 'unknown'}. Received at {received_at.isoformat()}",
    )
    session.add(event)

    session.commit()
    session.refresh(incident)

    return {
        "id": obs_id,
        "status": "NEEDS_REVIEW",
        "received_at": received_at.isoformat(),
        "platform": platform,
        "has_coordinates": latitude is not None,
        "evidence_filename": file.filename,
        "message": "Observation stored. Awaiting human review. No AI inference has been run.",
    }

@app.get("/api/map/items")
def map_items(session: Session = Depends(get_session)):
    """
    Return items suitable for map display.
    Only incidents/observations that have both latitude and longitude are included.
    Each item has an explicit kind so the frontend can style them differently.
    """
    incidents = session.exec(select(Incident)).all()

    items = []
    for inc in incidents:
        if inc.latitude is None or inc.longitude is None:
            continue

        kind = "DRONE_OBSERVATION" if inc.reporter_type == "DRONE" else "INCIDENT"

        items.append({
            "id": inc.id,
            "kind": kind,
            "status": inc.status,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "location_method": inc.location_method,
            "description": inc.description,
            "reporter_type": inc.reporter_type,
            "people_count": inc.people_count,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
        })

    return items