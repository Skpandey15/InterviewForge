import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from '@aip/shared';
import '@aip/shared/styles.css';
import InterviewSetupPage from './pages/InterviewSetupPage';

/** Standalone dev harness — lets this MFE run in isolation on :3003. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<InterviewSetupPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
