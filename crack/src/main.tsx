import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GachaApp from './components/GachaApp/GachaApp';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GachaApp />
  </StrictMode>
);
