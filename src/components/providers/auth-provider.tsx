"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { useUserMainRole } from "@/lib/queries/auth";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    console.log("AuthProvider mounted");

    const supabase = createClient();
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session) {
        console.log("🔐 Connexion détectée");
        setUser(session.user);
        setSession(session);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        console.log("🔐 Déconnexion détectée");
        setUser(null);
        setSession(null);
        setLoading(false);
      } else if (event === "INITIAL_SESSION") {
        console.log("Initial session:", session);
        if (session) {
          setUser(session.user);
          setSession(session);
        }
        setLoading(false);
      }
    });

    // Vérifier la session actuelle
    const checkCurrentSession = async () => {
      try {
        console.log("Checking current session...");

        // Vérifier la session via l'API route côté serveur
        try {
          const response = await fetch("/api/auth/session");
          if (response.ok) {
            const data = await response.json();
            console.log("Session API result:", data);
            if (data.user) {
              setUser(data.user);
              setSession(data.session);
            }
          } else {
            console.log("Session API error:", response.status);
          }
        } catch (apiError) {
          console.error("Session API error:", apiError);
        }

        setLoading(false);
      } catch (error) {
        console.error("Session check error:", error);
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    };

    // Exécuter la vérification
    checkCurrentSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading]);

  return <>{children}</>;
}

// Composant pour initialiser les rôles et l'organisation
export function RoleInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  // Initialiser le rôle et l'organisation quand l'utilisateur est connecté
  useUserMainRole(user?.id);

  return <>{children}</>;
}
