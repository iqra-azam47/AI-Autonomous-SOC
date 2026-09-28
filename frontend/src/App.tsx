import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { EventsPage } from './pages/EventsPage';
import { TimelinePage } from './pages/TimelinePage';
import { AIAnalystPage } from './pages/AIAnalystPage';
import { AIChatPage } from './pages/AIChatPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { AssetsPage } from './pages/AssetsPage';
import { MitrePage } from './pages/MitrePage';
import { DetectionPage } from './pages/DetectionPage';
import { IngestionPage } from './pages/IngestionPage';
import { SimulationsPage } from './pages/SimulationsPage';
import { MLLabPage } from './pages/MLLabPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/event-explorer" element={<EventsPage />} />
              <Route path="/timeline" element={<TimelinePage />} />

              <Route path="/intelligence" element={<IntelligencePage />} />
              <Route path="/intelligence/ip" element={<IntelligencePage />} />
              <Route path="/intelligence/ip/:ip" element={<IntelligencePage />} />

              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/mitre" element={<MitrePage />} />
              <Route path="/detection" element={<DetectionPage />} />
              <Route path="/detection/:tab" element={<DetectionPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Analyst & Admin Authorized Scopes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ANALYST']} />}>
                <Route path="/ai-analyst" element={<AIAnalystPage />} />
                <Route path="/ai-chat" element={<AIChatPage />} />
                <Route path="/ingestion" element={<IngestionPage />} />
                <Route path="/simulations" element={<SimulationsPage />} />
                <Route path="/simulations/history" element={<SimulationsPage />} />
                <Route path="/ml-lab" element={<MLLabPage />} />
                <Route path="/ml-lab/:tab" element={<MLLabPage />} />
              </Route>

              {/* Admin Exclusives */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>

              {/* Audit Logs (Admin, Analyst, Viewer) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ANALYST', 'VIEWER']} />}>
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
