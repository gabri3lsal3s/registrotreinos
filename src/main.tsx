// Registro do Service Worker para PWA offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/src/services/sw.js');
  });
}
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'

import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
