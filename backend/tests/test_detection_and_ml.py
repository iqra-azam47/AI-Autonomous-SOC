from app.ml.inference import ml_engine, FeatureExtractor
from app.detection.rules import rule_engine
from app.detection.correlation import correlation_engine
from app.detection.risk_engine import risk_engine

def test_feature_extraction():
    sample_event = {
        "duration": 1.2,
        "src_bytes": 500,
        "dst_bytes": 1200,
        "source_port": 51234,
        "destination_port": 443,
        "protocol": "TCP",
        "count_10s": 3,
        "srv_count_10s": 3,
        "failed_logins": 0,
        "is_privileged": 0,
        "event_type": "HTTP_GET",
        "status": "SUCCESS"
    }
    vec = FeatureExtractor.extract_from_event(sample_event)
    assert vec.shape == (1, 11)
    assert vec[0][0] == 1.2
    assert vec[0][4] == 443.0

def test_ml_supervised_and_anomaly_inference():
    # Malicious brute force event
    bf_event = {
        "duration": 0.2,
        "src_bytes": 100,
        "dst_bytes": 80,
        "source_port": 50221,
        "destination_port": 22,
        "protocol": "TCP",
        "count_10s": 35,
        "srv_count_10s": 35,
        "failed_logins": 12,
        "is_privileged": 0,
        "event_type": "AUTH_FAILURE",
        "status": "FAILURE"
    }
    pred, conf, category, ano_score, is_ano = ml_engine.predict(bf_event)
    assert pred in ["MALICIOUS", "SUSPICIOUS"]
    assert category == "BRUTE_FORCE"
    assert 0.0 <= conf <= 1.0
    assert 0.0 <= ano_score <= 1.0

def test_rule_engine_sqli():
    sqli_event = {
        "raw_log": "SELECT * FROM users WHERE user_id = ' OR 1=1 --",
        "message": "SQL Injection pattern",
        "destination_port": 443,
        "event_type": "WEB_REQUEST",
        "status": "FAILURE"
    }
    matches = rule_engine.evaluate_event(sqli_event)
    assert len(matches) > 0
    assert any(m.rule_id == "RULE-WEB-SQLI" for m in matches)
    assert any(m.mitre_technique_id == "T1190" for m in matches)

def test_deterministic_risk_calculation():
    score, severity, conf, factors = risk_engine.calculate_risk(
        ml_prediction="MALICIOUS",
        ml_confidence=0.95,
        anomaly_score=0.8,
        is_anomaly=True,
        rule_matches=[],
        correlation_result=type("Dummy", (), {"is_correlated": False, "risk_boost": 0.0})(),
        asset_criticality="CRITICAL",
        threat_intel_reputation="MALICIOUS"
    )
    assert 75.0 <= score <= 100.0
    assert severity == "CRITICAL"
    assert len(factors) > 0
