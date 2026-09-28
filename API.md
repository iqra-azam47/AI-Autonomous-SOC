# REST API Specification — AI Autonomous SOC

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI Documentation: `http://localhost:8000/docs`

---

## 1. Authentication (`/auth`)

### `POST /auth/login`
Authenticate operator credentials and obtain JWT bearer token.
- **Request Body**:
  ```json
  {
    "username_or_email": "analyst",
    "password": "AnalystPass123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "u-1234",
      "username": "analyst",
      "email": "analyst@soc.local",
      "role_name": "ANALYST"
    }
  }
  ```

### `GET /auth/me`
Retrieve authenticated session user profile and permissions.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: User profile object.

---

## 2. Dashboard (`/dashboard`)

### `GET /dashboard/metrics`
Retrieve top 8 operational SOC KPI counters.
- **Response `200 OK`**:
  ```json
  {
    "critical_incidents": 2,
    "active_incidents": 5,
    "high_risk_alerts": 14,
    "suspicious_events": 48,
    "events_today": 320,
    "total_events": 1240,
    "affected_assets": 4,
    "suspicious_ips": 6
  }
  ```

### `GET /dashboard/charts`
Aggregated visual data for charts (Severity distribution, Attack categories, Predictions, Asset targets, Events over time).

### `GET /dashboard/activity`
Live feed of the latest 15 alerts and status changes.

---

## 3. Events (`/events`)

### `GET /events`
Paginated search and filter for normalized security events.
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `event_type` (optional filter)
  - `source_ip` (optional filter)
  - `prediction` (`NORMAL`, `SUSPICIOUS`, `MALICIOUS`)
- **Response `200 OK`**: Paginated items and total counts.

### `GET /events/{id}`
Retrieve raw and normalized details for a specific security event.

---

## 4. Alerts (`/alerts`)

### `GET /alerts`
List triaged alerts with filtering by severity, status, and source IP.

### `PATCH /alerts/{id}/status`
Update alert status (`NEW`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`).

### `POST /alerts/{id}/escalate`
Immediately promote an alert into a full Correlated Incident ticket.

---

## 5. Incidents (`/incidents`)

### `GET /incidents`
List correlated incident tickets.
- **Query Parameters**: `status`, `severity`, `page`, `limit`.

### `GET /incidents/{id}`
Retrieve complete incident context:
- Incident record & primary asset info
- Correlated evidence security events
- MITRE ATT&CK techniques with evidence
- Analyst investigation notes
- Latest Gemini AI investigation dossier
- Itemized deterministic risk factors

### `PATCH /incidents/{id}/status`
Update incident lifecycle state (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`).

### `POST /incidents/{id}/notes`
Add human analyst note to the investigation timeline.

### `POST /incidents/{id}/contain`
Execute human-in-the-loop simulated containment.
- **Request Body**:
  ```json
  {
    "containment_type": "ISOLATE_HOST",
    "reason": "Confirmed active ransomware beaconing"
  }
  ```
- **Response `200 OK`**: Updates asset and incident status, records audit log entry, returns simulation disclaimer.

---

## 6. Threat Intelligence (`/intelligence`)

### `GET /intelligence/ip/{ip}`
Query IP indicator reputation.
- Enforces RFC 1918 private LAN filtering.
- Checks 24h local database cache before external querying.
- Correlates with local SOC event volume.

---

## 7. Assets (`/assets`)

### `GET /assets`
Retrieve enterprise inventory, criticality tiers, and alert/incident counts.

### `POST /assets`
Register a new enterprise asset (Admin/Analyst required).

---

## 8. MITRE ATT&CK (`/mitre`)

### `GET /mitre/techniques`
List all mapped techniques and counts of active associated SOC incidents.

### `GET /mitre/techniques/{id}`
Retrieve technique description and specific linked incidents.

---

## 9. Machine Learning Lab (`/ml`)

### `GET /ml/active`
Retrieve metadata, hyperparameters, and evaluation metrics for the active champion model.

### `POST /ml/test`
Execute real-time inference on arbitrary flow parameters:
- **Request Body**:
  ```json
  {
    "bytes_sent": 5000,
    "bytes_received": 120,
    "duration_seconds": 0.05,
    "failed_login_attempts": 6,
    "destination_port": 22,
    "packet_rate": 180.0,
    "protocol": "TCP"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "prediction": "MALICIOUS",
    "confidence": 0.985,
    "attack_category": "BRUTE_FORCE",
    "anomaly_score": 0.812,
    "is_anomaly": true
  }
  ```

---

## 10. Log Ingestion (`/ingestion`)

### `POST /ingestion/upload`
Upload log file (CSV, JSON, syslog).
- Returns parsing summary: records parsed, valid, events inserted, alerts generated, incidents created.

---

## 11. Attack Simulations (`/simulations`)

### `POST /simulations/run`
Trigger automated attack scenario:
- Scenarios: `BRUTE_FORCE`, `PORT_SCAN`, `WEB_ATTACK`, `SUSPICIOUS_LOGIN`, `PRIVILEGE_ESCALATION`, `DATA_EXFILTRATION`.

### `GET /simulations/history`
List past simulation execution runs.

---

## 12. Autonomous AI Analyst (`/ai`)

### `POST /ai/investigate/{incident_id}`
Trigger autonomous multi-section Gemini investigation dossier generation.

### `POST /ai/chat`
Conversational natural-language query interface grounded in live SOC database telemetry.

---

## 13. Reports & Audits (`/reports` & `/audit`)

### `GET /reports/activity?hours=24`
Generate Executive Security Activity report.

### `GET /reports/incident/{id}`
Generate comprehensive Incident Postmortem report.

### `GET /reports/ml`
Generate Machine Learning operational health audit report.

### `GET /audit/logs`
Paginated audit trail of all operator actions.
