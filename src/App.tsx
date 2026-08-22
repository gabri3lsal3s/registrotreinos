import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute, LoadingScreen, ErrorBoundary } from './components/common';
import { useAuthStore } from './services/authStore';
import { fullSync } from './services/syncService';

// Lazy loading das rotas para otimização de performance e code splitting
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProtocolsPage = lazy(() => import('./pages/ProtocolsPage'));
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

import { supabase } from './services/supabaseClient';

function App() {
  const { isAuthenticated, login, logout } = useAuthStore();

  useEffect(() => {
    // Monitoramento do ciclo de vida da sessão Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && session?.access_token) {
        login({ id: session.user.id, email: session.user.email || '' }, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [login, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      // Sincronismo inicial (Não bloqueante / Offline First)
      const initApp = async () => {
        try {
          await fullSync();
        } catch (err) {
          console.warn('[Sync] Inicialização em modo offline:', err);
        }
      };
      
      initApp();

      // Sincronismo ao retornar para o app (Visibility API)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          fullSync().catch((err) => console.warn('[Sync] Falha na sincronização ao focar aba:', err));
        }
      };

      // Sincronismo imediato ao restabelecer conexão (Online Event)
      const handleOnline = () => {
        fullSync().catch((err) => console.warn('[Sync] Falha na sincronização ao retornar online:', err));
      };

      // Heartbeat periódico em segundo plano (a cada 3 minutos) durante treinos
      const heartbeatInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          fullSync().catch((err) => console.warn('[Sync] Heartbeat sync falhou silenciosamente:', err));
        }
      }, 3 * 60 * 1000);

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);

      return () => {
        clearInterval(heartbeatInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/protocols"
              element={
                <ProtectedRoute>
                  <ProtocolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout/:protocolId"
              element={
                <ProtectedRoute>
                  <WorkoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
