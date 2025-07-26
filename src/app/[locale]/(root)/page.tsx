import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded bg-white p-8 text-center shadow">
        <h1 className="mb-4 text-4xl font-bold">Bienvenue sur Next Shadcn Admin Dashboard</h1>
        <p className="mb-6 text-lg text-gray-600">
          Gérez vos établissements, utilisateurs et statistiques depuis une interface moderne et sécurisée.
        </p>
        <Link href="/fr/dashboard">
          <button className="rounded bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700">
            Accéder au dashboard
          </button>
        </Link>
      </div>
    </main>
  );
}
