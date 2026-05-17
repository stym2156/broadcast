import { create } from 'zustand';
import type { User } from '../types';
import { mockApi } from '../api/mock';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  hydrate: () => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  hydrate: () => set({ user: mockApi.getStoredUser(), loading: false }),
  logout: () => {
    mockApi.logout();
    set({ user: null });
  },
}));
