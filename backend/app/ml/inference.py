import os
import json
import logging
from typing import Dict, Any, Tuple
import numpy as np
import joblib

logger = logging.getLogger("soc.ml")

class FeatureExtractor:
    FEATURE_NAMES = [
        "duration", "src_bytes", "dst_bytes", "src_port", "dst_port",
        "protocol_num", "count_10s", "srv_count_10s", "failed_logins",
        "is_privileged", "outbound_bytes_rate"
    ]

    @staticmethod
    def extract_from_event(event_dict: Dict[str, Any]) -> np.ndarray:
        """
        Converts normalized event dictionary to numerical feature array.
        """
        # Duration in seconds
        duration = float(event_dict.get("duration", 0.5) or 0.5)
        src_bytes = float(event_dict.get("src_bytes", 150) or 150)
        dst_bytes = float(event_dict.get("dst_bytes", 0) or 0)
        src_port = float(event_dict.get("source_port", 49152) or 49152)
        dst_port = float(event_dict.get("destination_port", 80) or 80)
        
        protocol_str = str(event_dict.get("protocol", "TCP")).upper()
        protocol_num = 1.0 if protocol_str == "TCP" else (2.0 if protocol_str == "UDP" else 3.0)
        
        count_10s = float(event_dict.get("count_10s", 1) or 1)
        srv_count_10s = float(event_dict.get("srv_count_10s", 1) or 1)
        
        # Derive failed logins and privileged status from event types
        event_type = str(event_dict.get("event_type", "")).upper()
        status = str(event_dict.get("status", "")).upper()
        
        failed_logins = float(event_dict.get("failed_logins", 0) or 0)
        if "AUTH_FAILURE" in event_type or ("AUTH" in event_type and status == "FAILURE"):
            if failed_logins == 0:
                failed_logins = 1.0

        is_privileged = float(event_dict.get("is_privileged", 0) or 0)
        username = str(event_dict.get("username", "")).lower()
        if username in ["root", "admin", "administrator", "system"] or "PRIVILEGE" in event_type:
            is_privileged = 1.0
            
        outbound_bytes_rate = src_bytes / max(duration, 0.05)

        features = [
            duration, src_bytes, dst_bytes, src_port, dst_port,
            protocol_num, count_10s, srv_count_10s, failed_logins,
            is_privileged, outbound_bytes_rate
        ]
        return np.array([features], dtype=np.float64)

class MLInferenceEngine:
    def __init__(self, artifacts_dir: str = None):
        if artifacts_dir is None:
            # Locate artifacts directory relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.artifacts_dir = os.path.join(base_dir, "artifacts")
        else:
            self.artifacts_dir = artifacts_dir

        self.scaler = None
        self.classifier = None
        self.cat_classifier = None
        self.anomaly_detector = None
        self.label_encoder = None
        self.cat_encoder = None
        self.metadata = {}
        self.is_loaded = False
        
        self.load_artifacts()

    def load_artifacts(self):
        try:
            scaler_path = os.path.join(self.artifacts_dir, "scaler.joblib")
            clf_path = os.path.join(self.artifacts_dir, "best_classifier.joblib")
            cat_path = os.path.join(self.artifacts_dir, "category_classifier.joblib")
            iso_path = os.path.join(self.artifacts_dir, "isolation_forest.joblib")
            lbl_path = os.path.join(self.artifacts_dir, "label_encoder.joblib")
            cat_lbl_path = os.path.join(self.artifacts_dir, "cat_encoder.joblib")
            meta_path = os.path.join(self.artifacts_dir, "model_metadata.json")

            if (os.path.exists(scaler_path) and os.path.exists(clf_path) and 
                os.path.exists(iso_path) and os.path.exists(lbl_path)):
                self.scaler = joblib.load(scaler_path)
                self.classifier = joblib.load(clf_path)
                self.cat_classifier = joblib.load(cat_path)
                self.anomaly_detector = joblib.load(iso_path)
                self.label_encoder = joblib.load(lbl_path)
                self.cat_encoder = joblib.load(cat_lbl_path)
                
                if os.path.exists(meta_path):
                    with open(meta_path, "r") as f:
                        self.metadata = json.load(f)
                        
                self.is_loaded = True
                logger.info("ML inference artifacts successfully loaded.")
            else:
                logger.warning("ML artifacts not found in %s. Please run ml/train.py", self.artifacts_dir)
        except Exception as e:
            logger.error("Failed to load ML artifacts: %s", str(e))
            self.is_loaded = False

    def predict(self, event_dict: Dict[str, Any]) -> Tuple[str, float, str, float, bool]:
        """
        Runs both supervised and unsupervised inference on a single normalized event.
        Returns:
            (prediction, confidence, attack_category, anomaly_score, is_anomaly)
        """
        if not self.is_loaded:
            self.load_artifacts()
            if not self.is_loaded:
                # Safe heuristic fallback if model artifacts fail to load
                return ("NORMAL", 0.5, "NORMAL", 0.0, False)

        X = FeatureExtractor.extract_from_event(event_dict)
        X_scaled = self.scaler.transform(X)

        # 1. Supervised prediction
        probs = self.classifier.predict_proba(X_scaled)[0]
        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])
        prediction = str(self.label_encoder.inverse_transform([pred_idx])[0])

        # 2. Attack category
        cat_idx = self.cat_classifier.predict(X_scaled)[0]
        attack_category = str(self.cat_encoder.inverse_transform([cat_idx])[0])

        # 3. Anomaly detection (Isolation Forest)
        # decision_function gives negative values for anomalies, positive for normal
        raw_score = float(self.anomaly_detector.decision_function(X_scaled)[0])
        # Map raw decision function into normalized anomaly score 0.0 - 1.0 (higher = more anomalous)
        # Typically score ranges from -0.3 to +0.3
        anomaly_score = max(0.0, min(1.0, round(0.5 - (raw_score * 1.5), 3)))
        is_anomaly = bool(self.anomaly_detector.predict(X_scaled)[0] == -1)

        return (prediction, confidence, attack_category, anomaly_score, is_anomaly)

ml_engine = MLInferenceEngine()
