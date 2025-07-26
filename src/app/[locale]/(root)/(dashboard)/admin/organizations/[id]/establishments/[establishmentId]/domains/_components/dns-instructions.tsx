interface DnsInstructionsProps {
  newDomain: string;
  validationError: string | null;
}

export function DnsInstructions({ newDomain, validationError }: DnsInstructionsProps) {
  if (validationError || !newDomain.trim()) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <h4 className="mb-2 font-medium text-blue-900">Configuration DNS requise :</h4>
      <p className="text-sm text-blue-800">
        Pour que ce domaine fonctionne, vous devez configurer un enregistrement CNAME dans votre DNS :
      </p>
      <div className="mt-2 rounded border bg-white p-2 font-mono text-sm">
        {newDomain.trim()} → CNAME → {process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "logones.fr"}
      </div>
    </div>
  );
}
