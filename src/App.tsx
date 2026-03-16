
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProtocolsPage from './pages/ProtocolsPage';
import WorkoutPage from './pages/WorkoutPage';
import HistoryPage from './pages/HistoryPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

import { useEffect } from 'react';
import { useAuthStore } from './services/authStore';
import { fullSync } from './services/syncService';

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      // Sincronismo inicial
      fullSync().catch(console.error);

      // Sincronismo ao retornar para o app (Visibility API)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fullSync().catch(console.error);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
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
    </BrowserRouter>
  );
}

export default App;
