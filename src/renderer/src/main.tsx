import './assets/main.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

createRoot(document.getElementById('app-content') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
