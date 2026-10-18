"""
Turn a spoken street address into coordinates so phone-call incidents can be
placed on the map. Uses OpenStreetMap Nominatim (free, max ~1 request/second).
"""

import os
from typing import Optional, Tuple

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim's usage policy asks for an identifying User-Agent.
USER_AGENT = "FloodOps/0.1 (hackathon prototype)"


def geocode(address: str) -> Optional[Tuple[float, float]]:
    """Return (latitude, longitude) for an address, or None if not found."""
    if not address or os.environ.get("GEOCODER_DISABLED") == "1":
        return None
    try:
        response = httpx.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=5.0,
        )
        response.raise_for_status()
        results = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"[GEOCODE] Failed for {address!r}: {exc}")
        return None

    if not results:
        print(f"[GEOCODE] No match for {address!r}")
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])
