import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Toaster } from '@aip/shared';
import '@aip/shared/styles.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/** Standalone dev harness — lets this MFE run in isolation on :3001. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
