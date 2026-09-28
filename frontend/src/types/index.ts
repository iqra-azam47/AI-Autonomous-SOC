export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'FALSE_POSITIVE';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role_name: Role;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface DashboardMetrics {
  critical_incidents: number;
  active_incidents: number;
  high_risk_alerts: number;
  suspicious_events: number;
  events_today: number;
  total_events: number;
  affected_assets: number;
  suspicious_ips: number;
}

export interface DashboardCharts {
  alerts_by_severity: { severity: string; count: number }[];
  attack_categories: { category: string; count: number }[];
  prediction_breakdown: { label: string; count: number }[];
  top_suspicious_ips: { ip: string; count: number }[];
  most_affected_assets: { asset: string; alerts: number }[];
  events_over_time: { time: string; events: number }[];
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  time_str: string;
  title: string;
  severity: Severity;
  source_ip: string;
  detection_type: string;
  risk_score: number;
  status: AlertStatus;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  username?: string;
  asset_id?: string;
  asset_name?: string;
  event_type: string;
  action?: string;
  status?: string;
  message?: string;
  raw_log?: string;
  source_type: string;
  prediction?: 'NORMAL' | 'SUSPICIOUS' | 'MALICIOUS';
  confidence?: number;
  attack_category?: string;
  anomaly_score?: number;
  is_anomaly?: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  event_id?: string;
  title: string;
  description?: string;
  severity: Severity;
  confidence: number;
  risk_score: number;
  detection_type: string;
  status: AlertStatus;
  source_ip?: string;
  asset_id?: string;
  asset_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description?: string;
  severity: Severity;
  risk_score: number;
  confidence: number;
  status: IncidentStatus;
  source_ip?: string;
  primary_asset_id?: string;
  primary_asset_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  first_seen: string;
  last_seen: string;
  events_count: number;
  created_at: string;
  updated_at: string;
}

export interface MitreMapping {
  technique_id: string;
  name: string;
  tactic: string;
  evidence?: string;
}

export interface AnalystNote {
  id: string;
  user_id: string;
  username: string;
  note: string;
  created_at: string;
}

export interface AIInvestigation {
  id: string;
  incident_id: string;
  requested_by_name?: string;
  summary: string;
  evidence_analysis?: string;
  attack_progression?: string;
  mitre_analysis?: string;
  recommended_actions?: string;
  limitations?: string;
  model_name: string;
  created_at: string;
}

export interface IncidentDetail {
  incident: Incident;
  events: SecurityEvent[];
  mitre_techniques: MitreMapping[];
  notes: AnalystNote[];
  latest_investigation?: AIInvestigation;
  risk_factors: string[];
}

export interface ThreatIntelligence {
  indicator_type: string;
  indicator_value: string;
  source: string;
  reputation: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS';
  country?: string;
  asn?: string;
  isp?: string;
  confidence: number;
  total_events: number;
  total_alerts: number;
  total_incidents: number;
  is_private_ip: boolean;
  checked_at?: string;
  integration_configured: boolean;
}

export interface Asset {
  id: string;
  asset_name: string;
  ip_address: string;
  hostname?: string;
  os?: string;
  asset_type?: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner?: string;
  status: string;
  event_count: number;
  alert_count: number;
  incident_count: number;
  created_at: string;
}

export interface MitreTechnique {
  id: string;
  technique_id: string;
  name: string;
  tactic: string;
  description?: string;
  associated_incidents_count: number;
}

export interface SimulationRun {
  id: string;
  scenario: string;
  status: string;
  started_by_name?: string;
  events_generated: number;
  alerts_generated: number;
  incidents_generated: number;
  started_at: string;
  completed_at?: string;
  results_summary?: Record<string, any>;
}

export interface ModelMetadata {
  model_name: string;
  version: string;
  algorithm: string;
  dataset_name: string;
  dataset_records: number;
  train_records: number;
  test_records: number;
  features: string[];
  label_classes: string[];
  attack_categories: string[];
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    false_positive_rate: number;
    confusion_matrix: number[][];
  };
  candidate_comparisons: Record<string, any>;
  trained_at: string;
  status: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  result: string;
  details?: string;
  created_at: string;
}

export interface SystemSettings {
  risk_threshold_low: number;
  risk_threshold_medium: number;
  risk_threshold_high: number;
  gemini_configured: boolean;
  abuseipdb_configured: boolean;
  virustotal_configured: boolean;
  data_retention_days: number;
  model_version_active: string;
}

export interface IngestionSummary {
  records_uploaded: number;
  valid_records: number;
  invalid_records: number;
  events_created: number;
  alerts_generated: number;
  incidents_generated: number;
  errors: string[];
}
