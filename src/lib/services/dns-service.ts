import dns from "dns/promises";

export interface DnsCheckResult {
  isConfigured: boolean;
  error?: string;
  cname?: string;
  target?: string;
  responseTime?: number;
}

export class DnsService {
  private readonly targetDomain: string;
  private readonly timeout: number;

  constructor(targetDomain?: string, timeout: number = 5000) {
    this.targetDomain = targetDomain ?? this.getDefaultTargetDomain();
    this.timeout = timeout;
  }

  private getDefaultTargetDomain(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        return new URL(appUrl).hostname;
      } catch {
        return "logones.fr";
      }
    }
    return "logones.fr";
  }

  /**
   * Vérifie si un domaine a un CNAME configuré vers notre serveur
   */
  async checkCnameResolution(domain: string): Promise<DnsCheckResult> {
    const startTime = Date.now();

    try {
      // Vérifier que le domaine existe et a un CNAME
      const cnameRecords = await dns.resolveCname(domain);

      if (!cnameRecords || cnameRecords.length === 0) {
        return {
          isConfigured: false,
          error: "Aucun enregistrement CNAME trouvé",
          responseTime: Date.now() - startTime,
        };
      }

      // Vérifier si l'un des CNAME pointe vers notre serveur
      const isConfigured = cnameRecords.some((record) =>
        record.toLowerCase().includes(this.targetDomain.toLowerCase()),
      );

      return {
        isConfigured,
        cname: cnameRecords[0],
        target: this.targetDomain,
        responseTime: Date.now() - startTime,
        error: isConfigured ? undefined : `CNAME pointe vers ${cnameRecords[0]} au lieu de ${this.targetDomain}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur de résolution DNS";

      return {
        isConfigured: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Vérifie la résolution A record (pour les domaines qui utilisent A au lieu de CNAME)
   */
  async checkARecordResolution(domain: string): Promise<DnsCheckResult> {
    const startTime = Date.now();

    try {
      const aRecords = await dns.resolve4(domain);

      if (!aRecords || aRecords.length === 0) {
        return {
          isConfigured: false,
          error: "Aucun enregistrement A trouvé",
          responseTime: Date.now() - startTime,
        };
      }

      // Note: Pour les A records, on ne peut pas vérifier automatiquement
      // car on ne connaît pas l'IP de notre serveur
      return {
        isConfigured: true, // On suppose que c'est configuré si on a des A records
        target: "A record détecté",
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        isConfigured: false,
        error: "Erreur de résolution A record",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Vérification complète DNS (CNAME + A record)
   */
  async checkDomainResolution(domain: string): Promise<DnsCheckResult> {
    // Essayer d'abord CNAME
    const cnameResult = await this.checkCnameResolution(domain);

    if (cnameResult.isConfigured) {
      return cnameResult;
    }

    // Si CNAME échoue, essayer A record
    const aResult = await this.checkARecordResolution(domain);

    if (aResult.isConfigured) {
      return {
        ...aResult,
        error: "A record détecté (CNAME recommandé pour une meilleure flexibilité)",
      };
    }

    // Aucune configuration trouvée
    return {
      isConfigured: false,
      error: "Aucune configuration DNS trouvée. Configurez un CNAME vers " + this.targetDomain,
      target: this.targetDomain,
      responseTime: cnameResult.responseTime,
    };
  }

  /**
   * Vérification en lot pour plusieurs domaines
   */
  async checkMultipleDomains(domains: string[]): Promise<Record<string, DnsCheckResult>> {
    const results: Record<string, DnsCheckResult> = {};

    // Vérifier en parallèle avec un délai entre chaque requête
    const promises = domains.map(async (domain, index) => {
      // Petit délai pour éviter de surcharger les serveurs DNS
      await new Promise((resolve) => setTimeout(resolve, index * 100));
      const result = await this.checkDomainResolution(domain);
      results[domain] = result;
    });

    await Promise.all(promises);
    return results;
  }
}
