import './assets/main.css';
import App from './components/App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('app-content')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
