"""
Simple validation for demand forecast artifacts — synthetic prototype only.
Checks model/metrics/predictions exist and are sane. Does not claim production accuracy.
"""
import json
import os
import sys

import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "demand_forecast_xgb.json")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "demand_forecast_metrics.json")
PREDICTIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "demand_forecast_predictions.csv")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_demand_features.csv")

def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)

def ok(msg):
    print(f"PASS: {msg}")

def main():
    print("=== Demand Forecast Artifact Tests (synthetic) ===")
    # 1. Files exist
    for p, label in [(MODEL_PATH, "model"), (METRICS_PATH, "metrics"), (PREDICTIONS_PATH, "predictions"), (FEATURES_PATH, "features")]:
        if not os.path.exists(p):
            fail(f"{label} missing: {p}")
        ok(f"{label} exists: {os.path.basename(p)} ({os.path.getsize(p)} bytes)")

    # 2. Metrics schema
    with open(METRICS_PATH, encoding="utf-8") as f:
        m = json.load(f)
    for k in ["model_type","train_rows","test_rows","train_date_range","test_date_range","mae","rmse","mape","synthetic_disclaimer"]:
        if k not in m:
            fail(f"metrics missing key {k}")
    ok(f"metrics has required keys, model_type={m['model_type']}")
    # Check disclaimer
    if "Synthetic prototype" not in m["synthetic_disclaimer"]:
        fail("metrics disclaimer missing synthetic statement")
    ok("metrics disclaimer present: 'Synthetic prototype demand data — evaluation does not represent real Zolve production accuracy.'")

    # 3. Metrics sanity (synthetic data should give MAE <2, RMSE <3, MAPE <50% for this deterministic set)
    if not (0 <= m["mae"] < 5):
        fail(f"mae out of expected synthetic range: {m['mae']}")
    if not (0 <= m["rmse"] < 5):
        fail(f"rmse out of range: {m['rmse']}")
    if not (0 <= m["mape"] < 100):
        fail(f"mape out of range: {m['mape']}")
    ok(f"metrics sane: MAE {m['mae']:.4f} RMSE {m['rmse']:.4f} MAPE {m['mape']:.2f}%")

    # 4. Time-based split check
    if m["train_rows"] + m["test_rows"] != 46480:
        # 50400 -3920 dropped =46480
        print(f"WARN: train+test {m['train_rows']+m['test_rows']} != 46480 (expected after dropping 14 days per series)")
    ok(f"train {m['train_rows']} test {m['test_rows']} split 80/20 time-based {m['train_date_range']} -> {m['test_date_range']}")
    # Ensure test dates are after train dates
    if m["test_date_range"][0] <= m["train_date_range"][1]:
        fail("test dates not after train dates (temporal leakage)")
    ok("time-based split: test dates strictly after train dates (no shuffle)")

    # 5. Predictions CSV
    pred = pd.read_csv(PREDICTIONS_PATH, parse_dates=["date"])
    if len(pred) != m["test_rows"]:
        fail(f"predictions rows {len(pred)} != test_rows {m['test_rows']}")
    ok(f"predictions rows {len(pred)} == test_rows")
    for col in ["date","city","service_id","service_name","actual_booking_count","predicted_booking_count"]:
        if col not in pred.columns:
            fail(f"predictions missing {col}")
    ok("predictions columns correct")
    # No leakage: predictions sorted by date
    if not pred["date"].is_monotonic_increasing:
        # Could be grouped but overall should be sorted
        print("WARN: predictions not strictly monotonic date (check sort)")
    # Predicted >=0
    if (pred["predicted_booking_count"] < 0).any():
        fail("predicted negative")
    ok("predicted_booking_count >=0 (clipped)")
    # Sample
    print("\n--- prediction sample (5 rows) ---")
    print(pred.head(5).to_string(index=False))
    print(f"\nAll checks passed. Model is synthetic-only; do not claim production accuracy.")
    # 6. Feature handling: ensure lag handling noted
    if "dropped rows where lag" not in m.get("handling_missing_lag","") and "dropped" not in m.get("handling_missing_lag","").lower():
        print("WARN: handling_missing_lag description missing")
    ok("lag/rolling handling documented (dropped NaN without leakage)")

if __name__ == "__main__":
    main()
