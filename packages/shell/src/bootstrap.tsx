import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@aip/shared/styles.css';
import './styles/shell.css';
import { App } from './App';
import { initDatadog } from './observability/datadog';

// Datadog RUM — inert unless VITE_DD_RUM_* env is set at build time.
initDatadog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
