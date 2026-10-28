// Routes: /login (OTP sign-in) and /ticket-service-status (the report, signed-in only); anything else → the report.
// The two pages are separate chunks with their own styles (login.css resets box-sizing for the whole page), and moving
// between them is a full page load.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { getSession, loginPath } from '../lib/auth';

const LoginPage = lazy(() => import('../auth/LoginPage'));
const ReportPage = lazy(() => import('../reports/ins01/ReportEntry'));

function RequireSession() {
  const user = getSession();
  const loc = useLocation();
  if (!user) return <Navigate to={`/${loginPath(loc.pathname + loc.search)}`} replace />;
  return <ReportPage user={user} />;
}

export function App() {
  // BASE_URL is the configured base path ("/" or e.g. "/insights-ins01/").
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ticket-service-status" element={<RequireSession />} />
          <Route path="*" element={<Navigate to="/ticket-service-status" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
