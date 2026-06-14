import { CommercialDashboard } from "./_components/commercial-dashboard";

export default function CommercialPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Vue d&apos;ensemble de votre activité commerciale</p>
      </div>
      <CommercialDashboard />
    </div>
  );
}
