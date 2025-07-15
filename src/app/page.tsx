import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="space-y-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Bienvenue sur votre plateforme de gestion de restaurants
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Gérez vos établissements, menus, réservations et plus encore avec notre solution complète.
          </p>

          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/register">Créer un compte</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des établissements</CardTitle>
              <CardDescription>Créez et gérez vos restaurants avec facilité</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Ajoutez vos établissements, configurez leurs informations et gérez leur visibilité.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menus et produits</CardTitle>
              <CardDescription>Créez des menus attractifs pour vos clients</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Gérez vos produits, catégories et menus avec un système intuitif.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réservations</CardTitle>
              <CardDescription>Gérez les réservations de vos clients</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Acceptez et gérez les réservations en temps réel.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
