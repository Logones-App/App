"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Initialiser l'état d'authentification
    const initializeAuth = async () => {
      try {
        // Vérifier la session actuelle
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Erreur lors de la récupération de la session:", error);
          return;
        }

        if (session) {
          setUser(session.user);
          setSession(session);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'authentification:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

// Composant pour initialiser les rôles et l'organisation
export function RoleInitializer({ children }: { children: React.ReactNode }) {
  // Le middleware gère maintenant les rôles automatiquement
  return <>{children}</>;
}
