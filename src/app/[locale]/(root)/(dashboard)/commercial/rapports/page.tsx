import { RapportsContent } from "./_components/rapports-content";

export default function RapportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="text-muted-foreground text-sm">Analysez vos performances commerciales</p>
      </div>
      <RapportsContent />
    </div>
  );
}
