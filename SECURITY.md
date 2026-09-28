# Security Architecture & Operational Guardrails — AI Autonomous SOC

## 1. Threat Modeling & Zero-Trust Posture

The **AI Autonomous SOC** platform is designed following defense-in-depth principles, recognizing that SOC consoles themselves are high-value targets for adversaries.

---

## 2. Deterministic Risk Invariant (Zero-Hallucination Guarantee)

Generative AI models are strictly prohibited from generating, modifying, or confirming the official numerical risk score.

```
+-------------------------------------------------------------+
|                     SOC BACKEND ENGINE                      |
|                                                             |
|  [ML Confidence]      -> 30%                                |
|  [Anomaly Outlier]    -> 20%                                |
|  [Matched Rules]      -> 25%   ===> Deterministic Math ===> | Official Risk: 85 (CRITICAL)
|  [Correlation Chain]  -> 15%                                |
|  [Asset Criticality]  -> 10%                                |
+-------------------------------------------------------------+
                               |
                               v (Read-Only Context)
+-------------------------------------------------------------+
|                      GOOGLE GEMINI AI                       |
|                                                             |
|  • Explains attack progression                              |
|  • Summarizes evidence logs                                 |
|  • Recommends operational containment steps                 |
|  • DOES NOT COMPUTE RISK SCORE                              |
+-------------------------------------------------------------+
```

---

## 3. RFC 1918 Private Subnet Shielding

To prevent enterprise internal infrastructure topology from leaking to third-party threat intelligence APIs, all IP indicators are evaluated prior to egress dispatch:

```python
import ipaddress

def is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return False
```

- When `is_private_ip(ip)` evaluates to `True`, external calls to **AbuseIPDB** and **VirusTotal** are bypassed.
- An alert is logged locally, and the indicator is evaluated solely against internal event telemetry.

---

## 4. Human-in-the-Loop Simulated Containment Guardrails

Automated active defense must never isolate critical production infrastructure without human attestation.
1. **Simulation Sandboxing**: Containment actions (e.g., `ISOLATE_HOST`, `KILL_PROCESS`, `BLOCK_IP`) update the database entity state to `CONTAINED`. No live host NIC or firewall route is physically disabled.
2. **Explicit Attestation**: The operator must provide a written containment justification recorded in the immutable audit log.
3. **Persistent UI Warning**: All containment dialogs and views feature a high-visibility disclaimer banner:
   > **SIMULATION ONLY — No physical network interface was modified.**

---

## 5. Role-Based Access Control (RBAC) Entitlements

FastAPI route dependencies enforce granular operational scopes:

| Scopes & Operations | ADMIN | ANALYST | VIEWER |
| :--- | :---: | :---: | :---: |
| View Telemetry, Dashboards, Timelines | ✅ | ✅ | ✅ |
| Access MITRE ATT&CK Matrix & Asset Inventory | ✅ | ✅ | ✅ |
| Ingest Raw Security Logs (CSV, JSON, Syslog) | ✅ | ✅ | ❌ |
| Run Attack Simulations in SOC Lab | ✅ | ✅ | ❌ |
| Request AI Autonomous Investigation Dossier | ✅ | ✅ | ❌ |
| Query SOC Telemetry via AI Chat | ✅ | ✅ | ❌ |
| Execute Simulated Host Containment | ✅ | ✅ | ❌ |
| Add Analyst Investigation Notes | ✅ | ✅ | ❌ |
| Manage Operator Accounts (Add/Deactivate) | ✅ | ❌ | ❌ |
| Modify System Settings & Risk Cutoffs | ✅ | ❌ | ❌ |

---

## 6. HTTP & Transport Security Headers

FastAPI middleware applies modern defense-in-depth HTTP headers to every outbound response:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (mitigates MIME-confusion attacks)
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (in production)
- `Referrer-Policy: strict-origin-when-cross-origin`

In-memory sliding-window rate limiting protects sensitive endpoints (`/api/auth/login`, `/api/ai/*`, `/api/simulations/*`, `/api/ingestion/*`) from denial of service and brute-force abuse.
