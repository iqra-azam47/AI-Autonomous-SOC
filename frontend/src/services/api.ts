import {
  User, DashboardMetrics, DashboardCharts, ActivityFeedItem, SecurityEvent,
  Alert, Incident, IncidentDetail, ThreatIntelligence, Asset, MitreTechnique,
  SimulationRun, ModelMetadata, AuditLogItem, SystemSettings, IngestionSummary
} from '../types';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('soc_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('soc_token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('soc_token');
    localStorage.removeItem('soc_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.removeToken();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.detail || response.statusText || 'An API error occurred';
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // --- Auth ---
  async login(creds: { username_or_email: string; password: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    this.setToken(res.access_token);
    localStorage.setItem('soc_user', JSON.stringify(res.user));
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.removeToken();
    }
  }

  // --- Dashboard ---
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/api/dashboard/metrics');
  }

  async getDashboardCharts(): Promise<DashboardCharts> {
    return this.request<DashboardCharts>('/api/dashboard/charts');
  }

  async getLiveActivity(): Promise<ActivityFeedItem[]> {
    return this.request<ActivityFeedItem[]>('/api/dashboard/activity');
  }

  // --- Events ---
  async listEvents(params: Record<string, any> = {}): Promise<{ items: SecurityEvent[]; total: number; page: number; limit: number; pages: number }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/events?${query}`);
  }

  async getEvent(id: string): Promise<SecurityEvent> {
    return this.request<SecurityEvent>(`/api/events/${id}`);
  }

  // --- Alerts ---
  async listAlerts(params: Record<string, any> = {}): Promise<{ items: Alert[]; total: number; page: number; limit: number; pages: number }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/alerts?${query}`);
  }

  async getAlert(id: string): Promise<Alert> {
    return this.request<Alert>(`/api/alerts/${id}`);
  }

  async updateAlertStatus(id: string, status: string): Promise<Alert> {
    return this.request<Alert>(`/api/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async escalateAlert(id: string): Promise<{ message: string; incident_id: string; incident_number: string }> {
    return this.request(`/api/alerts/${id}/escalate`, { method: 'POST' });
  }

  // --- Incidents ---
  async listIncidents(params: Record<string, any> = {}): Promise<{ items: Incident[]; total: number; page: number; limit: number; pages: number }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/incidents?${query}`);
  }

  async getIncident(id: string): Promise<IncidentDetail> {
    return this.request<IncidentDetail>(`/api/incidents/${id}`);
  }

  async updateIncidentStatus(id: string, status: string): Promise<any> {
    return this.request(`/api/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateIncidentSeverity(id: string, severity: string): Promise<any> {
    return this.request(`/api/incidents/${id}/severity`, {
      method: 'PATCH',
      body: JSON.stringify({ severity }),
    });
  }

  async assignIncident(id: string, assigned_to_id: string | null): Promise<any> {
    return this.request(`/api/incidents/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to_id }),
    });
  }

  async addAnalystNote(id: string, note: string): Promise<any> {
    return this.request(`/api/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async simulateContainment(id: string, containment_type: string, reason: string): Promise<any> {
    return this.request(`/api/incidents/${id}/contain`, {
      method: 'POST',
      body: JSON.stringify({ containment_type, reason }),
    });
  }

  // --- Threat Intelligence ---
  async getIpIntelligence(ip: string): Promise<ThreatIntelligence> {
    return this.request<ThreatIntelligence>(`/api/intelligence/ip/${encodeURIComponent(ip)}`);
  }

  // --- Assets ---
  async listAssets(): Promise<Asset[]> {
    return this.request<Asset[]>('/api/assets');
  }

  async getAsset(id: string): Promise<{ asset: Asset; recent_events: any[] }> {
    return this.request(`/api/assets/${id}`);
  }

  async createAsset(data: Partial<Asset>): Promise<Asset> {
    return this.request<Asset>('/api/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- MITRE ATT&CK ---
  async listMitreTechniques(): Promise<MitreTechnique[]> {
    return this.request<MitreTechnique[]>('/api/mitre/techniques');
  }

  async getMitreTechnique(id: string): Promise<{ technique: MitreTechnique; associated_incidents: any[] }> {
    return this.request(`/api/mitre/techniques/${id}`);
  }

  // --- Detection ---
  async getDetectionRules(): Promise<any[]> {
    return this.request<any[]>('/api/detection/rules');
  }

  async getCorrelationPatterns(): Promise<any[]> {
    return this.request<any[]>('/api/detection/correlation');
  }

  async getAnomalies(): Promise<any[]> {
    return this.request<any[]>('/api/detection/anomalies');
  }

  async getRiskEngineParameters(): Promise<any> {
    return this.request<any>('/api/detection/risk');
  }

  // --- ML Lab ---
  async getActiveModel(): Promise<ModelMetadata> {
    return this.request<ModelMetadata>('/api/ml/active');
  }

  async getDatasetInfo(): Promise<any> {
    return this.request<any>('/api/ml/dataset');
  }

  async listModelVersions(): Promise<any[]> {
    return this.request<any[]>('/api/ml/models');
  }

  async testMLInference(data: any): Promise<any> {
    return this.request<any>('/api/ml/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Ingestion ---
  async uploadLogFile(file: File): Promise<IngestionSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<IngestionSummary>('/api/ingestion/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // --- Simulations ---
  async runSimulation(scenario: string): Promise<SimulationRun> {
    return this.request<SimulationRun>('/api/simulations/run', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    });
  }

  async getSimulationHistory(): Promise<SimulationRun[]> {
    return this.request<SimulationRun[]>('/api/simulations/history');
  }

  // --- AI ---
  async investigateIncident(incidentId: string): Promise<any> {
    return this.request(`/api/ai/investigate/${incidentId}`, { method: 'POST' });
  }

  async sendAIChat(message: string, incidentId?: string): Promise<{ reply: string; context_used: any[]; model_name: string }> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, incident_id: incidentId }),
    });
  }

  // --- Reports ---
  async getIncidentReport(id: string): Promise<any> {
    return this.request(`/api/reports/incident/${id}`);
  }

  async getSecurityActivityReport(hours: number = 24): Promise<any> {
    return this.request(`/api/reports/activity?hours=${hours}`);
  }

  async getMLReport(): Promise<any> {
    return this.request('/api/reports/ml');
  }

  // --- Admin ---
  async listUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users');
  }

  async createUser(data: any): Promise<User> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listAuditLogs(params: Record<string, any> = {}): Promise<{ items: AuditLogItem[]; total: number; page: number; limit: number; pages: number }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/audit/logs?${query}`);
  }

  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/settings');
  }
}

export const api = new ApiClient();
