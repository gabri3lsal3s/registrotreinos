// Registro do Service Worker para PWA offline com auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Verificar se há atualização do Service Worker a cada carregamento
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn('[SW] Falha ao registrar Service Worker:', err);
    });
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
