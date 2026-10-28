import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { DashboardApp } from './DashboardApp';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Dashboard root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>,
);
