export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Administratif</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Organisations</h3>
          <p className="text-2xl font-bold">12</p>
          <p className="text-muted-foreground text-sm">Organisations actives</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Utilisateurs</h3>
          <p className="text-2xl font-bold">156</p>
          <p className="text-muted-foreground text-sm">Utilisateurs totaux</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Établissements</h3>
          <p className="text-2xl font-bold">89</p>
          <p className="text-muted-foreground text-sm">Établissements actifs</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Réservations</h3>
          <p className="text-2xl font-bold">1,234</p>
          <p className="text-muted-foreground text-sm">Réservations aujourd'hui</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Organisations Récentes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border p-2">
              <span>Restaurant Le Gourmet</span>
              <span className="text-muted-foreground text-sm">2 établissements</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Café Central</span>
              <span className="text-muted-foreground text-sm">1 établissement</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Pizzeria Bella</span>
              <span className="text-muted-foreground text-sm">3 établissements</span>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Activité Récente</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border p-2">
              <span>Nouvelle organisation créée</span>
              <span className="text-muted-foreground text-sm">Il y a 2h</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Utilisateur ajouté</span>
              <span className="text-muted-foreground text-sm">Il y a 4h</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Établissement mis à jour</span>
              <span className="text-muted-foreground text-sm">Il y a 6h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
