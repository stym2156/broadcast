import { create } from 'zustand';
import { adminApi } from '../api/mock';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface State {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  hydrate: () => void;
  logout: () => void;
}

export const useAuth = create<State>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  hydrate: () => set({ user: adminApi.getUser(), loading: false }),
  logout: () => {
    adminApi.logout();
    set({ user: null });
  },
}));
