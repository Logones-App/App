import { AdminQuotesValidation } from "./_components/admin-quotes-validation";

export default function AdminDevisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Validation des devis</h1>
        <p className="text-muted-foreground text-sm">
          Devis soumis par les commerciaux en attente de validation — définissez l&apos;acompte avant de valider
        </p>
      </div>
      <AdminQuotesValidation />
    </div>
  );
}
