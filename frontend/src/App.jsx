import { Routes, Route } from 'react-router-dom'
import ReportPage from './pages/ReportPage.jsx'
import SosCallPage from './pages/SosCallPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportPage />} />
      <Route path="/sos" element={<SosCallPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<ComingSoonPage />} />
    </Routes>
  )
}
