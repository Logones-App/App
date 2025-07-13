"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { useUserMainRole } from "@/lib/queries/auth";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider mounted");

    const supabase = createClient();
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Écouter les changements d'authentification en premier
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session) {
        setUser(session.user);
        setSession(session);
        setLoading(false);
        router.push("/dashboard");
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
        setLoading(false);
        router.push("/auth/v1/login");
      } else if (event === "INITIAL_SESSION") {
        // Gérer la session initiale
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

        // Vérifier les cookies d'abord
        const cookies = document.cookie;
        console.log("Available cookies:", cookies);

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
  }, [setUser, setSession, setLoading, router]);

  return <>{children}</>;
}

// Composant pour initialiser les rôles et l'organisation
export function RoleInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  // Initialiser le rôle et l'organisation quand l'utilisateur est connecté
  useUserMainRole(user?.id);

  return <>{children}</>;
}
