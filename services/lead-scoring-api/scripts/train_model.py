"""Standalone module used to train and serialize a simple XGBoost model.

This script creates a synthetic dataset, fits a classifier and saves the
resulting model as ``xgb_model.pkl`` in the current working directory.  It
was originally intended for demonstration; a real project would load data
from an external source and include proper experiment tracking.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


def make_synthetic_data(
    n_samples: int = 1_000, random_state: int = 42
) -> pd.DataFrame:
    """Create a dummy dataset matching the feature schema used by the API."""

    rng = np.random.default_rng(seed=random_state)
    df = pd.DataFrame(
        {
            "age": rng.integers(20, 60, size=n_samples),
            "income": rng.integers(20_000, 100_000, size=n_samples),
            "browsing_frequency": rng.integers(1, 20, size=n_samples),
            "time_spent": rng.uniform(1, 30, size=n_samples),
            "location_score": rng.uniform(0, 1, size=n_samples),
        }
    )
    df["converted"] = (
        0.3 * df["browsing_frequency"]
        + 0.4 * df["time_spent"]
        + 0.2 * df["location_score"]
        + rng.normal(0, 2, size=n_samples)
    ) > 15
    return df


def train_and_evaluate(
    data: pd.DataFrame, model_path: str = "xgb_model.pkl"
) -> None:
    """Fit a classifier on the provided data and save the serialized model."""

    X = data.drop(columns="converted")
    y = data["converted"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = XGBClassifier(
        n_estimators=100, learning_rate=0.1, max_depth=5, eval_metric="logloss"
    )
    model.fit(X_train, y_train)

    preds = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, preds)
    print(f"ROC AUC: {auc:.4f}")

    joblib.dump(model, model_path)
    print(f"model saved to {model_path}")


def main() -> None:
    default_output = Path(__file__).resolve().parents[1] / "models" / "xgb_model.pkl"
    parser = argparse.ArgumentParser(description="Train a simple lead scoring model")
    parser.add_argument(
        "--output",
        "-o",
        help="where to save the trained model",
        default=str(default_output),
    )
    args = parser.parse_args()

    df = make_synthetic_data()
    train_and_evaluate(df, args.output)


if __name__ == "__main__":
    main()
