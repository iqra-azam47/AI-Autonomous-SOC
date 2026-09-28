import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Incident, Alert, Event, Asset, MLPrediction
from app.api.deps import get_current_user, User

router = APIRouter(prefix="/dashboard", tags=["SOC Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.datetime.now(datetime.timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    critical_incidents = db.query(Incident).filter(Incident.severity == "CRITICAL", Incident.status != "RESOLVED").count()
    active_incidents = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING", "CONTAINED"])).count()
    high_risk_alerts = db.query(Alert).filter(Alert.severity.in_(["CRITICAL", "HIGH"])).count()
    suspicious_events = db.query(MLPrediction).filter(MLPrediction.prediction.in_(["SUSPICIOUS", "MALICIOUS"])).count()
    events_today = db.query(Event).filter(Event.timestamp >= start_of_day).count()
    total_events = db.query(Event).count()
    
    # Distinct affected assets
    affected_assets = db.query(Incident.primary_asset_id).filter(Incident.primary_asset_id.isnot(None)).distinct().count()
    if affected_assets == 0:
        affected_assets = db.query(Alert.asset_id).filter(Alert.asset_id.isnot(None)).distinct().count()

    # Distinct suspicious IPs from alerts or malicious predictions
    suspicious_ips = db.query(Alert.source_ip).filter(Alert.source_ip.isnot(None)).distinct().count()

    return {
        "critical_incidents": critical_incidents,
        "active_incidents": active_incidents,
        "high_risk_alerts": high_risk_alerts,
        "suspicious_events": suspicious_events,
        "events_today": events_today,
        "total_events": total_events,
        "affected_assets": affected_assets,
        "suspicious_ips": suspicious_ips
    }

@router.get("/charts")
def get_dashboard_charts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Alerts by Severity
    alerts_by_sev = (
        db.query(Alert.severity, func.count(Alert.id).label("count"))
        .group_by(Alert.severity)
        .all()
    )
    severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    sev_map = {s: 0 for s in severity_order}
    for sev, cnt in alerts_by_sev:
        if sev in sev_map:
            sev_map[sev] = cnt
    severity_chart = [{"severity": k, "count": v} for k, v in sev_map.items()]

    # 2. Attack Categories
    cat_counts = (
        db.query(MLPrediction.attack_category, func.count(MLPrediction.id).label("count"))
        .filter(MLPrediction.attack_category.isnot(None), MLPrediction.attack_category != "NORMAL")
        .group_by(MLPrediction.attack_category)
        .order_by(func.count(MLPrediction.id).desc())
        .limit(6)
        .all()
    )
    attack_categories = [{"category": cat.replace("_", " ").title(), "count": cnt} for cat, cnt in cat_counts]

    # 3. Normal vs Suspicious vs Malicious Events
    pred_counts = (
        db.query(MLPrediction.prediction, func.count(MLPrediction.id).label("count"))
        .group_by(MLPrediction.prediction)
        .all()
    )
    pred_map = {"NORMAL": 0, "SUSPICIOUS": 0, "MALICIOUS": 0}
    for p, cnt in pred_counts:
        if p in pred_map:
            pred_map[p] = cnt
    prediction_breakdown = [{"label": k, "count": v} for k, v in pred_map.items()]

    # 4. Top Suspicious IPs
    top_ips = (
        db.query(Alert.source_ip, func.count(Alert.id).label("alerts_count"))
        .filter(Alert.source_ip.isnot(None))
        .group_by(Alert.source_ip)
        .order_by(func.count(Alert.id).desc())
        .limit(5)
        .all()
    )
    top_suspicious_ips = [{"ip": ip, "count": cnt} for ip, cnt in top_ips]

    # 5. Most Affected Assets
    top_assets = (
        db.query(Asset.asset_name, func.count(Alert.id).label("alerts_count"))
        .join(Alert, Alert.asset_id == Asset.id)
        .group_by(Asset.asset_name)
        .order_by(func.count(Alert.id).desc())
        .limit(5)
        .all()
    )
    most_affected_assets = [{"asset": name, "alerts": cnt} for name, cnt in top_assets]

    # 6. Events Over Time (Last 12 recorded event clusters or hours)
    recent_events = (
        db.query(Event.timestamp)
        .order_by(Event.timestamp.desc())
        .limit(100)
        .all()
    )
    # Aggregate by 5-minute bucket or timestamp
    time_series = []
    if recent_events:
        bucket_counts = {}
        for (ts,) in reversed(recent_events):
            time_key = ts.strftime("%H:%M")
            bucket_counts[time_key] = bucket_counts.get(time_key, 0) + 1
        time_series = [{"time": k, "events": v} for k, v in list(bucket_counts.items())[-10:]]

    return {
        "alerts_by_severity": severity_chart,
        "attack_categories": attack_categories,
        "prediction_breakdown": prediction_breakdown,
        "top_suspicious_ips": top_suspicious_ips,
        "most_affected_assets": most_affected_assets,
        "events_over_time": time_series
    }

@router.get("/activity")
def get_live_activity_feed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns live activity feed based on recent database events, predictions, alerts, and incidents.
    """
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(8)
        .all()
    )
    feed = []
    for a in alerts:
        feed.append({
            "id": a.id,
            "timestamp": a.created_at.isoformat(),
            "time_str": a.created_at.strftime("%H:%M:%S"),
            "title": a.title,
            "severity": a.severity,
            "source_ip": a.source_ip,
            "detection_type": a.detection_type,
            "risk_score": a.risk_score,
            "status": a.status
        })
    return feed
