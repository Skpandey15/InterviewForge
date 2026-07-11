import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from '@aip/shared';
import '@aip/shared/styles.css';
import DashboardPage from './pages/DashboardPage';

/** Standalone dev harness — lets this MFE run in isolation on :3002. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<DashboardPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
