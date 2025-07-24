import type { User, Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole?: string | null;
  currentOrganization?: any | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setUserRole: (role: string | null) => void;
  setCurrentOrganization: (organization: any | null) => void;
  logout: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      userRole: null,
      currentOrganization: null,
      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      setSession: (session: Session | null) => set({ session }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setUserRole: (role: string | null) => set({ userRole: role }),
      setCurrentOrganization: (organization: any | null) => set({ currentOrganization: organization }),
      logout: async () => {
        try {
          // Déconnexion de Supabase
          // ... (garde la logique existante)
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
          if (typeof window !== "undefined") {
            window.location.href = "/fr/auth/login";
          }
        } catch (error) {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      reset: () =>
        set({
          user: null,
          session: null,
          isLoading: true,
          isAuthenticated: false,
          userRole: null,
          currentOrganization: null,
        }),
    }),
    {
      name: "auth-store",
    },
  ),
);
