import Link from "next/link";

export default function HomePageSimple() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Bienvenue sur l'Application</h1>
        <p className="text-lg text-gray-600">Système de gestion pour restaurants</p>
        <div className="space-x-4">
          <Link
            href="/auth/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-lg px-6 py-3"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 inline-block rounded-lg px-6 py-3"
          >
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}
