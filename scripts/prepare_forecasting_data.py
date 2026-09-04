"""
Synthetic prototype data — not real customer bookings.
Prepare forecasting data: validate, derive calendar features, create lag/rolling features.

Usage:
  python scripts/prepare_forecasting_data.py
  python scripts/prepare_forecasting_data.py --input data/synthetic_demand_history.csv --output data/synthetic_demand_features.csv

Design: future real aggregated booking data can replace synthetic CSV without changing pipeline
(just point --input to real aggregated CSV with same schema: date,city,service_id,service_name,booking_count)
"""
import argparse
import csv
import datetime
import os
import sys

# Use only stdlib; optionally use pandas if available for convenience
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

REQUIRED_CITIES = [
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

REQUIRED_SERVICES = [
    "srv-clean-01",
    "srv-plumb-01",
    "srv-elec-01",
    "srv-carp-01",
    "srv-ac-01",
    "srv-paint-01",
    "srv-garden-01",
    "srv-pest-01",
    "srv-cook-01",
    "srv-elder-01",
    "srv-move-01",
    "srv-soc-clean-01",
    "srv-soc-tank-01",
    "srv-soc-event-01",
]

SERVICE_NAMES = {
    "srv-clean-01": "Full Home Deep Cleaning",
    "srv-plumb-01": "Plumbing Repair & Leakage Fix",
    "srv-elec-01": "Electrical Repair & Wiring",
    "srv-carp-01": "Carpentry & Furniture Assembly",
    "srv-ac-01": "AC Deep Foam Jet Servicing",
    "srv-paint-01": "Wall Painting & Waterproofing",
    "srv-garden-01": "Gardening & Balcony Greenery",
    "srv-pest-01": "Organic Pest Control",
    "srv-cook-01": "Home Chef & Meal Preparation",
    "srv-elder-01": "Elder Assistance & Companionship",
    "srv-move-01": "Moving & Heavy Lifting Assistance",
    "srv-soc-clean-01": "Society Common Area Sanitization",
    "srv-soc-tank-01": "Water Sump & Overhead Tank Cleaning",
    "srv-soc-event-01": "Community Event Sound & Electrical Setup",
}

def load_csv(path):
    """Load CSV with validation of header."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Input CSV not found: {path}")
    if HAS_PANDAS:
        df = pd.read_csv(path, parse_dates=["date"])
        # ensure date is date only
        df["date"] = pd.to_datetime(df["date"]).dt.date
        return df
    else:
        rows = []
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                r["date"] = datetime.date.fromisoformat(r["date"])
                r["booking_count"] = int(r["booking_count"])
                r["is_weekend"] = int(r["is_weekend"])
                r["month"] = int(r["month"])
                r["day_of_month"] = int(r["day_of_month"])
                rows.append(r)
        return rows

def validate(df_or_rows):
    """Validate data: 20 cities, 14 services, ~180 days, no missing combos, booking_count>=0, no duplicates."""
    if HAS_PANDAS:
        df = df_or_rows
        # Check columns
        required_cols = {"date","city","service_id","service_name","booking_count","day_of_week","is_weekend","month","day_of_month"}
        missing = required_cols - set(df.columns)
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        # Cities
        cities = set(df["city"].unique())
        if cities != set(REQUIRED_CITIES):
            raise ValueError(f"Expected 20 cities {set(REQUIRED_CITIES)} got {cities} diff {cities.symmetric_difference(set(REQUIRED_CITIES))}")
        services = set(df["service_id"].unique())
        if services != set(REQUIRED_SERVICES):
            raise ValueError(f"Expected 14 services {set(REQUIRED_SERVICES)} got {services}")
        dates = sorted(df["date"].unique())
        if len(dates) < 175 or len(dates) > 185:
            raise ValueError(f"Expected ~180 days, got {len(dates)} range {dates[0]} to {dates[-1]}")
        # booking_count >=0
        if (df["booking_count"] < 0).any():
            raise ValueError("booking_count contains negative values")
        # no duplicates
        dup = df.duplicated(subset=["date","city","service_id"]).sum()
        if dup != 0:
            raise ValueError(f"Duplicate city+service+date rows: {dup}")
        # completeness: every date*city*service present
        expected = len(dates) * len(REQUIRED_CITIES) * len(REQUIRED_SERVICES)
        if len(df) != expected:
            raise ValueError(f"Missing combos: got {len(df)} expected {expected}")
        # deterministic check: service_name matches id
        for sid, name in SERVICE_NAMES.items():
            bad = df[(df["service_id"]==sid) & (df["service_name"]!=name)]
            if not bad.empty:
                raise ValueError(f"service_name mismatch for {sid}")
        print(f"Validation passed: {len(df)} rows, {len(dates)} days {dates[0]} to {dates[-1]}, {len(cities)} cities, {len(services)} services")
        return dates
    else:
        rows = df_or_rows
        cities = set(r["city"] for r in rows)
        services = set(r["service_id"] for r in rows)
        dates = sorted(set(r["date"] for r in rows))
        if cities != set(REQUIRED_CITIES):
            raise ValueError(f"Cities mismatch {cities}")
        if services != set(REQUIRED_SERVICES):
            raise ValueError(f"Services mismatch {services}")
        if len(dates) < 175 or len(dates) > 185:
            raise ValueError(f"Days {len(dates)}")
        if any(r["booking_count"] < 0 for r in rows):
            raise ValueError("negative booking_count")
        keys = [(r["date"], r["city"], r["service_id"]) for r in rows]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicate rows")
        print(f"Validation passed (no pandas): {len(rows)} rows")
        return dates

def add_calendar_features(df):
    """
    Ensure calendar features are derived correctly (idempotent).
    Keeps feature-generation logic separate from generated dataset.
    Input df must have 'date' column.
    Returns df with day_of_week, is_weekend, month, day_of_month (recomputed).
    """
    if HAS_PANDAS:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["day_of_week"] = df["date"].dt.day_name()
        df["is_weekend"] = df["date"].dt.weekday >= 5
        df["is_weekend"] = df["is_weekend"].astype(int)
        df["month"] = df["date"].dt.month
        df["day_of_month"] = df["date"].dt.day
        df["date"] = df["date"].dt.date
        return df
    else:
        for r in df:
            dow = r["date"].strftime("%A")
            is_wk = 1 if r["date"].weekday() >=5 else 0
            r["day_of_week"] = dow
            r["is_weekend"] = is_wk
            r["month"] = r["date"].month
            r["day_of_month"] = r["date"].day
        return df

def create_lag_rolling_features(df):
    """
    Feature-generation function capable of calculating:
      lag_1_day, lag_7_day, rolling_7_day_mean, rolling_14_day_mean

    Grouped by (city, service_id), sorted by date.
    Rolling means are computed on lagged series (shift 1) to avoid leakage.
    Returns df with new columns (NaN where insufficient history).
    Separate from generated dataset — call after validation.
    """
    if HAS_PANDAS:
        df = df.copy()
        df = df.sort_values(["city","service_id","date"])
        # Use groupby transform
        def add_group(g):
            g = g.sort_values("date")
            g["lag_1_day"] = g["booking_count"].shift(1)
            g["lag_7_day"] = g["booking_count"].shift(7)
            # rolling means on shifted series (exclude current day)
            g["rolling_7_day_mean"] = g["booking_count"].shift(1).rolling(window=7, min_periods=7).mean()
            g["rolling_14_day_mean"] = g["booking_count"].shift(1).rolling(window=14, min_periods=14).mean()
            return g
        df = df.groupby(["city","service_id"], group_keys=False).apply(add_group)
        df = df.sort_values(["date","city","service_id"])
        return df
    else:
        # pure python fallback
        from collections import defaultdict
        # group
        groups = defaultdict(list)
        for r in df:
            groups[(r["city"], r["service_id"])].append(r)
        for key, lst in groups.items():
            lst.sort(key=lambda x: x["date"])
            counts = [x["booking_count"] for x in lst]
            for i, r in enumerate(lst):
                r["lag_1_day"] = counts[i-1] if i >=1 else None
                r["lag_7_day"] = counts[i-7] if i >=7 else None
                if i >=7:
                    r["rolling_7_day_mean"] = sum(counts[i-7:i]) / 7
                else:
                    r["rolling_7_day_mean"] = None
                if i >=14:
                    r["rolling_14_day_mean"] = sum(counts[i-14:i]) / 14
                else:
                    r["rolling_14_day_mean"] = None
        # flatten sorted globally by date,city,service
        all_rows = []
        for lst in groups.values():
            all_rows.extend(lst)
        all_rows.sort(key=lambda x: (x["date"], x["city"], x["service_id"]))
        return all_rows

def main():
    parser = argparse.ArgumentParser(description="Prepare forecasting data: validate and create lag/rolling features")
    parser.add_argument("--input", default="data/synthetic_demand_history.csv", help="Input CSV path")
    parser.add_argument("--output", default="data/synthetic_demand_features.csv", help="Output model-ready CSV with lag/rolling features")
    args = parser.parse_args()

    input_path = os.path.join(os.path.dirname(__file__), "..", args.input) if not os.path.isabs(args.input) and not args.input.startswith("data") else args.input
    # Resolve relative to project root if running from scripts/
    if not os.path.exists(input_path):
        # try project root relative
        alt = os.path.join(os.path.dirname(__file__), "..", args.input)
        if os.path.exists(alt):
            input_path = alt
        else:
            # also try direct
            input_path = args.input

    output_path = args.output
    if not os.path.isabs(output_path) and not os.path.exists(os.path.dirname(output_path)):
        # ensure data dir
        alt_out = os.path.join(os.path.dirname(__file__), "..", output_path)
        if os.path.dirname(alt_out):
            os.makedirs(os.path.dirname(alt_out), exist_ok=True)
        output_path = alt_out if os.path.exists(os.path.dirname(alt_out)) else args.output

    print(f"Loading {input_path} ...")
    data = load_csv(input_path)
    print("Validating...")
    validate(data)
    print("Adding calendar features (idempotent)...")
    data = add_calendar_features(data)
    print("Creating lag/rolling features (lag_1_day, lag_7_day, rolling_7_day_mean, rolling_14_day_mean)...")
    data = create_lag_rolling_features(data)

    # Save model-ready dataset
    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    if HAS_PANDAS:
        data.to_csv(output_path, index=False)
        print(f"Saved model-ready dataset to {output_path} ({len(data)} rows, columns {list(data.columns)})")
        # Show tail of features
        print(data[["date","city","service_id","booking_count","lag_1_day","lag_7_day","rolling_7_day_mean","rolling_14_day_mean"]].head(10).to_string())
    else:
        fieldnames = list(data[0].keys())
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        print(f"Saved model-ready dataset to {output_path} ({len(data)} rows)")

if __name__ == "__main__":
    main()
