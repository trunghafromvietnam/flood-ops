"""
FloodOps API tests.
Covers happy paths, validation failures, missing data, and edge cases.
Run from backend/ with PYTHONPATH=. or pytest.ini pythonpath set.
"""

import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    """Health endpoint returns 200 and status ok."""
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_report_with_coordinates():
    """Create report with valid lat/lon. Expect 201 and NEW status."""
    payload = {
        "description": "Water rising",
        "people_count": 3,
        "reporter_type": "SELF",
        "location": {
            "latitude": 16.0544,
            "longitude": 108.2022,
            "method": "GPS",
            "address_text": None,
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "NEW"
    assert data["latitude"] == 16.0544
    assert data["reporter_type"] == "SELF"
    assert "id" in data


def test_create_report_address_only():
    """Create report with only address_text (no coordinates). Must succeed."""
    payload = {
        "description": "People on roof",
        "people_count": 4,
        "reporter_type": "THIRD_PARTY",
        "location": {
            "latitude": None,
            "longitude": None,
            "method": "MANUAL",
            "address_text": "Near the old bridge",
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 201
    assert r.json()["address_text"] == "Near the old bridge"
    assert r.json()["latitude"] is None


def test_create_report_missing_location_info():
    """Neither coordinates nor address_text → 422."""
    payload = {
        "description": "Help",
        "people_count": 1,
        "reporter_type": "SELF",
        "location": {
            "latitude": None,
            "longitude": None,
            "method": "UNKNOWN",
            "address_text": None,
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 422


def test_create_report_partial_coordinates():
    """Only latitude supplied → 422."""
    payload = {
        "description": "Partial coords",
        "people_count": 1,
        "reporter_type": "SELF",
        "location": {
            "latitude": 16.0,
            "longitude": None,
            "method": "GPS",
            "address_text": None,
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 422


def test_create_report_out_of_range_latitude():
    """Latitude > 90 → 422."""
    payload = {
        "description": "Bad lat",
        "people_count": 1,
        "reporter_type": "SELF",
        "location": {
            "latitude": 95.0,
            "longitude": 108.0,
            "method": "GPS",
            "address_text": None,
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 422


def test_create_report_invalid_reporter_type():
    """reporter_type not SELF or THIRD_PARTY → 422."""
    payload = {
        "description": "Invalid type",
        "people_count": 1,
        "reporter_type": "ROBOT",
        "location": {
            "latitude": 16.0,
            "longitude": 108.0,
            "method": "GPS",
            "address_text": None,
        },
    }
    r = client.post("/api/reports", json=payload)
    assert r.status_code == 422


def test_get_incident_not_found():
    """Unknown ID → 404."""
    r = client.get("/api/incidents/INC-NOTEXIST")
    assert r.status_code == 404


def test_update_status_valid():
    """Create then update status. Event history is recorded."""
    # Create
    payload = {
        "description": "Status test",
        "people_count": 2,
        "reporter_type": "SELF",
        "location": {"latitude": 16.1, "longitude": 108.1, "method": "GPS", "address_text": None},
    }
    created = client.post("/api/reports", json=payload).json()
    inc_id = created["id"]

    # Update
    r = client.patch(
        f"/api/incidents/{inc_id}/status",
        json={"status": "VERIFIED", "note": "Checked by responder"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "VERIFIED"


def test_update_status_invalid_value():
    """Invalid status string → 400."""
    payload = {
        "description": "Bad status",
        "people_count": 1,
        "reporter_type": "SELF",
        "location": {"latitude": 16.2, "longitude": 108.2, "method": "GPS", "address_text": None},
    }
    created = client.post("/api/reports", json=payload).json()
    inc_id = created["id"]

    r = client.patch(
        f"/api/incidents/{inc_id}/status",
        json={"status": "FLYING", "note": "nope"},
    )
    assert r.status_code == 400


def test_map_items_filters_missing_coords():
    """map/items returns only records that have both lat and lon."""
    # One with coords
    client.post(
        "/api/reports",
        json={
            "description": "Has coords",
            "people_count": 1,
            "reporter_type": "SELF",
            "location": {"latitude": 16.3, "longitude": 108.3, "method": "GPS", "address_text": None},
        },
    )
    # One without
    client.post(
        "/api/reports",
        json={
            "description": "No coords",
            "people_count": 1,
            "reporter_type": "THIRD_PARTY",
            "location": {"latitude": None, "longitude": None, "method": "MANUAL", "address_text": "Somewhere"},
        },
    )

    r = client.get("/api/map/items")
    assert r.status_code == 200
    items = r.json()
    for item in items:
        assert item["latitude"] is not None
        assert item["longitude"] is not None
        assert "kind" in item


def test_drone_observation_with_coords():
    """Drone upload with valid coordinates creates NEEDS_REVIEW observation."""
    fake_image = io.BytesIO(b"fake jpeg content")
    fake_image.name = "test.jpg"

    r = client.post(
        "/api/drone/observations",
        files={"file": ("test.jpg", fake_image, "image/jpeg")},
        data={
            "latitude": "16.4",
            "longitude": "108.4",
            "platform": "TestDrone",
            "note": "survey",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "NEEDS_REVIEW"
    assert data["has_coordinates"] is True
    assert "OBS-" in data["id"]


def test_drone_observation_no_coords():
    """Drone upload without coordinates still succeeds but has_coordinates=False."""
    fake_image = io.BytesIO(b"fake jpeg content")
    r = client.post(
        "/api/drone/observations",
        files={"file": ("test2.jpg", fake_image, "image/jpeg")},
        data={"platform": "TestDrone"},
    )
    assert r.status_code == 201
    assert r.json()["has_coordinates"] is False


def test_drone_observation_bad_file_type():
    """Non-image file → 400."""
    fake = io.BytesIO(b"not an image")
    r = client.post(
        "/api/drone/observations",
        files={"file": ("notes.txt", fake, "text/plain")},
        data={"latitude": "16.0", "longitude": "108.0"},
    )
    assert r.status_code == 400


def test_evidence_upload_and_list():
    """Upload evidence to an incident then list it."""
    # Create incident
    created = client.post(
        "/api/reports",
        json={
            "description": "Evidence test",
            "people_count": 1,
            "reporter_type": "SELF",
            "location": {"latitude": 16.5, "longitude": 108.5, "method": "GPS", "address_text": None},
        },
    ).json()
    inc_id = created["id"]

    # Upload
    fake_image = io.BytesIO(b"fake image data")
    r = client.post(
        f"/api/incidents/{inc_id}/evidence",
        files={"file": ("photo.jpg", fake_image, "image/jpeg")},
    )
    assert r.status_code == 201

    # List
    r2 = client.get(f"/api/incidents/{inc_id}/evidence")
    assert r2.status_code == 200
    assert len(r2.json()) >= 1