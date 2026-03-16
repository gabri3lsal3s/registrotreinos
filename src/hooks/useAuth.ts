import { useAuthStore } from '../services/authStore';

export function useAuth() {
  const { user, login, logout, isAuthenticated, weeklyGoal, setWeeklyGoal, syncStatus } = useAuthStore();
  return { user, login, logout, isAuthenticated, weeklyGoal, setWeeklyGoal, syncStatus };
}
