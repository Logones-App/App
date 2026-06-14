import { SubscriptionsContent } from "./_components/subscriptions-content";

export default function AbonnementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnements</h1>
        <p className="text-muted-foreground text-sm">Suivez les abonnements récurrents de vos clients</p>
      </div>
      <SubscriptionsContent />
    </div>
  );
}
