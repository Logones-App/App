/**
 * Utilitaires pour la gestion des domaines
 * Centralise la logique de détection des custom domains
 */

/**
 * Détecte si l'application s'exécute sur un custom domain
 * @returns true si c'est un custom domain, false sinon
 */
export const isCustomDomain = (): boolean => {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  return (
    hostname !== "logones.fr" &&
    hostname !== "localhost" &&
    !hostname.includes("127.0.0.1") &&
    !hostname.includes("0.0.0.0")
  );
};

/**
 * Détecte si l'application s'exécute sur le domaine principal
 * @returns true si c'est le domaine principal, false sinon
 */
export const isMainDomain = (): boolean => {
  return !isCustomDomain();
};

/**
 * Retourne le type de domaine actuel
 * @returns "custom" ou "main"
 */
export const getDomainType = (): "custom" | "main" => {
  return isCustomDomain() ? "custom" : "main";
};

/**
 * Log les informations de domaine pour le debug
 */
export const logDomainInfo = (): void => {
  if (typeof window === "undefined") return;

  console.log("🌐 Informations de domaine:", {
    hostname: window.location.hostname,
    type: getDomainType(),
    isCustom: isCustomDomain(),
    isMain: isMainDomain(),
  });
};
