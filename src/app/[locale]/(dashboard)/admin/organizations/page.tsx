export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organisations</h1>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2">
          Nouvelle Organisation
        </button>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6">
          <h3 className="mb-4 font-semibold">Liste des Organisations</h3>

          <div className="space-y-2">
            <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-4">
              <div>
                <h4 className="font-medium">Restaurant Le Gourmet</h4>
                <p className="text-muted-foreground text-sm">2 établissements • 15 utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Créé le 12/07/2025</span>
                <button className="text-primary hover:underline">Voir détails</button>
              </div>
            </div>

            <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-4">
              <div>
                <h4 className="font-medium">Café Central</h4>
                <p className="text-muted-foreground text-sm">1 établissement • 8 utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Créé le 10/07/2025</span>
                <button className="text-primary hover:underline">Voir détails</button>
              </div>
            </div>

            <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-4">
              <div>
                <h4 className="font-medium">Pizzeria Bella</h4>
                <p className="text-muted-foreground text-sm">3 établissements • 22 utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Créé le 08/07/2025</span>
                <button className="text-primary hover:underline">Voir détails</button>
              </div>
            </div>

            <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-4">
              <div>
                <h4 className="font-medium">Boulangerie Artisanale</h4>
                <p className="text-muted-foreground text-sm">1 établissement • 5 utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Créé le 05/07/2025</span>
                <button className="text-primary hover:underline">Voir détails</button>
              </div>
            </div>

            <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-4">
              <div>
                <h4 className="font-medium">Sushi Bar Tokyo</h4>
                <p className="text-muted-foreground text-sm">2 établissements • 12 utilisateurs</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Créé le 03/07/2025</span>
                <button className="text-primary hover:underline">Voir détails</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
