import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord administrateur</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble du système et des organisations</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Badge variant="secondary">Total</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-muted-foreground text-xs">+2 ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
            <Badge variant="secondary">Total</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-muted-foreground text-xs">+180 ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Établissements</CardTitle>
            <Badge variant="secondary">Total</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-muted-foreground text-xs">+12 ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <Badge variant="secondary">Ce mois</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€45,231</div>
            <p className="text-muted-foreground text-xs">+20.1% vs mois dernier</p>
          </CardContent>
        </Card>
      </div>

      {/* Sections principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Dernières actions des organisations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nouvelle organisation créée</p>
                  <p className="text-muted-foreground text-xs">Restaurant Le Gourmet - il y a 2h</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Utilisateur ajouté</p>
                  <p className="text-muted-foreground text-xs">Marie Dupont - Restaurant La Belle Époque - il y a 4h</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Établissement mis à jour</p>
                  <p className="text-muted-foreground text-xs">Café Central - horaires modifiés - il y a 6h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Organisations par statut</CardTitle>
            <CardDescription>Répartition des organisations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Actives</span>
                </div>
                <span className="text-sm font-medium">8</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">En attente</span>
                </div>
                <span className="text-sm font-medium">3</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Suspendues</span>
                </div>
                <span className="text-sm font-medium">1</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Accès rapide aux fonctionnalités principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
              <div className="text-2xl">🏢</div>
              <div>
                <p className="font-medium">Gérer les organisations</p>
                <p className="text-muted-foreground text-sm">Voir et modifier les organisations</p>
              </div>
            </div>
            <div className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
              <div className="text-2xl">👥</div>
              <div>
                <p className="font-medium">Gérer les utilisateurs</p>
                <p className="text-muted-foreground text-sm">Voir et modifier les utilisateurs</p>
              </div>
            </div>
            <div className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
              <div className="text-2xl">⚙️</div>
              <div>
                <p className="font-medium">Paramètres système</p>
                <p className="text-muted-foreground text-sm">Configurer le système</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
