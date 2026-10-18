import { Navigate, Route, Routes } from 'react-router-dom'
import OpsLayout from './layouts/OpsLayout.jsx'
import AccessPage from './pages/AccessPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import ActivityLogPage from './pages/ops/ActivityLogPage.jsx'
import DroneEvidencePage from './pages/ops/DroneEvidencePage.jsx'
import LiveMapPage from './pages/ops/LiveMapPage.jsx'
import OverviewPage from './pages/ops/OverviewPage.jsx'
import ReportsPage from './pages/ops/ReportsPage.jsx'
import SettingsPage from './pages/ops/SettingsPage.jsx'
import TeamsPage from './pages/ops/TeamsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/access" element={<AccessPage />} />

      <Route path="/ops" element={<OpsLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="map" element={<LiveMapPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="drone" element={<DroneEvidencePage />} />
        <Route path="activity" element={<ActivityLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Earlier URLs */}
      <Route path="/admin/*" element={<Navigate to="/ops" replace />} />
      <Route path="/sos" element={<Navigate to="/report" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
