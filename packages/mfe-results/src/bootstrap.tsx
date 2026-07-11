import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from '@aip/shared';
import '@aip/shared/styles.css';
import ResultPage from './pages/ResultPage';

/** Standalone dev harness — lets this MFE run in isolation on :3004. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/results/:resultId?" element={<ResultPage />} />
        <Route path="*" element={<ResultPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
