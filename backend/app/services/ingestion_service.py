import io
import csv
import json
import re
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import Event, Alert, Asset, MLPrediction, Anomaly, ModelVersion
from app.ml.inference import ml_engine
from app.detection.rules import rule_engine
from app.detection.correlation import correlation_engine
from app.detection.risk_engine import risk_engine
from app.services.incident_service import incident_service
from app.intelligence.service import threat_intel_service
from app.schemas.schemas import IngestionSummaryResponse, NormalizedEventInput

class IngestionService:
    IP_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

    @classmethod
    def parse_log_file(cls, content_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Parses CSV, JSON, or line-oriented raw log/text files into candidate dictionaries.
        """
        records = []
        errors = []
        filename_lower = filename.lower()

        try:
            text = content_bytes.decode("utf-8", errors="replace").strip()
        except Exception as e:
            return [], [f"Failed to decode file text: {str(e)}"]

        if not text:
            return [], ["Uploaded file is empty"]

        # 1. JSON or JSON Lines
        if filename_lower.endswith(".json") or text.startswith("[") or text.startswith("{"):
            try:
                data = json.loads(text)
                if isinstance(data, list):
                    records = data
                elif isinstance(data, dict):
                    records = [data]
            except Exception:
                # Try JSON Lines
                for idx, line in enumerate(text.splitlines(), start=1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        records.append(json.loads(line))
                    except Exception as je:
                        errors.append(f"Line {idx}: Invalid JSON syntax ({str(je)})")

        # 2. CSV
        elif filename_lower.endswith(".csv") or "," in text.splitlines()[0]:
            try:
                reader = csv.DictReader(io.StringIO(text))
                for idx, row in enumerate(reader, start=2):
                    records.append(dict(row))
            except Exception as ce:
                errors.append(f"CSV Parse Error: {str(ce)}")

        # 3. Standard Text / Syslog lines
        else:
            for idx, line in enumerate(text.splitlines(), start=1):
                line = line.strip()
                if not line:
                    continue
                # Extract IPs and fields via regex
                ips = cls.IP_REGEX.findall(line)
                src_ip = ips[0] if len(ips) > 0 else "192.168.1.100"
                dst_ip = ips[1] if len(ips) > 1 else "10.0.0.5"

                # Infer type
                event_type = "SYSTEM_LOG"
                status = "SUCCESS"
                if "fail" in line.lower() or "denied" in line.lower():
                    event_type = "AUTH_FAILURE"
                    status = "FAILURE"
                elif "accept" in line.lower() or "success" in line.lower():
                    event_type = "AUTH_SUCCESS"
                elif "scan" in line.lower() or "probe" in line.lower():
                    event_type = "PORT_SCAN"
                elif "sudo" in line.lower() or "root" in line.lower():
                    event_type = "PRIVILEGE_ACCESS"

                records.append({
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "source_ip": src_ip,
                    "destination_ip": dst_ip,
                    "protocol": "TCP",
                    "event_type": event_type,
                    "status": status,
                    "message": line,
                    "raw_log": line
                })

        return records, errors

    @classmethod
    def normalize_record(cls, raw: Dict[str, Any]) -> Tuple[Optional[NormalizedEventInput], Optional[str]]:
        """
        Normalizes a heterogeneous raw dictionary to common NormalizedEventInput schema.
        Handles missing fields gracefully.
        """
        # Map common field alias names
        src_ip = raw.get("source_ip") or raw.get("src_ip") or raw.get("src") or raw.get("client_ip")
        if not src_ip:
            # Fallback scan for IP in string fields
            for val in raw.values():
                if isinstance(val, str):
                    found = cls.IP_REGEX.search(val)
                    if found:
                        src_ip = found.group(0)
                        break
        if not src_ip:
            return None, "Missing required source IP address"

        dst_ip = raw.get("destination_ip") or raw.get("dst_ip") or raw.get("dst") or raw.get("server_ip")
        
        # Ports
        def parse_port(p_val):
            try:
                return int(p_val) if p_val is not None and str(p_val).strip() else None
            except (ValueError, TypeError):
                return None

        src_port = parse_port(raw.get("source_port") or raw.get("src_port") or raw.get("s_port"))
        dst_port = parse_port(raw.get("destination_port") or raw.get("dst_port") or raw.get("d_port"))
        
        protocol = str(raw.get("protocol") or raw.get("proto") or "TCP").upper()
        username = raw.get("username") or raw.get("user") or raw.get("user_id")
        event_type = str(raw.get("event_type") or raw.get("action_type") or raw.get("type") or "SECURITY_EVENT").upper()
        action = str(raw.get("action") or "LOG").upper()
        status = str(raw.get("status") or "SUCCESS").upper()
        message = raw.get("message") or raw.get("msg") or raw.get("description")
        asset_name = raw.get("asset_name") or raw.get("asset") or raw.get("host") or raw.get("hostname")

        # Timestamp parsing
        ts_val = raw.get("timestamp") or raw.get("time") or raw.get("@timestamp")
        parsed_ts = datetime.datetime.now(datetime.timezone.utc)
        if ts_val:
            try:
                if isinstance(ts_val, (int, float)):
                    parsed_ts = datetime.datetime.fromtimestamp(ts_val, tz=datetime.timezone.utc)
                elif isinstance(ts_val, str):
                    # Try ISO parsing
                    clean_ts = ts_val.replace("Z", "+00:00")
                    parsed_ts = datetime.datetime.fromisoformat(clean_ts)
            except Exception:
                pass # Use default current timestamp

        norm = NormalizedEventInput(
            timestamp=parsed_ts,
            source_ip=str(src_ip).strip(),
            destination_ip=str(dst_ip).strip() if dst_ip else None,
            source_port=src_port,
            destination_port=dst_port,
            protocol=protocol,
            username=str(username).strip() if username else None,
            asset_name=str(asset_name).strip() if asset_name else None,
            event_type=event_type,
            action=action,
            status=status,
            message=str(message) if message else None,
            raw_log=json.dumps(raw) if not raw.get("raw_log") else str(raw.get("raw_log")),
            source_type=raw.get("source_type", "REAL_UPLOAD")
        )
        return norm, None

    @classmethod
    async def process_normalized_event(
        cls,
        db: Session,
        norm_event: NormalizedEventInput,
        active_model_version_id: Optional[str] = None
    ) -> Tuple[Event, Optional[Alert], Optional[Any]]:
        """
        Executes the COMPLETE end-to-end detection pipeline for a single normalized event:
        Event -> ML Inference -> Anomaly -> Rules -> Correlation -> Risk -> Alert -> Incident
        """
        # 1. Resolve or register target Asset
        asset = None
        if norm_event.destination_ip or norm_event.asset_name:
            search_query = db.query(Asset)
            if norm_event.destination_ip:
                asset = search_query.filter(Asset.ip_address == norm_event.destination_ip).first()
            if not asset and norm_event.asset_name:
                asset = search_query.filter(Asset.asset_name == norm_event.asset_name).first()

            if not asset and norm_event.destination_ip:
                # Auto-discover asset
                asset = Asset(
                    asset_name=norm_event.asset_name or f"host-{norm_event.destination_ip.replace('.', '-')}",
                    ip_address=norm_event.destination_ip,
                    asset_type="SERVER",
                    criticality="MEDIUM",
                    status="ACTIVE"
                )
                db.add(asset)
                db.flush()

        asset_id = asset.id if asset else None
        asset_crit = asset.criticality if asset else "MEDIUM"

        # 2. Save Event record
        db_event = Event(
            timestamp=norm_event.timestamp or datetime.datetime.now(datetime.timezone.utc),
            source_ip=norm_event.source_ip,
            destination_ip=norm_event.destination_ip,
            source_port=norm_event.source_port,
            destination_port=norm_event.destination_port,
            protocol=norm_event.protocol,
            username=norm_event.username,
            asset_id=asset_id,
            event_type=norm_event.event_type,
            action=norm_event.action,
            status=norm_event.status,
            message=norm_event.message,
            raw_log=norm_event.raw_log,
            normalized_data=norm_event.model_dump_json(),
            source_type=norm_event.source_type or "REAL_UPLOAD"
        )
        db.add(db_event)
        db.flush()

        # 3. Supervised ML and Anomaly Inference
        event_dict = {
            "duration": 0.5,
            "src_bytes": 150,
            "dst_bytes": 0,
            "source_port": norm_event.source_port or 49152,
            "destination_port": norm_event.destination_port or 80,
            "protocol": norm_event.protocol,
            "count_10s": 1,
            "srv_count_10s": 1,
            "failed_logins": 1 if norm_event.status == "FAILURE" else 0,
            "is_privileged": 1 if norm_event.username in ["root", "admin"] else 0,
            "event_type": norm_event.event_type,
            "status": norm_event.status,
            "username": norm_event.username
        }

        # Query recent connection count in last 10s for count_10s feature
        ten_sec_ago = db_event.timestamp - datetime.timedelta(seconds=10)
        recent_count = db.query(Event).filter(
            Event.source_ip == db_event.source_ip,
            Event.timestamp >= ten_sec_ago
        ).count()
        event_dict["count_10s"] = max(1, recent_count)

        pred, conf, attack_cat, ano_score, is_ano = ml_engine.predict(event_dict)

        # Store ML Prediction
        ml_pred_record = MLPrediction(
            event_id=db_event.id,
            model_version_id=active_model_version_id,
            prediction=pred,
            confidence=conf,
            attack_category=attack_cat,
            prediction_time=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(ml_pred_record)

        # Store Anomaly
        ano_record = Anomaly(
            event_id=db_event.id,
            anomaly_score=ano_score,
            is_anomaly=is_ano,
            model_version_id=active_model_version_id,
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(ano_record)

        # 4. Detection Rules
        rule_matches = rule_engine.evaluate_event({
            **event_dict,
            "raw_log": norm_event.raw_log,
            "message": norm_event.message,
            "source_ip": norm_event.source_ip,
            "asset_name": asset.asset_name if asset else "unknown"
        })

        # 5. Correlation Engine: Query sliding window of recent events from same IP
        fifteen_min_ago = db_event.timestamp - datetime.timedelta(minutes=15)
        recent_events = (
            db.query(Event)
            .filter(
                Event.id != db_event.id,
                Event.source_ip == db_event.source_ip,
                Event.timestamp >= fifteen_min_ago
            )
            .order_by(Event.timestamp.asc())
            .limit(20)
            .all()
        )
        recent_event_dicts = [
            {
                "id": re_ev.id,
                "event_type": re_ev.event_type,
                "action": re_ev.action,
                "status": re_ev.status,
                "attack_category": re_ev.ml_prediction.attack_category if re_ev.ml_prediction else "NORMAL"
            }
            for re_ev in recent_events
        ]
        
        corr_result = correlation_engine.correlate_event_window(
            current_event={
                "id": db_event.id,
                "event_type": db_event.event_type,
                "action": db_event.action,
                "status": db_event.status,
                "attack_category": attack_cat,
                "source_ip": db_event.source_ip
            },
            recent_events=recent_event_dicts
        )

        # 6. Check Threat Intelligence reputation
        ti = await threat_intel_service.get_ip_intelligence(db, norm_event.source_ip)
        ti_reputation = ti.reputation

        # 7. Deterministic Risk Engine
        risk_score, severity, overall_conf, factors = risk_engine.calculate_risk(
            ml_prediction=pred,
            ml_confidence=conf,
            anomaly_score=ano_score,
            is_anomaly=is_ano,
            rule_matches=rule_matches,
            correlation_result=corr_result,
            asset_criticality=asset_crit,
            threat_intel_reputation=ti_reputation
        )

        # 8. Alert Generation (Generate Alert if risk_score >= 25, or ML Malicious/Suspicious, or Rule matched)
        alert = None
        incident = None

        should_alert = (
            risk_score >= 25.0 or
            pred in ["MALICIOUS", "SUSPICIOUS"] or
            len(rule_matches) > 0 or
            corr_result.is_correlated
        )

        if should_alert:
            det_type = "RULE_MATCH" if rule_matches else ("CORRELATED" if corr_result.is_correlated else "ML_SUPERVISED")
            alert_title = rule_matches[0].rule_name if rule_matches else (
                f"{attack_cat.replace('_', ' ').title()} Alert" if attack_cat != "NORMAL" else "Suspicious Event Flagged"
            )

            alert = Alert(
                event_id=db_event.id,
                title=alert_title,
                description=f"Risk Score {risk_score} [{severity}]. Factors: {'; '.join(factors[:2])}",
                severity=severity,
                confidence=overall_conf,
                risk_score=risk_score,
                detection_type=det_type,
                status="NEW",
                source_ip=norm_event.source_ip,
                asset_id=asset_id,
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(alert)
            db.flush()

            # 9. Incident Escalation & Correlation
            incident = incident_service.process_detection_for_incident(
                db=db,
                event=db_event,
                alert=alert,
                risk_score=risk_score,
                severity=severity,
                confidence=overall_conf,
                rule_matches=rule_matches,
                correlation_result=corr_result
            )

        db.commit()
        db.refresh(db_event)
        if alert:
            db.refresh(alert)

        return db_event, alert, incident

    @classmethod
    async def ingest_file(cls, db: Session, content_bytes: bytes, filename: str) -> IngestionSummaryResponse:
        records, parse_errors = cls.parse_log_file(content_bytes, filename)
        
        valid_count = 0
        invalid_count = len(parse_errors)
        events_created = 0
        alerts_generated = 0
        incidents_generated = 0
        errors = list(parse_errors)

        # Get active model version ID
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        active_model_id = active_model.id if active_model else None

        for idx, rec in enumerate(records, start=1):
            norm, err = cls.normalize_record(rec)
            if err:
                invalid_count += 1
                errors.append(f"Record {idx}: {err}")
                continue

            valid_count += 1
            try:
                db_event, alert, incident = await cls.process_normalized_event(
                    db=db,
                    norm_event=norm,
                    active_model_version_id=active_model_id
                )
                events_created += 1
                if alert:
                    alerts_generated += 1
                if incident:
                    incidents_generated += 1
            except Exception as pe:
                invalid_count += 1
                errors.append(f"Record {idx} execution failed: {str(pe)}")

        return IngestionSummaryResponse(
            records_uploaded=len(records),
            valid_records=valid_count,
            invalid_records=invalid_count,
            events_created=events_created,
            alerts_generated=alerts_generated,
            incidents_generated=incidents_generated,
            errors=errors[:15] # Return first 15 errors to avoid huge payloads
        )

ingestion_service = IngestionService()
