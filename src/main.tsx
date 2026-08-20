import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Mon Jun  1 13:07:51 IST 2026
// Mon Jun  1 13:09:41 IST 2026
// rebuild Mon Jun  1 13:17:59 IST 2026
