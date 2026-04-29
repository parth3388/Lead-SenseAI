import pandas as pd
import shap
import json

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

# ================= LOAD DATA =================
df = pd.read_csv("ai/data.csv")

X = df[["visits", "timeSpent", "budget", "urgencyScore"]]
y = df["converted"]

# ================= SPLIT =================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ================= MODELS =================
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Random Forest": RandomForestClassifier(),
    "XGBoost": XGBClassifier(eval_metric='logloss')
}

results = {}
best_model = None
best_score = 0

# ================= TRAIN + EVALUATE =================
for name, model in models.items():
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    roc = roc_auc_score(y_test, probs)

    results[name] = {
        "accuracy": round(acc, 3),
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "roc_auc": round(roc, 3),
    }

    if roc > best_score:
        best_score = roc
        best_model = model

# ================= FEATURE IMPORTANCE =================
feature_importance = {}

if hasattr(best_model, "feature_importances_"):
    for i, col in enumerate(X.columns):
        feature_importance[col] = round(
            best_model.feature_importances_[i], 3
        )

# ================= SHAP =================
explainer = shap.Explainer(best_model, X_train)
shap_values = explainer(X_test)

shap_summary = {}

for i, col in enumerate(X.columns):
    shap_summary[col] = round(
        abs(shap_values.values[:, i]).mean(), 3
    )

# ================= FINAL OUTPUT =================
output = {
    "model_comparison": results,
    "best_model": type(best_model).__name__,
    "feature_importance": feature_importance,
    "shap_importance": shap_summary
}

print(json.dumps(output))
