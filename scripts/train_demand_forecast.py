"""
Synthetic prototype demand data — evaluation does not represent real Zolve production accuracy.
Train XGBoost demand forecast on synthetic_demand_features.csv (leakage-free lag/rolling).
Do NOT modify public.bookings. Do NOT insert synthetic bookings into Supabase.
"""
import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as XGB

# Fixed seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

INPUT_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_demand_features.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "demand_forecast_xgb.json")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "demand_forecast_metrics.json")
PREDICTIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "demand_forecast_predictions.csv")

FEATURES = [
    "lag_1_day",
    "lag_7_day",
    "rolling_7_day_mean",
    "rolling_14_day_mean",
    "day_of_week",
    "is_weekend",
    "month",
    "day_of_month",
    "city",
    "service_id",
]
TARGET = "booking_count"
CATEGORICAL = ["city", "service_id", "day_of_week"]
NUMERIC = ["lag_1_day", "lag_7_day", "rolling_7_day_mean", "rolling_14_day_mean", "is_weekend", "month", "day_of_month"]

def mape(y_true, y_pred):
    # Avoid division by zero; booking_count min 1 in synthetic, but handle
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

def main():
    print("Loading", INPUT_CSV)
    df = pd.read_csv(INPUT_CSV, parse_dates=["date"])
    # Ensure date is datetime.date for grouping but keep as datetime for sorting
    df["date"] = pd.to_datetime(df["date"])
    print(f"Loaded {len(df)} rows, columns {list(df.columns)}")
    # Validate required columns
    for col in FEATURES + [TARGET, "service_name"]:
        if col not in df.columns:
            raise ValueError(f"Missing column {col}")

    # Handle leakage: drop rows where any lag/rolling is NaN (first 14 days per city/service)
    before = len(df)
    df_valid = df.dropna(subset=["lag_1_day", "lag_7_day", "rolling_7_day_mean", "rolling_14_day_mean"]).copy()
    after = len(df_valid)
    print(f"Dropped {before - after} rows with NaN lag/rolling (leakage-free), remaining {after} rows")
    if after == 0:
        raise ValueError("No valid rows after dropping NaNs")

    # Sort by date for time-based split (never randomize temporal order)
    df_valid = df_valid.sort_values("date").reset_index(drop=True)

    # Time-based split: older dates -> train, newest -> test (80/20 by unique dates)
    unique_dates = sorted(df_valid["date"].unique())
    n_dates = len(unique_dates)
    # Use 80% dates for train
    split_idx = int(n_dates * 0.8)
    # Ensure at least 1 date in test
    if split_idx >= n_dates:
        split_idx = n_dates - 1
    train_dates = unique_dates[:split_idx]
    test_dates = unique_dates[split_idx:]
    train_cutoff = train_dates[-1]
    test_start = test_dates[0]

    train_df = df_valid[df_valid["date"].isin(train_dates)].copy()
    test_df = df_valid[df_valid["date"].isin(test_dates)].copy()

    print(f"Time-based split on {n_dates} valid dates ({df_valid['date'].min().date()} to {df_valid['date'].max().date()})")
    print(f"Train dates: {train_dates[0].date()} to {train_dates[-1].date()} ({len(train_dates)} days, {len(train_df)} rows)")
    print(f"Test dates:  {test_dates[0].date()} to {test_dates[-1].date()} ({len(test_dates)} days, {len(test_df)} rows)")

    # Prepare X/y
    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]
    X_test = test_df[FEATURES]
    y_test = test_df[TARGET]

    # Encode categoricals properly via OneHotEncoder (fit on train only)
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
            ("num", "passthrough", NUMERIC),
        ]
    )

    # XGBoost configuration - small/medium, reproducible
    xgb = XGB.XGBRegressor(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=RANDOM_SEED,
        seed=RANDOM_SEED,
        objective="reg:squarederror",
        eval_metric="rmse",
        n_jobs=-1,
        tree_method="hist",
        verbosity=0,
    )

    pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", xgb)])

    print("Training XGBoost regression model (reproducible, seed=42)...")
    pipeline.fit(X_train, y_train)

    # Predict
    y_pred_train = pipeline.predict(X_train)
    y_pred_test = pipeline.predict(X_test)

    # Clip predictions to >=0 (demand can't be negative) and round? Keep float for metrics but also clip
    y_pred_test_clipped = np.clip(y_pred_test, 0, None)
    y_pred_train_clipped = np.clip(y_pred_train, 0, None)

    mae = mean_absolute_error(y_test, y_pred_test_clipped)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred_test_clipped))
    mape_val = mape(y_test.values, y_pred_test_clipped)

    print(f"\n=== Evaluation (test set) ===")
    print(f"Training rows: {len(train_df)}")
    print(f"Test rows: {len(test_df)}")
    print(f"Train date range: {train_dates[0].date()} to {train_dates[-1].date()}")
    print(f"Test date range:  {test_dates[0].date()} to {test_dates[-1].date()}")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"MAPE: {mape_val:.2f}%")

    # Save model (XGBoost booster JSON) and also pipeline?
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    # Save the XGBoost model inside pipeline separately for pure JSON
    # Pipeline contains preprocessor; we save full pipeline via pickle? But requirement says models/demand_forecast_xgb.json
    # Save booster JSON
    booster = pipeline.named_steps["model"].get_booster()
    booster.save_model(MODEL_PATH)
    print(f"Saved XGBoost booster JSON to {MODEL_PATH}")

    # Also save pipeline feature names for inference reference (optional)
    # Save metrics
    metrics = {
        "model_type": "XGBoostRegressor",
        "random_seed": RANDOM_SEED,
        "n_estimators": 500,
        "max_depth": 8,
        "learning_rate": 0.05,
        "input_csv": "data/synthetic_demand_features.csv",
        "target": TARGET,
        "features": FEATURES,
        "categorical_features": CATEGORICAL,
        "numeric_features": NUMERIC,
        "handling_missing_lag": "dropped rows where lag_1_day/lag_7_day/rolling_7_day_mean/rolling_14_day_mean is NaN (first 14 days per city/service) without imputation to avoid leakage",
        "encoding": "OneHotEncoder(handle_unknown='ignore') for city/service_id/day_of_week, passthrough numeric",
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_date_range": [str(train_dates[0].date()), str(train_dates[-1].date())],
        "test_date_range": [str(test_dates[0].date()), str(test_dates[-1].date())],
        "train_dates_count": len(train_dates),
        "test_dates_count": len(test_dates),
        "mae": float(mae),
        "rmse": float(rmse),
        "mape": float(mape_val),
        "synthetic_disclaimer": "Synthetic prototype demand data — evaluation does not represent real Zolve production accuracy.",
        "time_based_split": "older dates -> training, newest dates -> testing, never randomized",
    }
    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics to {METRICS_PATH}")

    # Save prediction sample CSV: date, city, service_id, service_name, actual, predicted
    pred_df = test_df[["date", "city", "service_id", "service_name"]].copy()
    pred_df["actual_booking_count"] = y_test.values
    pred_df["predicted_booking_count"] = np.round(y_pred_test_clipped, 2)
    # Sort by date,city,service for readability
    pred_df = pred_df.sort_values(["date", "city", "service_id"])
    # Ensure date formatted as YYYY-MM-DD
    pred_df["date"] = pred_df["date"].dt.date.astype(str)
    os.makedirs(os.path.dirname(PREDICTIONS_PATH), exist_ok=True)
    pred_df.to_csv(PREDICTIONS_PATH, index=False)
    print(f"Saved predictions ({len(pred_df)} rows) to {PREDICTIONS_PATH}")

    print("\n--- Sample predictions (first 10 test rows) ---")
    print(pred_df.head(10).to_string(index=False))
    print("\n--- Sample predictions (random 5 mid) ---")
    print(pred_df.sample(5, random_state=RANDOM_SEED).to_string(index=False))

    # Print feature importance (top 10)
    try:
        # Get feature names after one-hot
        cat_encoder = pipeline.named_steps["preprocess"].named_transformers_["cat"]
        cat_features = cat_encoder.get_feature_names_out(CATEGORICAL)
        feature_names = list(cat_features) + NUMERIC
        importances = pipeline.named_steps["model"].feature_importances_
        pairs = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
        print("\n--- Top 10 feature importances ---")
        for name, imp in pairs[:10]:
            print(f"  {name}: {imp:.4f}")
    except Exception as e:
        print(f"Could not compute feature importances: {e}")

if __name__ == "__main__":
    main()
