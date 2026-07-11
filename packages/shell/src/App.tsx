import { lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Toaster, useAuth } from '@aip/shared';
import { AppLayout } from './layout/AppLayout';
import { RemoteBoundary } from './components/RemoteBoundary';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LandingPage } from './pages/LandingPage';

const LoginPage = lazy(() => import('mfe_auth/LoginPage'));
const RegisterPage = lazy(() => import('mfe_auth/RegisterPage'));
const DashboardPage = lazy(() => import('mfe_dashboard/DashboardPage'));
const MyInterviewsPage = lazy(() => import('mfe_dashboard/MyInterviewsPage'));
const ProfilePage = lazy(() => import('mfe_dashboard/ProfilePage'));
const SettingsPage = lazy(() => import('mfe_dashboard/SettingsPage'));
const HelpPage = lazy(() => import('mfe_dashboard/HelpPage'));
const InterviewSetupPage = lazy(() => import('mfe_interview/InterviewSetupPage'));
const ResultPage = lazy(() => import('mfe_results/ResultPage'));
const AdminApp = lazy(() => import('mfe_admin/AdminApp'));

function roleHome(role: string | undefined): string {
  return role === 'admin' ? '/admin' : '/dashboard';
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session) return <Navigate to={roleHome(session.user.role)} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <RemoteBoundary remoteName="auth">
                <LoginPage />
              </RemoteBoundary>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <RemoteBoundary remoteName="auth">
                <RegisterPage />
              </RemoteBoundary>
            </RedirectIfAuthed>
          }
        />

        {/* Admin portal — the remote owns everything below /admin */}
        <Route
          path="/admin/*"
          element={
            <RequireAdmin>
              <RemoteBoundary remoteName="admin">
                <AdminApp />
              </RemoteBoundary>
            </RequireAdmin>
          }
        />

        {/* Candidate portal */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            path="/dashboard"
            element={
              <RemoteBoundary remoteName="dashboard">
                <DashboardPage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/interview/setup"
            element={
              <RemoteBoundary remoteName="interview">
                <InterviewSetupPage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/results/:resultId?"
            element={
              <RemoteBoundary remoteName="results">
                <ResultPage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/interviews"
            element={
              <RemoteBoundary remoteName="dashboard">
                <MyInterviewsPage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/profile"
            element={
              <RemoteBoundary remoteName="dashboard">
                <ProfilePage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <RemoteBoundary remoteName="dashboard">
                <SettingsPage />
              </RemoteBoundary>
            }
          />
          <Route
            path="/help"
            element={
              <RemoteBoundary remoteName="dashboard">
                <HelpPage />
              </RemoteBoundary>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <PlaceholderPage
              title="Page not found"
              description="The page you are looking for does not exist."
              icon="alert-circle"
            />
          }
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
