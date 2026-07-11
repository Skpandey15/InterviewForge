import { Navigate, Route, Routes } from 'react-router';
import { AdminLayout } from './layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewBuilderPage from './pages/InterviewBuilderPage';
import QuestionBankPage from './pages/QuestionBankPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import './styles/admin.css';

/**
 * The admin portal owns its internal routing — the shell simply mounts it
 * at /admin/*. Adding an admin section never requires a shell deploy.
 */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="builder" element={<InterviewBuilderPage />} />
        <Route path="questions" element={<QuestionBankPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
