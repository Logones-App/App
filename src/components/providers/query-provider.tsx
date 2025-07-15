"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes (plus long pour éviter les refetch inutiles)
            gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection)
            retry: 1, // Moins de retry pour éviter les boucles
            refetchOnWindowFocus: false, // Désactiver pour éviter les conflits avec realtime
            refetchOnReconnect: true, // Garder pour la reconnexion
            refetchOnMount: false, // Désactiver pour éviter les refetch inutiles
          },
          mutations: {
            retry: 1,
            // Pas d'invalidation automatique pour éviter les boucles
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
