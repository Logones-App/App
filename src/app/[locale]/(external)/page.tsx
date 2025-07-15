import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenue sur Studio Admin</h1>
          <p className="text-muted-foreground text-sm">Plateforme de gestion pour restaurants</p>
        </div>

        <div className="flex flex-col space-y-4">
          <Link href="/auth/login">
            <Button className="w-full">Se connecter</Button>
          </Link>

          <Link href="/auth/register">
            <Button variant="outline" className="w-full">
              Créer un compte
            </Button>
          </Link>
        </div>

        <div className="text-muted-foreground px-8 text-center text-sm">
          <p>Test de l'authentification avec Supabase SSR</p>
        </div>
      </div>
    </div>
  );
}
