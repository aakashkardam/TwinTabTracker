import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { PopupApp } from './PopupApp';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Popup root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
