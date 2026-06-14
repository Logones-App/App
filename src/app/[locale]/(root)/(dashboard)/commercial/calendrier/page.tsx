import { CalendrierContent } from "./_components/calendrier-content";

export default function CalendrierPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <p className="text-muted-foreground text-sm">Vos tâches et rendez-vous commerciaux</p>
      </div>
      <CalendrierContent />
    </div>
  );
}
