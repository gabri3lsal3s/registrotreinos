import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  weeklyGoal: number;
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  login: (user: User, token: string) => void;
  logout: () => void;
  setWeeklyGoal: (goal: number) => void;
  setSyncStatus: (status: 'synced' | 'pending' | 'syncing' | 'error') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      weeklyGoal: 5,
      syncStatus: 'synced',
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setWeeklyGoal: (goal) => set({ weeklyGoal: goal }),
      setSyncStatus: (status) => set({ syncStatus: status }),
    }),
    {
      name: 'auth-storage', // Nome no localStorage
    }
  )
);
