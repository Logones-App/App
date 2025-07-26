import { useState, useCallback } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";

import { DnsCheckResult } from "@/lib/services/dns-service";

interface UseDnsCheckOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook pour vérifier la configuration DNS d'un domaine
 */
export function useDnsCheck(domain: string, options: UseDnsCheckOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ["dns-check", domain],
    queryFn: async (): Promise<DnsCheckResult> => {
      const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/check-dns`);

      if (!response.ok) {
        throw new Error("Erreur lors de la vérification DNS");
      }

      return response.json();
    },
    enabled: enabled && !!domain,
    refetchInterval,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook pour vérifier plusieurs domaines en lot
 */
export function useBulkDnsCheck(domains: string[], options: UseDnsCheckOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ["bulk-dns-check", domains],
    queryFn: async (): Promise<Record<string, DnsCheckResult>> => {
      const response = await fetch("/api/domains/check-dns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la vérification DNS en lot");
      }

      return response.json();
    },
    enabled: enabled && domains.length > 0,
    refetchInterval,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook pour vérifier manuellement un domaine (mutation)
 */
export function useManualDnsCheck() {
  return useMutation({
    mutationFn: async (domain: string): Promise<DnsCheckResult> => {
      const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/check-dns`);

      if (!response.ok) {
        throw new Error("Erreur lors de la vérification DNS");
      }

      return response.json();
    },
  });
}

/**
 * Hook pour vérifier manuellement plusieurs domaines (mutation)
 */
export function useManualBulkDnsCheck() {
  return useMutation({
    mutationFn: async (domains: string[]): Promise<Record<string, DnsCheckResult>> => {
      const response = await fetch("/api/domains/check-dns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la vérification DNS en lot");
      }

      return response.json();
    },
  });
}
