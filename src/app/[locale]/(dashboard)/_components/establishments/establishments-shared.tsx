"use client";
import { useOrganizationEstablishments } from "@/lib/queries/establishments";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function EstablishmentsShared({ organizationId }: { organizationId: string }) {
  const t = useTranslations("establishments");
  const { data: establishments = [], isLoading, error } = useOrganizationEstablishments(organizationId);
  const pathname = usePathname();
  const params = useParams();

  // Détecter le contexte (system_admin ou org_admin) selon l'URL courante
  const isSystemAdmin = pathname.includes("/admin/organizations/");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2">
          {t("new_establishment")}
        </button>
      </div>
      <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
        {isLoading ? (
          <p className="text-muted-foreground">{t("loading", { ns: "loading" })}</p>
        ) : error ? (
          <p className="text-destructive">
            {t("error_loading", { default: "Erreur lors du chargement des établissements" })}
          </p>
        ) : establishments.length === 0 ? (
          <p className="text-muted-foreground">{t("empty.description")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {establishments.map((establishment) => {
              // Générer le bon lien selon le contexte
              const detailHref = isSystemAdmin
                ? `/admin/organizations/${organizationId}/establishments/${establishment.id}`
                : `/dashboard/establishments/${establishment.id}`;
              return (
                <li
                  key={establishment.id}
                  className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <span className="text-lg font-semibold">{establishment.name}</span>
                    {establishment.address && (
                      <span className="text-muted-foreground ml-2 text-sm">{establishment.address}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={detailHref} className="text-primary text-sm underline">
                      {t("view", { default: "Voir" })}
                    </Link>
                    {/* Lien vers la gestion des créneaux horaires */}
                    <Link
                      href={
                        isSystemAdmin
                          ? `/admin/organizations/${organizationId}/establishments/${establishment.id}/slots`
                          : `/dashboard/establishments/${establishment.id}/slots`
                      }
                      className="text-sm text-blue-600 underline"
                    >
                      Gérer les créneaux
                    </Link>
                    {/* Lien vers la gestion de la galerie photo */}
                    <Link
                      href={
                        isSystemAdmin
                          ? `/admin/organizations/${organizationId}/establishments/${establishment.id}/gallery`
                          : `/dashboard/establishments/${establishment.id}/gallery`
                      }
                      className="text-sm text-pink-600 underline"
                    >
                      Gérer la galerie photo
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
