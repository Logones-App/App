import { PreInvoicesList } from "./_components/pre-invoices-list";

export default function PreFacturationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pré-facturation</h1>
        <p className="text-muted-foreground text-sm">Gérez vos pré-factures et échéanciers de paiement</p>
      </div>
      <PreInvoicesList />
    </div>
  );
}
