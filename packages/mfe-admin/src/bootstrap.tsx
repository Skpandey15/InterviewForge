import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Toaster } from '@aip/shared';
import '@aip/shared/styles.css';
import AdminApp from './AdminApp';

/** Standalone dev harness — lets this MFE run in isolation on :3005. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
