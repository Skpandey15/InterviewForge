import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from '@aip/shared';
import { AdminLayout } from './layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewBuilderPage from './pages/InterviewBuilderPage';
import QuestionBankPage from './pages/QuestionBankPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import FeedbackPage from './pages/FeedbackPage';
import TechnologiesPage from './pages/TechnologiesPage';
import UsersPage from './pages/UsersPage';
import StaffProfilePage from './pages/StaffProfilePage';
import './styles/admin.css';

/** Admin-only route guard — interviewers are bounced back to the dashboard. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/**
 * The staff portal owns its internal routing — the shell mounts it at /admin/*.
 * Candidates + Interview Builder + Feedback are shared by admins and
 * interviewers; the rest are admin-only.
 */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="builder" element={<InterviewBuilderPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="profile" element={<StaffProfilePage />} />
        <Route path="questions" element={<AdminOnly><QuestionBankPage /></AdminOnly>} />
        <Route path="technologies" element={<AdminOnly><TechnologiesPage /></AdminOnly>} />
        <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
        <Route path="analytics" element={<AdminOnly><AnalyticsPage /></AdminOnly>} />
        <Route path="reports" element={<AdminOnly><ReportsPage /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
