export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2">
          Nouvel Utilisateur
        </button>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground">Page de gestion des utilisateurs - À implémenter</p>
      </div>
    </div>
  );
}
