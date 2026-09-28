"""
Machine Learning Training & Evaluation Pipeline for AI Autonomous SOC
- Candidate Models: Logistic Regression, Random Forest, Gradient Boosting
- Anomaly Model: Isolation Forest
- Metric Evaluation: Precision, Recall, F1, ROC-AUC, FPR, Confusion Matrix
- Artifact Generation: Serialized models, scaler, metadata JSON
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath("."))
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, IsolationForest
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

def run_training_pipeline():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(base_dir, ".."))
    data_dir = os.path.join(base_dir, "data")
    artifacts_dir = os.path.join(repo_root, "backend", "app", "ml", "artifacts")

    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(artifacts_dir, exist_ok=True)

    csv_path = os.path.join(data_dir, "cybersecurity_traffic.csv")
    if not os.path.exists(csv_path):
        from dataset import generate_cybersecurity_dataset
        df = generate_cybersecurity_dataset(5000)
        df.to_csv(csv_path, index=False)
    else:
        df = pd.read_csv(csv_path)

    features = [
        "duration", "src_bytes", "dst_bytes", "src_port", "dst_port",
        "protocol_num", "count_10s", "srv_count_10s", "failed_logins",
        "is_privileged", "outbound_bytes_rate"
    ]

    X = df[features]
    y_label = df["label"] # NORMAL, SUSPICIOUS, MALICIOUS
    y_cat = df["attack_category"]

    # Stratified Split: 80% train, 20% test
    X_train, X_test, y_train, y_test, cat_train, cat_test = train_test_split(
        X, y_label, y_cat, test_size=0.20, random_state=42, stratify=y_label
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Encode labels
    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(y_train)
    y_test_enc = label_encoder.transform(y_test)

    # Also train category classifier to predict attack category
    cat_encoder = LabelEncoder()
    cat_train_enc = cat_encoder.fit_transform(cat_train)
    cat_test_enc = cat_encoder.transform(cat_test)

    candidates = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
    }

    eval_results = {}
    best_model_name = None
    best_f1 = -1.0

    print("Evaluating candidate supervised models on held-out test set...")
    for name, model in candidates.items():
        model.fit(X_train_scaled, y_train_enc)
        preds = model.predict(X_test_scaled)
        probs = model.predict_proba(X_test_scaled)

        acc = float(accuracy_score(y_test_enc, preds))
        prec = float(precision_score(y_test_enc, preds, average="weighted", zero_division=0))
        rec = float(recall_score(y_test_enc, preds, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test_enc, preds, average="weighted", zero_division=0))
        
        try:
            auc = float(roc_auc_score(y_test_enc, probs, multi_class="ovr", average="weighted"))
        except Exception:
            auc = 0.0

        # Calculate False Positive Rate specifically on NORMAL class:
        # Normal is encoded as whatever index label_encoder.transform(['NORMAL'])[0] is
        normal_idx = int(label_encoder.transform(["NORMAL"])[0])
        cm = confusion_matrix(y_test_enc, preds)
        # FP on normal = when actual was NORMAL but predicted not NORMAL
        total_normal = int(np.sum(cm[normal_idx, :]))
        true_normal = int(cm[normal_idx, normal_idx])
        fp_normal = total_normal - true_normal
        fpr = float(fp_normal / total_normal) if total_normal > 0 else 0.0

        eval_results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "false_positive_rate": round(fpr, 4),
            "confusion_matrix": cm.tolist()
        }

        print(f"[{name}] Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f} | FPR: {fpr:.4f}")

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name

    print(f"\nSelected Best Supervised Model: {best_model_name} (F1: {best_f1:.4f})")
    best_clf = candidates[best_model_name]

    # Category classifier using Random Forest for multi-class attack categories
    cat_clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    cat_clf.fit(X_train_scaled, cat_train_enc)

    # Train Isolation Forest Anomaly Detector
    print("Training Isolation Forest Anomaly Detector...")
    # Train primarily on normal patterns with contamination=0.10
    iso_forest = IsolationForest(n_estimators=100, contamination=0.10, random_state=42)
    iso_forest.fit(X_train_scaled)

    # Save artifacts using absolute path
    joblib.dump(scaler, os.path.join(artifacts_dir, "scaler.joblib"))
    joblib.dump(best_clf, os.path.join(artifacts_dir, "best_classifier.joblib"))
    joblib.dump(cat_clf, os.path.join(artifacts_dir, "category_classifier.joblib"))
    joblib.dump(iso_forest, os.path.join(artifacts_dir, "isolation_forest.joblib"))
    joblib.dump(label_encoder, os.path.join(artifacts_dir, "label_encoder.joblib"))
    joblib.dump(cat_encoder, os.path.join(artifacts_dir, "cat_encoder.joblib"))

    metadata = {
        "active_model_name": best_model_name,
        "version": "v1.0.0",
        "algorithm": f"Ensemble ({best_model_name} + Isolation Forest)",
        "dataset_name": "Cybersecurity Intrusion Telemetry Benchmark v1",
        "dataset_records": len(df),
        "train_records": len(X_train),
        "test_records": len(X_test),
        "features": features,
        "label_classes": list(label_encoder.classes_),
        "attack_categories": list(cat_encoder.classes_),
        "selected_metrics": eval_results[best_model_name],
        "candidate_comparisons": eval_results,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "status": "ACTIVE"
    }

    with open(os.path.join(artifacts_dir, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Artifacts successfully saved to {artifacts_dir}/")
    return metadata

if __name__ == "__main__":
    run_training_pipeline()
