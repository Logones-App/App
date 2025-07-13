import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <CardTitle className="text-6xl font-bold text-gray-400">404</CardTitle>
          <CardDescription className="text-xl">Page non trouvée</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Retour au dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
