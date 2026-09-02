import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ActivePromises from './pages/ActivePromises';
import FacilityArrival from './pages/FacilityArrival';
import SessionScheduler from './pages/SessionScheduler';
import EscalationInbox from './pages/EscalationInbox';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<ActivePromises />} />
          <Route path="facility-arrival" element={<FacilityArrival />} />
          <Route path="session-scheduler" element={<SessionScheduler />} />
          <Route path="escalation-inbox" element={<EscalationInbox />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
