import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { DnsCheckResult } from "@/lib/services/dns-service";

interface DnsStatusBadgeProps {
  result?: DnsCheckResult;
  isLoading?: boolean;
  isError?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function DnsStatusBadge({ 
  result, 
  isLoading = false, 
  isError = false, 
  showDetails = false,
  className = ""
}: DnsStatusBadgeProps) {
  if (isLoading) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        Vérification...
      </Badge>
    );
  }

  if (isError) {
    return (
      <Badge variant="destructive" className={`flex items-center gap-1 ${className}`}>
        <XCircle className="h-3 w-3" />
        Erreur
      </Badge>
    );
  }

  if (!result) {
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
        <Clock className="h-3 w-3" />
        Non vérifié
      </Badge>
    );
  }

  if (result.isConfigured) {
    return (
      <Badge variant="default" className={`flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 ${className}`}>
        <CheckCircle className="h-3 w-3" />
        {showDetails ? `DNS OK (${result.responseTime}ms)` : "DNS OK"}
      </Badge>
    );
  }

  // DNS non configuré
  return (
    <Badge variant="destructive" className={`flex items-center gap-1 ${className}`}>
      <AlertCircle className="h-3 w-3" />
      {showDetails ? "DNS à configurer" : "DNS KO"}
    </Badge>
  );
}

interface DnsStatusWithTooltipProps extends DnsStatusBadgeProps {
  domain: string;
}

export function DnsStatusWithTooltip({ domain, result, isLoading, isError, showDetails }: DnsStatusWithTooltipProps) {
  const getTooltipContent = () => {
    if (isLoading) return "Vérification en cours...";
    if (isError) return "Erreur lors de la vérification";
    if (!result) return "Cliquez pour vérifier";
    
    if (result.isConfigured) {
      return `DNS configuré correctement${result.responseTime ? ` (${result.responseTime}ms)` : ""}`;
    }
    
    return result.error || "DNS non configuré";
  };

  return (
    <div className="group relative inline-block">
      <DnsStatusBadge 
        result={result} 
        isLoading={isLoading} 
        isError={isError} 
        showDetails={showDetails}
      />
      <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap">
          {getTooltipContent()}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
} 