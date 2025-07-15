export default function OrgDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Restaurant</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Établissements</h3>
          <p className="text-2xl font-bold">3</p>
          <p className="text-muted-foreground text-sm">Établissements actifs</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Réservations</h3>
          <p className="text-2xl font-bold">45</p>
          <p className="text-muted-foreground text-sm">Réservations aujourd'hui</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Menus</h3>
          <p className="text-2xl font-bold">12</p>
          <p className="text-muted-foreground text-sm">Menus actifs</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold">Équipe</h3>
          <p className="text-2xl font-bold">8</p>
          <p className="text-muted-foreground text-sm">Membres de l'équipe</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Réservations Récentes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border p-2">
              <span>Table 4 - 20h00</span>
              <span className="text-muted-foreground text-sm">4 personnes</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Table 2 - 19h30</span>
              <span className="text-muted-foreground text-sm">2 personnes</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Table 8 - 21h00</span>
              <span className="text-muted-foreground text-sm">6 personnes</span>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Établissements</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border p-2">
              <span>Restaurant Principal</span>
              <span className="text-muted-foreground text-sm">Ouvert</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Terrasse</span>
              <span className="text-muted-foreground text-sm">Ouvert</span>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <span>Salle Privée</span>
              <span className="text-muted-foreground text-sm">Réservée</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
