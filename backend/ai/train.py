import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
import shap

# Load data
df = pd.read_csv("ai/data.csv")

X = df[["visits", "timeSpent", "budget", "urgencyScore"]]
y = df["converted"]

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Random Forest": RandomForestClassifier(),
    "XGBoost": XGBClassifier(eval_metric='logloss')
}

print("\n=== MODEL COMPARISON ===\n")

best_model = None
best_score = 0

for name, model in models.items():
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    roc = roc_auc_score(y_test, probs)

    print(f"{name}")
    print(f"Accuracy: {acc:.2f}")
    print(f"Precision: {prec:.2f}")
    print(f"Recall: {rec:.2f}")
    print(f"ROC-AUC: {roc:.2f}\n")

    if roc > best_score:
        best_score = roc
        best_model = model

# ================= SHAP =================
print("=== SHAP EXPLANATION ===")

explainer = shap.Explainer(best_model, X_train)
shap_values = explainer(X_test)

print("Top feature impact:")
print(shap_values.values[:5])
