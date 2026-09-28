import json
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import SimulationRun, ModelVersion, User
from app.schemas.schemas import NormalizedEventInput, SimulationRunResponse
from app.services.ingestion_service import ingestion_service
from app.services.audit_service import audit_service

class SimulationService:
    SCENARIO_GENERATORS = {
        "BRUTE_FORCE": [
            {"event_type": "AUTH_FAILURE", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "FAILURE", "user": "admin", "msg": "SSH authentication failure for user admin from 198.51.100.45 port 52311"},
            {"event_type": "AUTH_FAILURE", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "FAILURE", "user": "admin", "msg": "SSH authentication failure for user admin: invalid credentials"},
            {"event_type": "AUTH_FAILURE", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "FAILURE", "user": "admin", "msg": "SSH authentication failure for user admin: invalid credentials"},
            {"event_type": "AUTH_FAILURE", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "FAILURE", "user": "admin", "msg": "SSH repeated failure: password authentication failed"},
            {"event_type": "AUTH_SUCCESS", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "SUCCESS", "user": "admin", "msg": "Accepted password for admin from 198.51.100.45 port 52315 ssh2"},
            {"event_type": "PRIVILEGE_ACCESS", "src_ip": "198.51.100.45", "dst_ip": "10.0.0.15", "dst_port": 22, "proto": "TCP", "status": "SUCCESS", "user": "root", "msg": "admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash privilege escalation elevation"}
        ],
        "PORT_SCAN": [
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 21, "proto": "TCP", "status": "BLOCKED", "user": None, "msg": "SYN probe detected on FTP port 21"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 22, "proto": "TCP", "status": "BLOCKED", "user": None, "msg": "SYN probe detected on SSH port 22"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 23, "proto": "TCP", "status": "BLOCKED", "user": None, "msg": "SYN probe detected on Telnet port 23"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 80, "proto": "TCP", "status": "ALLOWED", "user": None, "msg": "SYN connection established HTTP port 80"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 443, "proto": "TCP", "status": "ALLOWED", "user": None, "msg": "SYN connection established HTTPS port 443"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 3389, "proto": "TCP", "status": "BLOCKED", "user": None, "msg": "SYN probe detected on RDP port 3389"},
            {"event_type": "PORT_SCAN", "src_ip": "203.0.113.88", "dst_ip": "10.0.0.20", "dst_port": 8080, "proto": "TCP", "status": "BLOCKED", "user": None, "msg": "SYN probe detected on Alt-HTTP port 8080"}
        ],
        "WEB_ATTACK": [
            {"event_type": "WEB_REQUEST", "src_ip": "185.220.101.5", "dst_ip": "10.0.0.10", "dst_port": 443, "proto": "TCP", "status": "SUCCESS", "user": None, "msg": "GET /products/view?id=45 HTTP/1.1 200 OK"},
            {"event_type": "WEB_REQUEST", "src_ip": "185.220.101.5", "dst_ip": "10.0.0.10", "dst_port": 443, "proto": "TCP", "status": "FAILURE", "user": None, "msg": "GET /api/v1/auth?user=admin%27%20OR%201=1-- HTTP/1.1 SQLi injection attempt detected"},
            {"event_type": "WEB_REQUEST", "src_ip": "185.220.101.5", "dst_ip": "10.0.0.10", "dst_port": 443, "proto": "TCP", "status": "FAILURE", "user": None, "msg": "GET /download?file=../../../../etc/passwd HTTP/1.1 directory traversal payload"},
            {"event_type": "WEB_REQUEST", "src_ip": "185.220.101.5", "dst_ip": "10.0.0.10", "dst_port": 443, "proto": "TCP", "status": "FAILURE", "user": None, "msg": "POST /comments payload contains <script>alert(document.cookie)</script> XSS vector"}
        ],
        "SUSPICIOUS_LOGIN": [
            {"event_type": "AUTH_FAILURE", "src_ip": "91.240.118.12", "dst_ip": "10.0.0.25", "dst_port": 443, "proto": "TCP", "status": "FAILURE", "user": "sarah.finance", "msg": "SSO login failure: invalid MFA token from unrecognized country"},
            {"event_type": "SUSPICIOUS_LOGIN", "src_ip": "91.240.118.12", "dst_ip": "10.0.0.25", "dst_port": 443, "proto": "TCP", "status": "SUCCESS", "user": "sarah.finance", "msg": "Suspicious login off-hours from atypical geolocation ASN49221"},
            {"event_type": "DATA_ACCESS", "src_ip": "91.240.118.12", "dst_ip": "10.0.0.25", "dst_port": 443, "proto": "TCP", "status": "SUCCESS", "user": "sarah.finance", "msg": "Bulk customer records accessed via API query (/api/v2/financial-reports)"}
        ],
        "PRIVILEGE_ESCALATION": [
            {"event_type": "AUTH_SUCCESS", "src_ip": "192.168.1.55", "dst_ip": "10.0.0.12", "dst_port": 22, "proto": "TCP", "status": "SUCCESS", "user": "contractor01", "msg": "Authorized SSH logon for standard contractor account"},
            {"event_type": "PROCESS_SPAWN", "src_ip": "192.168.1.55", "dst_ip": "10.0.0.12", "dst_port": 22, "proto": "TCP", "status": "SUCCESS", "user": "contractor01", "msg": "Process spawned: sudo -u root /usr/bin/find . -exec /bin/sh \\;"},
            {"event_type": "PRIVILEGE_ACCESS", "src_ip": "192.168.1.55", "dst_ip": "10.0.0.12", "dst_port": 22, "proto": "TCP", "status": "SUCCESS", "user": "root", "msg": "Privilege escalation: User contractor01 escalated to effective UID 0 (root)"}
        ],
        "DATA_EXFILTRATION": [
            {"event_type": "AUTH_SUCCESS", "src_ip": "192.168.1.18", "dst_ip": "10.0.0.30", "dst_port": 443, "proto": "TCP", "status": "SUCCESS", "user": "dev_backup", "msg": "Internal session established for database backup service"},
            {"event_type": "OUTBOUND_CONNECTION", "src_ip": "10.0.0.30", "dst_ip": "198.51.100.99", "dst_port": 8443, "proto": "TCP", "status": "ALLOWED", "user": "dev_backup", "msg": "Anomalous large encrypted outbound flow to unrecognized IP: 14,250,000 bytes transferred exfiltration spike"}
        ]
    }

    @classmethod
    async def run_scenario(cls, db: Session, scenario: str, started_by_user_id: Optional[str] = None) -> SimulationRunResponse:
        scenario_key = scenario.upper().strip()
        templates = cls.SCENARIO_GENERATORS.get(scenario_key)
        if not templates:
            raise ValueError(f"Unknown scenario '{scenario}'. Available: {list(cls.SCENARIO_GENERATORS.keys())}")

        now = datetime.datetime.now(datetime.timezone.utc)
        sim_run = SimulationRun(
            scenario=scenario_key,
            started_by=started_by_user_id,
            status="RUNNING",
            events_generated=0,
            alerts_generated=0,
            incidents_generated=0,
            started_at=now
        )
        db.add(sim_run)
        db.commit()
        db.refresh(sim_run)

        # Active model version
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        active_model_id = active_model.id if active_model else None

        events_created = 0
        alerts_created = 0
        incidents_created = 0
        generated_incident_ids = []

        base_time = now - datetime.timedelta(minutes=len(templates))

        for idx, t in enumerate(templates):
            event_time = base_time + datetime.timedelta(seconds=idx * 20)
            
            src_bytes = 150
            if scenario_key == "DATA_EXFILTRATION" and idx == len(templates) - 1:
                src_bytes = 14250000
            elif scenario_key == "PORT_SCAN":
                src_bytes = 60

            norm_input = NormalizedEventInput(
                timestamp=event_time,
                source_ip=t["src_ip"],
                destination_ip=t.get("dst_ip"),
                source_port=50000 + idx,
                destination_port=t.get("dst_port"),
                protocol=t.get("proto", "TCP"),
                username=t.get("user"),
                event_type=t["event_type"],
                status=t.get("status", "SUCCESS"),
                action="ALLOW" if t.get("status") == "SUCCESS" else "BLOCK",
                message=t["msg"],
                raw_log=f"SIMULATED_LOG: {t['msg']}",
                source_type="SIMULATION"
            )

            # Run through the EXACT live detection pipeline
            db_ev, alert, inc = await ingestion_service.process_normalized_event(
                db=db,
                norm_event=norm_input,
                active_model_version_id=active_model_id
            )
            events_created += 1
            if alert:
                alerts_created += 1
            if inc:
                incidents_created += 1
                if inc.incident_number not in generated_incident_ids:
                    generated_incident_ids.append(inc.incident_number)

        sim_run.status = "COMPLETED"
        sim_run.events_generated = events_created
        sim_run.alerts_generated = alerts_created
        sim_run.incidents_generated = len(generated_incident_ids)
        sim_run.completed_at = datetime.datetime.now(datetime.timezone.utc)
        sim_run.results = json.dumps({
            "scenario": scenario_key,
            "events_count": events_created,
            "alerts_count": alerts_created,
            "incidents": generated_incident_ids,
            "message": f"Successfully simulated {scenario_key} scenario through live detection pipeline."
        })

        # Audit log
        user = db.query(User).filter(User.id == started_by_user_id).first() if started_by_user_id else None
        audit_service.log_action(
            db=db,
            action="simulation_run",
            resource_type="simulation",
            resource_id=sim_run.id,
            user_id=started_by_user_id,
            result="SUCCESS",
            details={
                "scenario": scenario_key,
                "events_created": events_created,
                "alerts_created": alerts_created,
                "incidents_created": len(generated_incident_ids)
            }
        )

        db.commit()
        db.refresh(sim_run)

        return SimulationRunResponse(
            id=sim_run.id,
            scenario=sim_run.scenario,
            status=sim_run.status,
            started_by_name=user.username if user else "Automated Test Runner",
            events_generated=sim_run.events_generated,
            alerts_generated=sim_run.alerts_generated,
            incidents_generated=sim_run.incidents_generated,
            started_at=sim_run.started_at,
            completed_at=sim_run.completed_at,
            results_summary=json.loads(sim_run.results) if sim_run.results else None
        )

simulation_service = SimulationService()
