import { useAuthStore } from '../services/authStore';

export function useAuth() {
  const { user, login, logout, isAuthenticated } = useAuthStore();
  return { user, login, logout, isAuthenticated };
}
