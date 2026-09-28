from typing import List, Dict, Any, Tuple
from app.detection.rules import RuleMatch
from app.detection.correlation import CorrelationResult

class RiskEngine:
    @staticmethod
    def calculate_risk(
        ml_prediction: str,
        ml_confidence: float,
        anomaly_score: float,
        is_anomaly: bool,
        rule_matches: List[RuleMatch],
        correlation_result: CorrelationResult,
        asset_criticality: str = "MEDIUM",
        threat_intel_reputation: str = "CLEAN"
    ) -> Tuple[float, str, float, List[str]]:
        """
        Deterministic Risk Calculation.
        Returns:
            (risk_score [0-100], severity, overall_confidence, risk_factors)
        """
        score = 0.0
        factors = []
        confidences = []

        # 1. Supervised Machine Learning Factor (Max 30 pts)
        if ml_prediction == "MALICIOUS":
            ml_pts = round(ml_confidence * 30.0, 1)
            score += ml_pts
            confidences.append(ml_confidence)
            factors.append(f"ML Classifier identified Malicious activity (+{ml_pts} pts, confidence {int(ml_confidence*100)}%)")
        elif ml_prediction == "SUSPICIOUS":
            ml_pts = round(ml_confidence * 15.0, 1)
            score += ml_pts
            confidences.append(ml_confidence)
            factors.append(f"ML Classifier flagged Suspicious behavior (+{ml_pts} pts, confidence {int(ml_confidence*100)}%)")
        else:
            factors.append("ML Classifier rated flow as Normal (0 pts)")

        # 2. Anomaly Detection Factor (Max 20 pts)
        if is_anomaly:
            ano_pts = round(anomaly_score * 20.0, 1)
            score += ano_pts
            factors.append(f"Isolation Forest identified statistical anomaly (Score: {anomaly_score:.2f}, +{ano_pts} pts)")
        
        # 3. Detection Rules (Max 35 pts)
        rule_pts = 0.0
        for match in rule_matches:
            if match.severity == "CRITICAL":
                pts = 30.0
            elif match.severity == "HIGH":
                pts = 20.0
            elif match.severity == "MEDIUM":
                pts = 10.0
            else:
                pts = 5.0
            rule_pts += pts
            confidences.append(match.confidence)
            factors.append(f"Triggered Rule '{match.rule_name}' [{match.severity}] (+{pts} pts)")
            
        rule_pts_capped = min(35.0, rule_pts)
        if rule_pts > 35.0:
            factors.append(f"Cumulative rule points capped at 35.0 pts")
        score += rule_pts_capped

        # 4. Correlation Multi-Stage Attack Factor (Max 25 pts)
        if correlation_result.is_correlated:
            corr_pts = min(25.0, correlation_result.risk_boost)
            score += corr_pts
            confidences.append(correlation_result.confidence)
            factors.append(f"Correlated Multi-Event Attack Pattern: '{correlation_result.pattern_name}' (+{corr_pts} pts)")

        # 5. Asset Criticality Factor
        asset_crit = str(asset_criticality).upper()
        if asset_crit == "CRITICAL":
            score += 15.0
            factors.append("Target Asset has CRITICAL classification (+15 pts)")
        elif asset_crit == "HIGH":
            score += 10.0
            factors.append("Target Asset has HIGH classification (+10 pts)")
        elif asset_crit == "MEDIUM":
            score += 5.0
            factors.append("Target Asset has MEDIUM classification (+5 pts)")

        # 6. Threat Intelligence Factor
        ti_rep = str(threat_intel_reputation).upper()
        if ti_rep == "MALICIOUS":
            score += 20.0
            factors.append("Threat Intelligence confirms Malicious IP reputation (+20 pts)")
        elif ti_rep == "SUSPICIOUS":
            score += 10.0
            factors.append("Threat Intelligence flags Suspicious IP reputation (+10 pts)")

        # Cap score between 0.0 and 100.0
        final_score = round(max(0.0, min(100.0, score)), 1)

        # Severity Mapping: 0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL
        if final_score >= 75.0:
            severity = "CRITICAL"
        elif final_score >= 50.0:
            severity = "HIGH"
        elif final_score >= 25.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        overall_conf = round(sum(confidences) / max(len(confidences), 1), 2) if confidences else 0.75

        return final_score, severity, overall_conf, factors

risk_engine = RiskEngine()
