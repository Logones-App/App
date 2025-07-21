"use client";
import { useEstablishment } from "@/lib/queries/establishments";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Package, List, UtensilsCrossed } from "lucide-react";

export function EstablishmentDetailsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { data: establishment, isLoading, error } = useEstablishment(establishmentId);
  const pathname = usePathname();

  // Détecter le contexte (system_admin ou org_admin) basé sur l'URL actuelle
  const isSystemAdmin = pathname.includes("/admin/organizations/");

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div className="text-destructive">Erreur lors du chargement de l'établissement</div>;
  if (!establishment) return <div>Aucun établissement trouvé.</div>;

  // Générer les liens corrects selon le contexte
  const getLink = (section: string) => {
    if (isSystemAdmin) {
      return `/admin/organizations/${organizationId}/establishments/${establishmentId}/${section}`;
    } else {
      return `/dashboard/establishments/${establishmentId}/${section}`;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{establishment.name}</h1>

      <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
        <p>
          <span className="font-semibold">Adresse :</span> {establishment.address || "-"}
        </p>
        <p>
          <span className="font-semibold">Organisation :</span> <span className="font-mono">{organizationId}</span>
        </p>
        <p>
          <span className="font-semibold">Description :</span> {establishment.description || "-"}
        </p>
      </div>

      {/* Navigation vers les pages enfants */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Gestion de l'établissement</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href={getLink("menus")}>
            <Button variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-2">
              <UtensilsCrossed className="h-6 w-6" />
              <span>Menus</span>
            </Button>
          </Link>

          <Link href={getLink("bookings")}>
            <Button variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Réservations</span>
            </Button>
          </Link>

          <Link href={getLink("opening-hours")}>
            <Button variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-2">
              <Clock className="h-6 w-6" />
              <span>Horaires d'ouverture</span>
            </Button>
          </Link>

          <Link href={getLink("products")}>
            <Button variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-2">
              <Package className="h-6 w-6" />
              <span>Produits</span>
            </Button>
          </Link>

          <Link href={getLink("categories")}>
            <Button variant="outline" className="flex h-20 w-full flex-col items-center justify-center gap-2">
              <List className="h-6 w-6" />
              <span>Catégories</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
