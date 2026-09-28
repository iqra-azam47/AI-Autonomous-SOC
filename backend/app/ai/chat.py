import re
import json
import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Incident, Alert, Event, Asset
from app.ai.gemini_client import gemini_client
from app.schemas.schemas import AIChatResponse

CHAT_SYSTEM_PROMPT = """You are an autonomous AI SOC Security Analyst Assistant inside an enterprise Command Center.
You answer security operators' questions about the live telemetry, active incidents, alerts, top attacker IPs, and system posture.

CONSTRAINTS:
1. Base your answers strictly on the REAL SOC DATA provided in the context below.
2. If data is not present in the context, clearly state that no records match or the sensor has not observed that activity.
3. Never invent IPs, incident numbers, event counts, or attack categories.
4. Distinguish between facts from logs vs analytical security opinions.
5. Provide concise, clear, professional SOC-grade answers. Include IDs (e.g. INC-1001) and metrics where applicable.
"""

class SOCChatService:
    @staticmethod
    def gather_soc_context(db: Session, query: str, incident_id: str = None) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Safe controlled database retrieval based on query intent.
        DOES NOT execute arbitrary SQL.
        """
        context_items = []
        now = datetime.datetime.now(datetime.timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Check if specific incident ID or number (e.g. INC-1001) is mentioned
        inc_match = re.search(r"INC-\d+", query, re.IGNORECASE)
        target_inc = None
        if incident_id:
            target_inc = db.query(Incident).filter(Incident.id == incident_id).first()
        elif inc_match:
            inc_num = inc_match.group(0).upper()
            target_inc = db.query(Incident).filter(Incident.incident_number == inc_num).first()

        if target_inc:
            events_count = len(target_inc.incident_events)
            inc_info = {
                "type": "INCIDENT_DETAILS",
                "incident_number": target_inc.incident_number,
                "title": target_inc.title,
                "severity": target_inc.severity,
                "risk_score": target_inc.risk_score,
                "confidence": target_inc.confidence,
                "status": target_inc.status,
                "source_ip": target_inc.source_ip,
                "primary_asset": target_inc.primary_asset.asset_name if target_inc.primary_asset else "Unknown",
                "events_associated": events_count,
                "first_seen": target_inc.first_seen.isoformat(),
                "last_seen": target_inc.last_seen.isoformat()
            }
            context_items.append(inc_info)

        # 2. General SOC metrics context
        total_incidents = db.query(Incident).count()
        critical_incidents = db.query(Incident).filter(Incident.severity == "CRITICAL").all()
        high_alerts = db.query(Alert).filter(Alert.severity.in_(["CRITICAL", "HIGH"])).count()
        total_events = db.query(Event).count()
        events_today = db.query(Event).filter(Event.timestamp >= start_of_day).count()

        # Top 5 attacker IPs by alert count
        top_ips = (
            db.query(Alert.source_ip, func.count(Alert.id).label("count"))
            .filter(Alert.source_ip.isnot(None))
            .group_by(Alert.source_ip)
            .order_by(func.count(Alert.id).desc())
            .limit(5)
            .all()
        )
        top_ip_list = [{"ip": ip, "alert_count": cnt} for ip, cnt in top_ips]

        summary_context = {
            "type": "SYSTEM_POSTURE",
            "total_incidents": total_incidents,
            "critical_incidents_list": [
                {"number": ci.incident_number, "title": ci.title, "source_ip": ci.source_ip, "status": ci.status, "risk": ci.risk_score}
                for ci in critical_incidents
            ],
            "high_risk_alerts_count": high_alerts,
            "total_security_events": total_events,
            "events_today": events_today,
            "top_suspicious_ips": top_ip_list
        }
        context_items.append(summary_context)

        # Recent 5 alerts
        recent_alerts = (
            db.query(Alert)
            .order_by(Alert.created_at.desc())
            .limit(5)
            .all()
        )
        context_items.append({
            "type": "RECENT_ALERTS",
            "alerts": [
                {"title": a.title, "severity": a.severity, "type": a.detection_type, "source_ip": a.source_ip, "status": a.status}
                for a in recent_alerts
            ]
        })

        return json.dumps(context_items, indent=2), context_items

    @classmethod
    async def chat(cls, db: Session, user_query: str, incident_id: str = None) -> AIChatResponse:
        context_str, context_items = cls.gather_soc_context(db, user_query, incident_id)

        prompt = f"""OPERATOR QUERY:
"{user_query}"

VERIFIED LIVE SOC TELEMETRY CONTEXT:
{context_str}

Provide a direct, factual answer addressing the operator's request based only on the telemetry above.
"""

        reply = await gemini_client.generate_content(
            system_instruction=CHAT_SYSTEM_PROMPT,
            prompt=prompt
        )

        if not reply:
            # Fallback if Gemini key is missing or offline: return grounded telemetry summary
            top_ips_list = context_items[1].get('top_suspicious_ips', [])
            top_ips_str = ', '.join([f"{x.get('ip')} ({x.get('alert_count')})" for x in top_ips_list]) or 'None observed'
            crit_list = context_items[1].get('critical_incidents_list', [])
            total_events_cnt = context_items[1].get('total_security_events', 0)
            total_inc_cnt = context_items[1].get('total_incidents', 0)

            reply = (
                "**[AI Service Status: Offline or Key Not Configured]**\n\n"
                "Here is the verified telemetry retrieved from the database:\n"
                f"- **Total Security Events**: {total_events_cnt}\n"
                f"- **Active Incidents**: {total_inc_cnt}\n"
                f"- **Critical Incidents**: {len(crit_list)}\n"
                f"- **Top Attacker IPs**: {top_ips_str}\n\n"
                "_To enable full generative conversational synthesis, please configure `GEMINI_API_KEY` in environment variables._"
            )

        return AIChatResponse(
            reply=reply,
            context_used=context_items,
            model_name=gemini_client.model_name
        )

soc_chat_service = SOCChatService()
