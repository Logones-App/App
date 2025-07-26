"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DnsStatusBadge } from "@/components/ui/dns-status-badge";
import { useDnsCheck, useManualDnsCheck } from "@/hooks/use-dns-check";
import { Tables } from "@/lib/supabase/database.types";

type CustomDomain = Tables<"custom_domains">;

interface DomainItemProps {
  domain: CustomDomain;
  onDeactivate: () => void;
  onDelete: () => void;
  isDeactivating: boolean;
  isDeleting: boolean;
}

export function DomainItem({ domain, onDeactivate, onDelete, isDeactivating, isDeleting }: DomainItemProps) {
  // Vérification DNS automatique pour les domaines actifs
  const {
    data: dnsResult,
    isLoading: dnsLoading,
    error: dnsError,
    refetch: refetchDns,
  } = useDnsCheck(domain.domain, {
    enabled: domain.is_active,
    refetchInterval: 5 * 60 * 1000, // Vérifier toutes les 5 minutes
  });

  const manualDnsCheck = useManualDnsCheck();

  const handleManualDnsCheck = () => {
    manualDnsCheck.mutate(domain.domain, {
      onSuccess: () => {
        refetchDns();
        toast.success("Vérification DNS effectuée");
      },
      onError: () => {
        toast.error("Erreur lors de la vérification DNS");
      },
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <DomainInfo domain={domain} dnsResult={dnsResult} dnsLoading={dnsLoading} dnsError={dnsError} />
      <DomainActions
        domain={domain}
        onDeactivate={onDeactivate}
        onDelete={onDelete}
        isDeactivating={isDeactivating}
        isDeleting={isDeleting}
        onManualDnsCheck={handleManualDnsCheck}
        manualDnsCheckPending={manualDnsCheck.isPending}
      />
    </div>
  );
}

interface DomainInfoProps {
  domain: CustomDomain;
  dnsResult: any;
  dnsLoading: boolean;
  dnsError: any;
}

function DomainInfo({ domain, dnsResult, dnsLoading, dnsError }: DomainInfoProps) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-semibold">{domain.domain}</h3>
        <DnsStatusBadge result={dnsResult} isLoading={dnsLoading} isError={!!dnsError} showDetails={true} />
      </div>
      <p className="text-muted-foreground text-sm">
        Ajouté le {new Date(domain.created_at ?? "").toLocaleDateString("fr-FR")}
      </p>
      {dnsResult && !dnsResult.isConfigured && <p className="mt-1 text-xs text-red-600">{dnsResult.error}</p>}
    </div>
  );
}

interface DomainActionsProps {
  domain: CustomDomain;
  onDeactivate: () => void;
  onDelete: () => void;
  isDeactivating: boolean;
  isDeleting: boolean;
  onManualDnsCheck: () => void;
  manualDnsCheckPending: boolean;
}

function DomainActions({
  domain,
  onDeactivate,
  onDelete,
  isDeactivating,
  isDeleting,
  onManualDnsCheck,
  manualDnsCheckPending,
}: DomainActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={domain.is_active ? "default" : "secondary"}>{domain.is_active ? "Actif" : "Inactif"}</Badge>

      {domain.is_active && (
        <Button variant="outline" size="sm" onClick={onManualDnsCheck} disabled={manualDnsCheckPending}>
          <RefreshCw className={`h-3 w-3 ${manualDnsCheckPending ? "animate-spin" : ""}`} />
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onDeactivate} disabled={isDeactivating || !domain.is_active}>
        {isDeactivating ? "Désactivation..." : "Désactiver"}
      </Button>

      {!domain.is_active && (
        <Button variant="outline" size="sm" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? "Suppression..." : "Supprimer"}
        </Button>
      )}
    </div>
  );
}
