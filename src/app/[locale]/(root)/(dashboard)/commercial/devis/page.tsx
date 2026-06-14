import { QuotesList } from "./_components/quotes-list";

export default function DevisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Devis</h1>
        <p className="text-muted-foreground text-sm">Créez et gérez vos propositions commerciales</p>
      </div>
      <QuotesList />
    </div>
  );
}
