import type { User, Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole?: string | null;
  currentOrganization?: Record<string, unknown> | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setUserRole: (role: string | null) => void;
  setCurrentOrganization: (organization: Record<string, unknown> | null) => void;
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
      setCurrentOrganization: (organization: Record<string, unknown> | null) =>
        set({ currentOrganization: organization }),
      logout: async () => {
        try {
          // Nettoyer l'état local seulement
          // La déconnexion Supabase est gérée par useLogout
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            userRole: null,
            currentOrganization: null,
          });
        } catch (error) {
          console.error("Erreur lors du nettoyage de l'état:", error);
          // Forcer le nettoyage même en cas d'erreur
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            userRole: null,
            currentOrganization: null,
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
