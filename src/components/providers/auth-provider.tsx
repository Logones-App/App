"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setSession, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider mounted");

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        console.log("Checking Supabase session...");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
        } else {
          console.log("Session result:", session ? "Found" : "None");
          if (session) {
            setUser(session.user);
            setSession(session);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };

    // Délai pour éviter les problèmes de rendu
    const timer = setTimeout(checkAuth, 500);

    // Écouter les changements d'authentification
    const supabase = createClient();
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
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading, router]);

  return <>{children}</>;
}
