import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  // État
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // État initial
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session: Session | null) => set({ session }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      reset: () =>
        set({
          user: null,
          session: null,
          isLoading: true,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-store',
    }
  )
); 