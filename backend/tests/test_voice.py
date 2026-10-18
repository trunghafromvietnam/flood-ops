"""
Retell webhook tests. Payloads follow Retell's `call_analyzed` event shape.
The router is mounted on its own small app, so app/main.py is not needed.
Run from backend/ with PYTHONPATH=.
"""

import hashlib
import hmac
import json
import time
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.session import create_db_and_tables, engine
from app.models.incident import Incident
from sqlmodel import Session
import voice.webhook as webhook

API_KEY = "test-retell-key"
URL = "/api/voice/retell/webhook"

voice_app = FastAPI()
voice_app.include_router(webhook.router)
client = TestClient(voice_app)


@pytest.fixture(autouse=True)
def setup(monkeypatch):
    create_db_and_tables()
    monkeypatch.setenv("RETELL_API_KEY", API_KEY)
    monkeypatch.delenv("RETELL_ALLOW_UNSIGNED", raising=False)
    # No network in tests: pretend every address resolves to Seattle.
    monkeypatch.setattr(webhook, "geocode", lambda address: (47.6062, -122.3321))


def get_incident(incident_id):
    with Session(engine) as session:
        return session.get(Incident, incident_id)


def sign(body: str, timestamp_ms=None) -> str:
    ts = str(timestamp_ms or int(time.time() * 1000))
    digest = hmac.new(API_KEY.encode(), (body + ts).encode(), hashlib.sha256).hexdigest()
    return f"v={ts},d={digest}"


def call_payload(call_id=None, event="call_analyzed", **custom):
    data = {
        "address_text": "45 Lake St, Seattle, WA 98109",
        "people_count": 3,
        "description": "Family of 3 on 2nd floor, water rising, father has leg injury.",
        "phone": "",
    }
    data.update(custom)
    return {
        "event": event,
        "call": {
            "call_id": call_id or uuid.uuid4().hex,
            "call_type": "phone_call",
            "from_number": "+12065550142",
            "to_number": "+14252644623",
            "direction": "inbound",
            "call_analysis": {
                "call_summary": "Caller reported a family trapped by rising water.",
                "custom_analysis_data": data,
            },
        },
    }


def post(payload, signature=None):
    body = json.dumps(payload)
    return client.post(
        URL,
        content=body,
        headers={"Content-Type": "application/json", "x-retell-signature": signature or sign(body)},
    )


def test_call_analyzed_creates_phone_call_incident():
    r = post(call_payload())
    assert r.status_code == 200
    assert r.json()["status"] == "created"

    incident = get_incident(r.json()["id"])
    assert incident.reporter_type == "PHONE_CALL"
    assert incident.status == "NEW"
    assert incident.address_text == "45 Lake St, Seattle, WA 98109"
    assert incident.people_count == 3
    assert incident.phone == "+12065550142"  # caller ID, since no call-back number given
    assert incident.location_method == "VOICE"
    assert incident.latitude == 47.6062  # filled by the geocoding background task


def test_extracted_phone_preferred_over_caller_id():
    r = post(call_payload(phone="+1 206 555 0199"))
    assert get_incident(r.json()["id"]).phone == "+1 206 555 0199"


def test_retry_does_not_duplicate():
    payload = call_payload(call_id="retry-call-1")
    first = post(payload)
    second = post(payload)
    assert first.json()["status"] in ("created", "duplicate")
    assert second.json() == {"status": "duplicate", "id": first.json()["id"]}


def test_missing_details_still_creates_incident():
    r = post(call_payload(address_text="", people_count="unknown", description=""))
    incident = get_incident(r.json()["id"])
    assert incident.address_text is None
    assert incident.latitude is None
    assert incident.people_count is None
    # Falls back to Retell's own call summary.
    assert incident.description == "Caller reported a family trapped by rising water."


def test_other_events_ignored():
    r = post(call_payload(event="call_ended"))
    assert r.status_code == 200
    assert r.json()["status"] == "ignored"


def test_bad_signature_rejected():
    r = post(call_payload(), signature="v=123,d=deadbeef")
    assert r.status_code == 401


def test_old_signature_rejected():
    payload = call_payload()
    old = int(time.time() * 1000) - 10 * 60 * 1000
    r = post(payload, signature=sign(json.dumps(payload), old))
    assert r.status_code == 401


def test_no_api_key_configured(monkeypatch):
    monkeypatch.delenv("RETELL_API_KEY")
    r = post(call_payload())
    assert r.status_code == 503
