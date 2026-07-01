"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { Download, Loader2, Mail } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, defaultDateRange, rangeToIso } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { writeJet180 } from "@/lib/permissions/nf525-jet";
import { buildAccountingCsv, computeVatBreakdown, computeVatByDay } from "@/lib/queries/accounting-export-queries";
import { useEstablishmentOrders } from "@/lib/queries/orders-queries";
import { computeRevenueByPaymentMethod } from "@/lib/queries/sales-reporting-queries";
import { createClient } from "@/lib/supabase/client";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function ComptabiliteClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const [range, setRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const { fromDate, toDate, fromIso, toIso } = rangeToIso(range);

  const ordersQ = useEstablishmentOrders(establishmentId, organizationId, fromIso, toIso);
  const orders = useMemo(() => ordersQ.data ?? [], [ordersQ.data]);

  const vat = useMemo(() => computeVatBreakdown(orders), [orders]);
  const byMethod = useMemo(() => computeRevenueByPaymentMethod(orders), [orders]);

  const totalHt = vat.reduce((s, r) => s + r.ht, 0);
  const totalVat = vat.reduce((s, r) => s + r.vat, 0);
  const totalTtc = vat.reduce((s, r) => s + r.ttc, 0);

  const filename = `export-comptable_${fromDate}_${toDate}.csv`;

  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleGenerate = async () => {
    if (orders.length === 0) return;
    const csv = buildAccountingCsv(computeVatByDay(orders));
    downloadCsv(csv, filename);
    const jetError = await writeJet180(createClient(), {
      establishmentId,
      organizationId,
      label: `Export comptable ${fromDate}→${toDate}`,
    });
    if (jetError) toast.error(`Export généré mais journalisation NF525 (JET 180) échouée : ${jetError}`);
    else toast.success("Export généré");
  };

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const csv = buildAccountingCsv(computeVatByDay(orders));
      const res = await fetch(`/api/establishments/${establishmentId}/accounting-export/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, recipientEmail: email.trim(), fromDate, toDate, filename, csv }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success("Export envoyé au cabinet");
      setSendOpen(false);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSending(false);
    }
  };

  const noData = orders.length === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Export comptable</h1>
            <Badge variant="secondary">Montants HT</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Transmission au cabinet : ventilation TVA et encaissements (pas de FEC normé)
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total HT" value={`${fmt(totalHt)} €`} hint={`${fromDate} → ${toDate}`} />
        <StatCard title="Total TVA" value={`${fmt(totalVat)} €`} hint="toutes tranches" />
        <StatCard title="Total TTC" value={`${fmt(totalTtc)} €`} hint="ventes encaissées" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleGenerate()} disabled={noData}>
          <Download className="mr-2 h-4 w-4" />
          Générer l&apos;export (CSV)
        </Button>
        <Button variant="outline" onClick={() => setSendOpen(true)} disabled={noData}>
          <Mail className="mr-2 h-4 w-4" />
          Envoyer au cabinet
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ventilation de la TVA</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersQ.isPending ? (
              <p className="text-muted-foreground p-4 text-sm">Chargement…</p>
            ) : noData ? (
              <p className="text-muted-foreground p-4 text-sm">Aucune vente sur la période.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taux</TableHead>
                    <TableHead className="text-right">HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vat.map((r) => (
                    <TableRow key={r.vatRate}>
                      <TableCell className="font-medium">{r.vatRate.toFixed(1)} %</TableCell>
                      <TableCell className="text-right">{fmt(r.ht)} €</TableCell>
                      <TableCell className="text-right">{fmt(r.vat)} €</TableCell>
                      <TableCell className="text-right">{fmt(r.ttc)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Encaissements par mode (TTC)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersQ.isPending ? (
              <p className="text-muted-foreground p-4 text-sm">Chargement…</p>
            ) : noData ? (
              <p className="text-muted-foreground p-4 text-sm">Aucun encaissement sur la période.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMethod.map((r) => (
                    <TableRow key={r.method}>
                      <TableCell className="font-medium">{r.method}</TableCell>
                      <TableCell className="text-right">{fmt(r.amount)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer l&apos;export au cabinet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="accountant-email">Email du cabinet comptable</Label>
            <Input
              id="accountant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cabinet@exemple.fr"
            />
            <p className="text-muted-foreground text-xs">
              L&apos;export CSV ({fromDate} → {toDate}) sera envoyé en pièce jointe.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
