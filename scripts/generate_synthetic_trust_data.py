"""
Synthetic prototype data — not real customer bookings. DO NOT insert into public.bookings.
Deterministic provider-level trust history for anomaly detection prototype.
"""
import hashlib
import csv
import datetime
import os
import re
import json
import random

# Fixed seed for deterministic python random where used
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# 20 canonical cities (must match CITY_HUBS excluding Siliguri per spec)
CITIES = [
    "Delhi NCR","Gurugram","Mumbai","Bengaluru","Chennai","Hyderabad","Kolkata","Ahmedabad","Pune","Surat",
    "Visakhapatnam","Coimbatore","Vadodara","Nagpur","Jaipur","Lucknow","Kochi","Indore","Patna","Bhopal",
]

# 14 services from SERVICE_CATEGORIES (exact srv-* IDs)
SERVICES = [
    ("srv-clean-01","Full Home Deep Cleaning",1299),
    ("srv-plumb-01","Plumbing Repair & Leakage Fix",449),
    ("srv-elec-01","Electrical Repair & Wiring",399),
    ("srv-carp-01","Carpentry & Furniture Assembly",499),
    ("srv-ac-01","AC Deep Foam Jet Servicing",699),
    ("srv-paint-01","Wall Painting & Waterproofing",1999),
    ("srv-garden-01","Gardening & Balcony Greenery",499),
    ("srv-pest-01","Organic Pest Control",899),
    ("srv-cook-01","Home Chef & Meal Preparation",650),
    ("srv-elder-01","Elder Assistance & Companionship",500),
    ("srv-move-01","Moving & Heavy Lifting Assistance",799),
    ("srv-soc-clean-01","Society Common Area Sanitization",2499),
    ("srv-soc-tank-01","Water Sump & Overhead Tank Cleaning",3500),
    ("srv-soc-event-01","Community Event Sound & Electrical Setup",1800),
]

SERVICE_MAP = {sid: (name, price) for sid, name, price in SERVICES}
SERVICE_IDS = [sid for sid,_,_ in SERVICES]

# Date range: 60 days ending 2026-09-02 (so we have recent history, deterministic)
START_DATE = datetime.date(2026, 7, 5)
NUM_DAYS = 60
END_DATE = START_DATE + datetime.timedelta(days=NUM_DAYS-1)

# Read provider IDs from mockData.js (real provider IDs)
MOCK_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "mockData.js")
PROVIDER_IDS = []
PROVIDER_CITY = {}
PROVIDER_SERVICE = {}
PROVIDER_RATING = {}

provider_id_pattern = re.compile(r'id:\s*"([^"]+)"')
# Very rough: we'll parse INITIAL_PROVIDERS block
try:
    with open(MOCK_PATH, encoding="utf-8") as f:
        content = f.read()
    # Find all provider entries
    # Extract provider blocks via regex for id and location and rating
    # We'll use a simple approach: find all occurrences of id: "prov-..." and then nearby location/service
    # Instead, use a more robust extraction by splitting on 'id: "prov-'
    # For now, extract IDs via pattern for prov-*
    all_ids = re.findall(r'"(prov-[^"]+)"', content)
    # Filter to unique preserving order and that look like provider IDs (include prov-rajesh etc)
    seen = set()
    for pid in all_ids:
        if pid.startswith("prov-") and pid not in seen:
            # Ensure it's a provider id (not review etc)
            if len(pid) > 5 and not pid.startswith("prov-") or pid.startswith("prov-"):
                seen.add(pid)
                PROVIDER_IDS.append(pid)
    # Limit to first 300 for manageable size, but ensure at least 200 distinct
    PROVIDER_IDS = PROVIDER_IDS[:300]
    # Extract city mapping: look for location: "..." after each provider id
    # We'll parse provider blocks more accurately
    provider_blocks = re.findall(r'id:\s*"(prov-[^"]+)".*?location:\s*"([^"]+)".*?rating:\s*([0-9.]+).*?serviceCategories:\s*\[([^\]]+)\]', content, flags=re.DOTALL)
    for pid, loc, rating, cats in provider_blocks:
        if pid not in PROVIDER_IDS:
            continue
        # Determine city: check if any CITY in loc
        city_found = None
        for city in CITIES:
            if city.lower() in loc.lower() or (city=="Delhi NCR" and "delhi" in loc.lower()):
                city_found = city
                break
        if not city_found:
            # fallback: check hub string
            if "bengaluru" in loc.lower() or "indiranagar" in loc.lower():
                city_found = "Bengaluru"
            elif "mumbai" in loc.lower() or "dadar" in loc.lower():
                city_found = "Mumbai"
            elif "gurgaon" in loc.lower() or "gurugram" in loc.lower():
                city_found = "Gurugram"
            else:
                city_found = CITIES[hash(pid) % len(CITIES)]  # deterministic fallback
        PROVIDER_CITY[pid] = city_found
        PROVIDER_RATING[pid] = float(rating)
        # Determine service: take first serviceCategory and map to srv-*
        #cats is like '"Electrical", "Smart Home"...' extract first quoted
        cat_match = re.search(r'"([^"]+)"', cats)
        first_cat = cat_match.group(1) if cat_match else "Electrical"
        # Map category to service_id via simple keyword
        mapping = {
            "Cleaning": "srv-clean-01",
            "Plumbing": "srv-plumb-01",
            "Electrical": "srv-elec-01",
            "Carpentry": "srv-carp-01",
            "Appliance": "srv-ac-01",
            "Painting": "srv-paint-01",
            "Gardening": "srv-garden-01",
            "Pest": "srv-pest-01",
            "Cooking": "srv-cook-01",
            "Elder": "srv-elder-01",
            "Moving": "srv-move-01",
            "Community": "srv-soc-event-01",
            "Apartment": "srv-soc-clean-01",
        }
        service_id = "srv-plumb-01"
        for kw, sid in mapping.items():
            if kw.lower() in first_cat.lower():
                service_id = sid
                break
        # If serviceCategories contains Appliance Repair and provider is AC, check
        if "appliance" in first_cat.lower() and "ac" in cats.lower():
            service_id = "srv-ac-01"
        PROVIDER_SERVICE[pid] = service_id
except Exception as e:
    print(f"Warning: could not parse mockData.js: {e}")
    # Fallback synthetic providers
    PROVIDER_IDS = [f"prov-synth-{i:03d}" for i in range(1, 201)]
    for i, pid in enumerate(PROVIDER_IDS):
        PROVIDER_CITY[pid] = CITIES[i % len(CITIES)]
        PROVIDER_SERVICE[pid] = SERVICE_IDS[i % len(SERVICE_IDS)]
        PROVIDER_RATING[pid] = 4.5 + (i % 5) * 0.1

# Ensure we have at least 200 providers
if len(PROVIDER_IDS) < 200:
    # Pad with synthetic
    needed = 200 - len(PROVIDER_IDS)
    for i in range(needed):
        pid = f"prov-synth-pad-{i:03d}"
        PROVIDER_IDS.append(pid)
        PROVIDER_CITY[pid] = CITIES[i % len(CITIES)]
        PROVIDER_SERVICE[pid] = SERVICE_IDS[i % len(SERVICE_IDS)]
        PROVIDER_RATING[pid] = 4.7

print(f"Using {len(PROVIDER_IDS)} providers")

def hash_uniform(provider_id, date_str, salt):
    h = hashlib.md5(f"{provider_id}|{date_str}|{salt}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF

def generate():
    rows = []
    # Pre-select anomalous providers deterministically (5% of providers will have elevated anomaly traits)
    anomalous_providers = set()
    for pid in PROVIDER_IDS:
        if hash_uniform(pid, "anomaly-select", "select") < 0.06:  # ~6% (~18 of 300)
            anomalous_providers.add(pid)
    print(f"Anomalous providers (deterministic): {len(anomalous_providers)}")

    for date_offset in range(NUM_DAYS):
        date_obj = START_DATE + datetime.timedelta(days=date_offset)
        date_str = date_obj.isoformat()
        for pid in PROVIDER_IDS:
            city = PROVIDER_CITY.get(pid, CITIES[hash(pid) % len(CITIES)])
            service_id = PROVIDER_SERVICE.get(pid, SERVICE_IDS[hash(pid) % len(SERVICE_IDS)])
            service_name, base_price = SERVICE_MAP[service_id]
            base_rating = PROVIDER_RATING.get(pid, 4.6)

            # Base booking count: typical 0-3 per day per provider
            # Use hash to get base
            u = hash_uniform(pid, date_str, "booking")
            # Distribution: 40% 0, 30% 1, 20% 2, 8% 3, 2% 4
            if u < 0.40:
                booking_count = 0
            elif u < 0.70:
                booking_count = 1
            elif u < 0.90:
                booking_count = 2
            elif u < 0.98:
                booking_count = 3
            else:
                booking_count = 4

            # Anomalous providers have higher volume on ~30% of days
            is_anomalous = pid in anomalous_providers
            if is_anomalous and hash_uniform(pid, date_str, "vol-anomaly") < 0.30:
                booking_count = min(8, booking_count + 3 + int(hash_uniform(pid, date_str, "vol-extra")*3))

            # Sudden spike: 2% of normal days have spike to 5-7
            if not is_anomalous and hash_uniform(pid, date_str, "spike") < 0.02:
                booking_count = max(booking_count, 5)

            # Completed / cancelled / rejected split
            cancelled_count = 0
            rejected_count = 0
            completed_count = 0
            if booking_count > 0:
                # Cancellation rate: normal ~5-8%, anomalous ~25-40%
                canc_rate = 0.06 + hash_uniform(pid, date_str, "canc") * 0.04  # 6-10% normal
                if is_anomalous and hash_uniform(pid, date_str, "canc-anom") < 0.5:
                    canc_rate = 0.25 + hash_uniform(pid, date_str, "canc-anom2") * 0.20  # 25-45%
                elif hash_uniform(pid, date_str, "canc-spike") < 0.03:
                    canc_rate = 0.30  # occasional high
                cancelled_count = int(round(booking_count * canc_rate))
                cancelled_count = min(cancelled_count, booking_count)

                # Rejection rate: normal 3-6%, anomalous 15-30%
                rej_rate = 0.03 + hash_uniform(pid, date_str, "rej") * 0.03
                if is_anomalous and hash_uniform(pid, date_str, "rej-anom") < 0.4:
                    rej_rate = 0.15 + hash_uniform(pid, date_str, "rej-anom2") * 0.15
                rejected_count = int(round(booking_count * rej_rate))
                # Ensure cancelled+rejected <= booking_count
                if cancelled_count + rejected_count > booking_count:
                    rejected_count = max(0, booking_count - cancelled_count)
                completed_count = booking_count - cancelled_count - rejected_count
            else:
                completed_count = 0

            # Rating: base_rating with small daily noise +-0.15, anomalous low rating on some days
            rating_noise = (hash_uniform(pid, date_str, "rating") - 0.5) * 0.30
            rating = round(base_rating + rating_noise, 2)
            if is_anomalous and hash_uniform(pid, date_str, "rating-anom") < 0.25:
                rating = round(max(1.0, rating - 0.8 - hash_uniform(pid, date_str, "rating-low")*0.7), 2)
            rating = max(1.0, min(5.0, rating))

            # Active jobs: roughly booking_count - completed? For daily snapshot, active = booking_count with status active (approx 30% of bookings are active)
            # Simplified: active_jobs = int(booking_count * (0.3 + noise)) plus previous day carry
            # For anomaly: anomalous workload high
            active_base = int(round(booking_count * (0.3 + hash_uniform(pid, date_str, "active")*0.2)))
            if is_anomalous and hash_uniform(pid, date_str, "active-anom") < 0.3:
                active_base = min(6, active_base + 2 + int(hash_uniform(pid, date_str, "active-extra")*2))
            # Occasional high workload spike
            if hash_uniform(pid, date_str, "workload-spike") < 0.015:
                active_base = max(active_base, 5)
            active_jobs = max(0, min(6, active_base))

            # Daily earnings proxy: completed * base_price with small variation
            earnings = completed_count * base_price
            # Add platform variation
            earnings = int(earnings * (0.9 + hash_uniform(pid, date_str, "earn")*0.2))

            rows.append({
                "provider_id": pid,
                "date": date_str,
                "city": city,
                "service_id": service_id,
                "service_name": service_name,
                "booking_count": booking_count,
                "completed_count": completed_count,
                "cancelled_count": cancelled_count,
                "rejected_count": rejected_count,
                "rating": rating,
                "active_jobs": active_jobs,
                "daily_earnings_proxy": earnings,
            })
    # Sort deterministic: date, city, service_id, provider_id
    rows.sort(key=lambda r: (r["date"], r["city"], r["service_id"], r["provider_id"]))
    return rows

def main():
    rows = generate()
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "synthetic_trust_history.csv")
    # Write with synthetic disclaimer header as comment line? CSV header must be first for validation, so add disclaimer as separate line starting with # and document in README
    fieldnames = ["provider_id","date","city","service_id","service_name","booking_count","completed_count","cancelled_count","rejected_count","rating","active_jobs","daily_earnings_proxy"]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        # Write disclaimer as comment (will be skipped by validator if it handles)
        f.write("# Synthetic prototype data — not real customer bookings. DO NOT insert into public.bookings.\n")
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows -> {out_path}")
    print(f"Date range {START_DATE} to {END_DATE} ({NUM_DAYS} days)")
    print(f"Providers {len(PROVIDER_IDS)} Cities {len(CITIES)} Services {len(SERVICE_IDS)} Expected {len(PROVIDER_IDS)*NUM_DAYS}")
    # Stats
    import collections
    cities = set(r["city"] for r in rows)
    services = set(r["service_id"] for r in rows)
    print(f"Distinct cities {len(cities)} services {len(services)}")
    # Check constraints
    bad = [r for r in rows if r["cancelled_count"] > r["booking_count"] or r["rejected_count"] > r["booking_count"]]
    print(f"Constraint violations (cancel/reject > booking): {len(bad)}")
    # Deterministic check: hash of file
    import hashlib
    h = hashlib.sha256()
    with open(out_path, "rb") as f:
        h.update(f.read())
    print(f"SHA256 {h.hexdigest()[:16]}")

if __name__ == "__main__":
    main()
