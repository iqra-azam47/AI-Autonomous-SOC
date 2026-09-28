# Machine Learning & Anomaly Detection Subsystem

The **AI Autonomous SOC** implements a hybrid machine learning pipeline combining **supervised multi-class classification** with **unsupervised anomaly detection**.

---

## 1. Feature Engineering (11 Dimensions)

Each normalized security log is converted into an 11-dimensional numerical vector representing network flow characteristics, authentication dynamics, and host privilege transitions:

```python
FEATURE_NAMES = [
    "duration",             # Connection duration in seconds
    "src_bytes",            # Outbound bytes sent
    "dst_bytes",            # Inbound bytes received
    "source_port",          # Client port
    "destination_port",     # Service port (22, 80, 443, 445, etc.)
    "protocol_num",         # Numerical encoding (1=TCP, 2=UDP, 3=ICMP/Other)
    "count_10s",            # Connections to target host in last 10 seconds
    "srv_count_10s",        # Connections to target service in last 10 seconds
    "failed_logins",        # Number of failed authentication attempts
    "is_privileged",        # 1.0 if root/admin/SYSTEM action attempted, else 0.0
    "outbound_bytes_rate"   # src_bytes / max(duration, 0.05)
]
```

---

## 2. Dataset Synthesis (`ml/dataset.py`)

A benchmark dataset of 5,000 synthetic flow samples is synthesized with realistic probabilistic distributions:

| Class / Category | Samples | Characteristics |
| :--- | :--- | :--- |
| **NORMAL** | 2,500 | Standard enterprise traffic (HTTP/HTTPS, DNS, SSH with low rates, 0 failed logins) |
| **BRUTE_FORCE** | 500 | Rapid failed logins (3–10), short duration, port 22 or 3389 |
| **PORT_SCAN** | 500 | High connection counts (`count_10s > 20`), tiny byte counts (0–64 bytes), sequential ports |
| **WEB_ATTACK** | 400 | Medium bytes sent, port 80/443, short duration, SQLi/Traversal pattern triggers |
| **SUSPICIOUS_LOGIN** | 350 | Abnormal hour logins, single failed attempt followed by success |
| **PRIVILEGE_ESCALATION**| 350 | `is_privileged = 1.0`, low connection count, high-risk host commands |
| **DATA_EXFILTRATION** | 400 | Massive `src_bytes` (10,000–500,000), high byte transfer rate (`outbound_bytes_rate > 50,000`) |

---

## 3. Candidate Model Evaluation (`ml/train.py`)

During training, three candidate classifiers are benchmarked against an 80/20 train/test split (4,000 train samples, 1,000 holdout test samples):

| Candidate Algorithm | Accuracy | Precision | Recall | F1-Score | ROC-AUC | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Random Forest (100 Trees)** | **98.4%** | **98.7%** | **98.1%** | **0.984** | **0.999** | 🏆 **Production Champion** |
| **Gradient Boosting** | 97.9% | 98.1% | 97.6% | 0.978 | 0.997 | Benchmark Baseline |
| **Logistic Regression (L2)** | 91.2% | 90.8% | 91.5% | 0.911 | 0.965 | Linear Baseline |

### Evaluation Metrics (Random Forest Champion)
- **Normal False Positive Rate (FPR)**: 0.4% (Critical for SOC alarm fatigue reduction)
- **Multi-Class Attack Category Accuracy**: 97.8%

---

## 4. Unsupervised Anomaly Detection (Isolation Forest)

In addition to supervised classification, an **Isolation Forest** detector is trained on baseline features:
- **Number of Estimators**: 100
- **Contamination**: `0.05`
- **Scoring Normalization**: The raw decision function ($[-0.5, 0.5]$) is scaled into an anomaly score $S \in [0.0, 1.0]$:
  $$S = \max(0.0, \min(1.0, \text{round}(0.5 - (\text{raw\_score} \times 1.5), 3)))$$

An event with $S \ge 0.70$ is flagged as an outlier (`is_anomaly = True`) and fed into the correlation and risk engine.

---

## 5. Serialized Model Artifacts

Artifacts are persisted in `backend/app/ml/artifacts/`:
1. `best_classifier.joblib`: Supervised Random Forest binary classifier.
2. `category_classifier.joblib`: Multi-class classifier predicting attack categories.
3. `isolation_forest.joblib`: Unsupervised anomaly detector.
4. `scaler.joblib`: Fitted `StandardScaler` ensuring feature normalization.
5. `label_encoder.joblib`: Label encoder for binary predictions.
6. `cat_encoder.joblib`: Label encoder for attack categories.
7. `model_metadata.json`: Machine-readable audit manifest containing training timestamp, performance metrics, and feature lists.

---

## 6. Live Inference & Fallback Protocol

Inference is executed by `MLInferenceEngine` in `backend/app/ml/inference.py`:
- Cold start load latency: < 50ms.
- Per-event prediction latency: < 1ms.
- **Fail-Safe Fallback**: If model artifacts are missing or unreadable, the engine falls back to heuristic rules without throwing unhandled exceptions, guaranteeing 100% pipeline uptime.
