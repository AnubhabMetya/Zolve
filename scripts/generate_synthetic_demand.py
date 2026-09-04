"""
Synthetic prototype data — not real customer bookings.
Deterministic generator for Zolve AI Feature 3 — Demand Forecasting (SIH prototype/testing only).
DO NOT insert into public.bookings.
"""
import hashlib
import csv
import datetime
import math
import os

# Canonical 20 cities matching CITY_HUBS (exact spelling)
CITIES = [
    "Delhi NCR",
    "Gurugram",
    "Mumbai",
    "Bengaluru",
    "Chennai",
    "Hyderabad",
    "Kolkata",
    "Ahmedabad",
    "Pune",
    "Surat",
    "Visakhapatnam",
    "Coimbatore",
    "Vadodara",
    "Nagpur",
    "Jaipur",
    "Lucknow",
    "Kochi",
    "Indore",
    "Patna",
    "Bhopal",
]

# 14 services from SERVICE_CATEGORIES (exact srv-* IDs)
SERVICES = [
    ("srv-clean-01", "Full Home Deep Cleaning"),
    ("srv-plumb-01", "Plumbing Repair & Leakage Fix"),
    ("srv-elec-01", "Electrical Repair & Wiring"),
    ("srv-carp-01", "Carpentry & Furniture Assembly"),
    ("srv-ac-01", "AC Deep Foam Jet Servicing"),
    ("srv-paint-01", "Wall Painting & Waterproofing"),
    ("srv-garden-01", "Gardening & Balcony Greenery"),
    ("srv-pest-01", "Organic Pest Control"),
    ("srv-cook-01", "Home Chef & Meal Preparation"),
    ("srv-elder-01", "Elder Assistance & Companionship"),
    ("srv-move-01", "Moving & Heavy Lifting Assistance"),
    ("srv-soc-clean-01", "Society Common Area Sanitization"),
    ("srv-soc-tank-01", "Water Sump & Overhead Tank Cleaning"),
    ("srv-soc-event-01", "Community Event Sound & Electrical Setup"),
]

# Deterministic date range: 180 days ending 2026-09-02 (inclusive start 2026-03-07)
# 180 days = 20 *14 *180 = 50400 rows
START_DATE = datetime.date(2026, 3, 7)
NUM_DAYS = 180
END_DATE = START_DATE + datetime.timedelta(days=NUM_DAYS - 1)  # 2026-09-02

# City baselines (metropolitan demand scale)
CITY_BASE = {
    "Delhi NCR": 1.40,
    "Gurugram": 1.00,
    "Mumbai": 1.45,
    "Bengaluru": 1.35,
    "Chennai": 1.10,
    "Hyderabad": 1.15,
    "Kolkata": 1.20,
    "Ahmedabad": 1.00,
    "Pune": 1.05,
    "Surat": 0.85,
    "Visakhapatnam": 0.80,
    "Coimbatore": 0.82,
    "Vadodara": 0.80,
    "Nagpur": 0.85,
    "Jaipur": 0.90,
    "Lucknow": 0.95,
    "Kochi": 0.85,
    "Indore": 0.88,
    "Patna": 0.82,
    "Bhopal": 0.80,
}

# Service daily base mean (before city scaling) — tuned for plausible daily counts 1-15
SERVICE_BASE = {
    "srv-clean-01": 8.0,
    "srv-plumb-01": 6.0,
    "srv-elec-01": 7.0,
    "srv-carp-01": 5.0,
    "srv-ac-01": 6.0,
    "srv-paint-01": 3.0,
    "srv-garden-01": 4.0,
    "srv-pest-01": 4.0,
    "srv-cook-01": 5.5,
    "srv-elder-01": 4.2,
    "srv-move-01": 3.0,
    "srv-soc-clean-01": 2.0,
    "srv-soc-tank-01": 1.5,
    "srv-soc-event-01": 2.0,
}

def deterministic_noise(city, service_id, date_str):
    """Deterministic pseudo-random in [-0.15, +0.15] via hash."""
    h = hashlib.md5(f"{city}|{service_id}|{date_str}".encode()).hexdigest()
    # Use first 8 hex chars -> 0..1
    val = int(h[:8], 16) / 0xFFFFFFFF
    return (val - 0.5) * 0.30  # +-0.15

def deterministic_spike(city, service_id, date_str):
    """Deterministic occasional spike factor. ~2% of rows spike 1.6-2.0x."""
    h = hashlib.md5(f"spike|{city}|{service_id}|{date_str}".encode()).hexdigest()
    v = int(h[:4], 16) % 100
    if v < 2:  # 2% spike
        # 1.6 to 2.0 based on next byte
        w = int(h[4:6], 16) % 40  # 0-39
        return 1.6 + w / 100.0
    if v < 5:  # additional 3% moderate spike 1.3x
        return 1.3
    return 1.0

def weekday_factor(service_id, dow):
    """dow 0=Mon ..6=Sun"""
    is_weekend = dow >= 5  # Sat,Sun
    if service_id == "srv-clean-01":
        return 1.60 if is_weekend else 0.85
    if service_id == "srv-garden-01":
        return 1.45 if is_weekend else 0.88
    if service_id == "srv-paint-01":
        return 1.30 if is_weekend else 0.92
    if service_id == "srv-move-01":
        return 1.70 if is_weekend else 0.80
    if service_id == "srv-soc-event-01":
        return 1.80 if is_weekend else 0.75
    if service_id == "srv-soc-clean-01":
        # community: Sat peak
        return 1.25 if dow == 5 else (0.90 if is_weekend else 1.0)
    if service_id == "srv-ac-01":
        return 1.10 if is_weekend else 0.98
    if service_id == "srv-elec-01":
        return 0.95 if is_weekend else 1.08
    if service_id == "srv-cook-01":
        return 1.05 if is_weekend else 1.02
    if service_id == "srv-elder-01":
        return 0.98 if is_weekend else 1.02
    # plumbing, carpentry, pest, soc-tank steady
    return 1.15 if is_weekend else 0.98 if service_id == "srv-pest-01" else 1.0

def seasonal_factor(service_id, date_obj):
    """Reasonable seasonal variation (deterministic, not claiming real market stats)."""
    month = date_obj.month
    # AC: peak Apr-Jun (summer), low Dec-Feb
    if service_id == "srv-ac-01":
        # sine peak at June (month 6)
        # map month 1..12 to angle
        # peak factor 1.55 in May-June, trough 0.55 in Jan/Dec
        # Use cosine
        # May=5, June=6 peak
        angle = (month - 6) * math.pi / 6  # 0 at June
        return 1.0 + 0.45 * math.cos(angle)  # 1.45 peak, 0.55 trough
    if service_id == "srv-pest-01":
        # monsoon Jun-Sep higher
        if month in (6,7,8,9):
            return 1.25
        if month in (12,1,2):
            return 0.85
        return 1.0
    if service_id == "srv-garden-01":
        # spring & monsoon greenery
        if month in (3,4,8,9):
            return 1.20
        if month in (12,1):
            return 0.85
        return 1.0
    if service_id == "srv-paint-01":
        # post-monsoon & pre-winter peak Oct-Feb? Actually painting lower in monsoon
        if month in (6,7,8):
            return 0.75
        if month in (10,11,1,2):
            return 1.25
        return 1.0
    if service_id == "srv-soc-event-01":
        # festival season Sep-Nov (Dussehra/Diwali) + March Holi
        if month in (9,10,11):
            return 1.40
        if month in (3,12):
            return 1.20
        return 0.90
    if service_id == "srv-move-01":
        # month start/end higher (use day_of_month effect later)
        return 1.0
    # general mild seasonality: summer slightly higher
    if month in (4,5,6):
        return 1.05
    return 1.0

def month_boundary_factor(service_id, day_of_month):
    if service_id == "srv-move-01":
        if day_of_month <= 3 or day_of_month >= 28:
            return 1.40
    if service_id == "srv-soc-tank-01":
        # tank cleaning often month-start
        if day_of_month <= 5:
            return 1.25
    return 1.0

def trend_factor(day_index):
    """Gradual trend: +0.15% per day approx +27% over 180 days."""
    return 1.0 + day_index * 0.0015

def generate():
    rows = []
    for day_offset in range(NUM_DAYS):
        date_obj = START_DATE + datetime.timedelta(days=day_offset)
        date_str = date_obj.isoformat()
        dow = date_obj.weekday()  # 0 Mon
        day_of_week = date_obj.strftime("%A")  # Monday etc for feature
        is_weekend = 1 if dow >= 5 else 0
        month = date_obj.month
        day_of_month = date_obj.day

        tf = trend_factor(day_offset)

        for city in CITIES:
            city_b = CITY_BASE[city]
            for service_id, service_name in SERVICES:
                service_b = SERVICE_BASE[service_id]
                wf = weekday_factor(service_id, dow)
                sf = seasonal_factor(service_id, date_obj)
                mf = month_boundary_factor(service_id, day_of_month)
                noise = deterministic_noise(city, service_id, date_str)
                spike = deterministic_spike(city, service_id, date_str)

                base = service_b * city_b
                # Combine multiplicatively
                demand = base * wf * sf * mf * tf * (1 + noise) * spike
                # Round to integer, ensure >=0
                count = int(round(demand))
                if count < 0:
                    count = 0
                # Keep realistic bounds: cap at ~40 to avoid outliers
                if count > 40:
                    count = 40

                rows.append({
                    "date": date_str,
                    "city": city,
                    "service_id": service_id,
                    "service_name": service_name,
                    "booking_count": count,
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "month": month,
                    "day_of_month": day_of_month,
                })
    return rows

def main():
    rows = generate()
    # Ensure deterministic sorted order: date asc, city asc, service_id asc
    rows.sort(key=lambda r: (r["date"], r["city"], r["service_id"]))
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "synthetic_demand_history.csv")
    fieldnames = ["date","city","service_id","service_name","booking_count","day_of_week","is_weekend","month","day_of_month"]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows -> {out_path}")
    print(f"Date range {START_DATE} to {END_DATE} ({NUM_DAYS} days)")
    print(f"Cities {len(CITIES)} Services {len(SERVICES)} Expected {len(CITIES)*len(SERVICES)*NUM_DAYS}")
    # Quick stats
    counts = [r["booking_count"] for r in rows]
    print(f"booking_count stats min {min(counts)} max {max(counts)} mean {sum(counts)/len(counts):.2f}")
    # Validation
    assert len(rows) == len(CITIES)*len(SERVICES)*NUM_DAYS
    assert len(set(r["city"] for r in rows)) == 20
    assert len(set(r["service_id"] for r in rows)) == 14
    assert len(set(r["date"] for r in rows)) == 180
    # Check no duplicates
    keys = [(r["date"], r["city"], r["service_id"]) for r in rows]
    assert len(keys) == len(set(keys)), "duplicate found"
    print("Validation passed")

if __name__ == "__main__":
    main()
