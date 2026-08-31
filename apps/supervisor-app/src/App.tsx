import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ActivePromises from './pages/ActivePromises'
import FacilityArrival from './pages/FacilityArrival'
import SessionScheduler from './pages/SessionScheduler'
import EscalationInbox from './pages/EscalationInbox'
import AuditLogs from './pages/AuditLogs'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<ActivePromises />} />
          <Route path="/facility-arrival" element={<FacilityArrival />} />
          <Route path="/session-scheduler" element={<SessionScheduler />} />
          <Route path="/escalation-inbox" element={<EscalationInbox />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
