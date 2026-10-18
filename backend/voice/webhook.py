"""
Phone-call intake: Photon number -> Retell voice agent -> this webhook.

Retell POSTs call events here. When a call has been analysed (`call_analyzed`)
we create a PHONE_CALL incident. The agent's post-call extraction fields match
the Incident columns: address_text, people_count, description, phone.

Mounted in app/main.py with app.include_router(voice_router).

Env:
    RETELL_API_KEY         Retell API key (webhook badge), used to verify signatures.
    RETELL_ALLOW_UNSIGNED  Set to "1" to skip verification for local testing only.
"""

import hashlib
import hmac
import json
import os
import re
import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.db.session import engine
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from voice.geocode import geocode

router = APIRouter(prefix="/api/voice", tags=["voice"])

SIGNATURE_PATTERN = re.compile(r"v=(\d+),d=([0-9a-fA-F]+)")
SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000
PHONE_PATTERN = re.compile(r"^\+?[0-9 ().-]{6,31}$")


def verify_signature(raw_body: str, header: Optional[str], api_key: str) -> bool:
    """
    Retell signs webhooks as "v={timestamp_ms},d={hex}" where
    hex = HMAC-SHA256(raw_body + timestamp, api_key).
    """
    match = SIGNATURE_PATTERN.fullmatch(header or "")
    if not match:
        return False
    timestamp, digest = match.groups()
    if abs(time.time() * 1000 - int(timestamp)) > SIGNATURE_MAX_AGE_MS:
        return False
    expected = hmac.new(
        api_key.encode(), (raw_body + timestamp).encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, digest.lower())


def incident_id_for_call(call_id: str) -> str:
    """Stable ID per call, so Retell retries don't create duplicates."""
    return f"CALL-{hashlib.sha1(call_id.encode()).hexdigest()[:8].upper()}"


def clean_text(value) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def clean_people_count(value) -> Optional[int]:
    try:
        count = int(float(value))
    except (TypeError, ValueError):
        return None
    return count if count >= 0 else None


def pick_phone(extracted, caller_number) -> Optional[str]:
    """Prefer the call-back number the caller gave; fall back to caller ID."""
    for candidate in (clean_text(extracted), clean_text(caller_number)):
        if candidate and PHONE_PATTERN.match(candidate):
            return candidate
    return None


def geocode_incident(incident_id: str, address: str) -> None:
    """Background task: add coordinates once the spoken address is resolved."""
    coords = geocode(address)
    if not coords:
        return
    with Session(engine) as session:
        incident = session.get(Incident, incident_id)
        if incident and incident.latitude is None:
            incident.latitude, incident.longitude = coords
            session.add(incident)
            session.commit()


@router.post("/retell/webhook")
async def retell_webhook(request: Request, background: BackgroundTasks):
    """
    Receive Retell call events. Only `call_analyzed` creates an incident;
    other events are acknowledged and ignored. Retell waits 10 s for a 2xx,
    so geocoding runs after the response.
    """
    raw_body = (await request.body()).decode("utf-8")

    api_key = os.environ.get("RETELL_API_KEY")
    if api_key:
        if not verify_signature(raw_body, request.headers.get("x-retell-signature"), api_key):
            raise HTTPException(status_code=401, detail="Invalid Retell signature")
    elif os.environ.get("RETELL_ALLOW_UNSIGNED") != "1":
        raise HTTPException(status_code=503, detail="RETELL_API_KEY is not set")

    try:
        payload = json.loads(raw_body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Body is not valid JSON")

    if payload.get("event") != "call_analyzed":
        return {"status": "ignored", "event": payload.get("event")}

    call = payload.get("call") or {}
    call_id = call.get("call_id")
    if not call_id:
        raise HTTPException(status_code=400, detail="Missing call.call_id")

    incident_id = incident_id_for_call(call_id)
    analysis = call.get("call_analysis") or {}
    data = analysis.get("custom_analysis_data") or {}
    address = clean_text(data.get("address_text"))

    with Session(engine) as session:
        if session.get(Incident, incident_id):
            return {"status": "duplicate", "id": incident_id}

        session.add(Incident(
            id=incident_id,
            description=(
                clean_text(data.get("description"))
                or clean_text(analysis.get("call_summary"))
                or "Phone call received. No details extracted."
            ),
            people_count=clean_people_count(data.get("people_count")),
            phone=pick_phone(data.get("phone"), call.get("from_number")),
            reporter_type="PHONE_CALL",
            status="NEW",
            location_method="VOICE",  # spoken address, geocoded afterwards
            address_text=address,
        ))
        session.add(IncidentEvent(
            incident_id=incident_id,
            new_status="NEW",
            note=f"Created from phone call. Retell call_id={call_id}",
        ))
        try:
            session.commit()
        except IntegrityError:  # a retry raced us
            return {"status": "duplicate", "id": incident_id}

    if address:
        background.add_task(geocode_incident, incident_id, address)

    return {"status": "created", "id": incident_id}
