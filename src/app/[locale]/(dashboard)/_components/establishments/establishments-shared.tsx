"use client";
import { useOrganizationEstablishments } from "@/lib/queries/establishments";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export function EstablishmentsShared({ organizationId }: { organizationId: string }) {
  const { data: establishments = [], isLoading, error } = useOrganizationEstablishments(organizationId);
  const pathname = usePathname();
  const params = useParams();

  // Détecter le contexte (system_admin ou org_admin) selon l'URL courante
  const isSystemAdmin = pathname.includes("/admin/organizations/");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Établissements de l'organisation</h1>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2">
          Nouvel Établissement
        </button>
      </div>
      <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : error ? (
          <p className="text-destructive">Erreur lors du chargement des établissements</p>
        ) : establishments.length === 0 ? (
          <p className="text-muted-foreground">Aucun établissement trouvé pour cette organisation.</p>
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
                      Voir
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
