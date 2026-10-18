"""
Load the demo cases (the old frontend mock data) into the database.

Run from backend/:  python seed.py
Safe to run again: cases that already exist are skipped.
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session

from app.db.session import create_db_and_tables, engine
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent

# Demo area: downtown Seattle (same addresses as the old mock).
# x / y are the old % positions on the placeholder map; they are turned into
# coordinates below so the markers land roughly where they used to.
CASES = [
    # id, reporter_type, x, y, minutes_ago, address, phone, people, description
    ("FO-0412", "PHONE_CALL", 59, 40, 12, "45 Lake St, Seattle, WA 98109", "(206) 555-0142", 3,
     "Family of 3 on the 2nd floor, water still rising. Father has a leg injury. Needs a boat and first aid."),
    ("FO-0405", "DRONE", 35, 22, 21, "12 Rainier Ave S, Seattle, WA", None, None,
     "Drone photo shows about 4 people on a roof, one may be a child. Nobody has called from here yet."),
    ("FO-0398", "PHONE_CALL", 76, 17, 45, "210 Pine St, Seattle, WA 98101", "(206) 555-0118", 4,
     "Elderly couple and 2 adults stuck on the 1st floor. Team Bravo is evacuating them now."),
    ("FO-0391", "PHONE_CALL", 25, 64, 3, "880 Dearborn St, Seattle, WA", "(206) 555-0163", 2,
     "Two people inside a car with water at door level. One is shaking and very cold."),
    ("FO-0379", "DRONE", 47, 58, 31, "5th Ave S & Main St, Seattle, WA", None, None,
     "Drone photo shows 2 people sitting on top of a bus shelter, water around them."),
    ("FO-0410", "SELF", 44, 7, 38, "1530 Western Ave, Seattle, WA", "(206) 555-0190", 1,
     "One adult, safe on the main floor. Asks for a check before night."),
    ("FO-0402", "THIRD_PARTY", 84, 48, 53, "300 Broadway E, Seattle, WA", "(206) 555-0131", 2,
     "Elderly mother needs medicine soon. Water is not rising right now."),
    ("FO-0395", "SELF", 54, 76, 62, "2200 Airport Way S, Seattle, WA", "(206) 555-0177", 3,
     "Three workers waiting at a warehouse. Safe for now, no food left."),
]

NORTH, WEST, SPAN = 47.63, -122.36, 0.06


def seed():
    create_db_and_tables()
    now = datetime.now(timezone.utc)
    added = 0

    with Session(engine) as session:
        for case_id, reporter, x, y, minutes_ago, address, phone, people, description in CASES:
            if session.get(Incident, case_id):
                continue

            created = now - timedelta(minutes=minutes_ago)
            status = "NEEDS_REVIEW" if reporter == "DRONE" else "NEW"
            session.add(Incident(
                id=case_id,
                description=description,
                people_count=people,
                phone=phone,
                reporter_type=reporter,
                status=status,
                latitude=round(NORTH - SPAN * y / 100, 6),
                longitude=round(WEST + SPAN * x / 100, 6),
                location_method="DRONE_ESTIMATE" if reporter == "DRONE" else "GPS",
                address_text=address,
                created_at=created,
                updated_at=created,
            ))
            session.add(IncidentEvent(
                incident_id=case_id,
                new_status=status,
                note="Demo data (seed.py)",
                created_at=created,
            ))
            added += 1

        session.commit()

    print(f"Seed done: {added} added, {len(CASES) - added} already there.")


if __name__ == "__main__":
    seed()
