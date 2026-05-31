"use client";

import { useState } from "react";

import Link from "next/link";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DocJson, useDocImports } from "@/lib/queries/doc-import-queries";

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  processing: { label: "En cours", className: "bg-gray-100 text-gray-600" },
  auto_valide: { label: "Auto-validé", className: "bg-green-100 text-green-700" },
  a_valider: { label: "À valider", className: "bg-orange-100 text-orange-700" },
  valide: { label: "Validé", className: "bg-green-700 text-white" },
  erreur: { label: "Erreur", className: "bg-red-100 text-red-700" },
};
const TYPE_CFG: Record<string, { label: string; className: string }> = {
  facture: { label: "Facture", className: "bg-blue-100 text-blue-700" },
  bl: { label: "Bon de livraison", className: "bg-purple-100 text-purple-700" },
  ticket: { label: "Ticket", className: "bg-gray-100 text-gray-700" },
};
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  return (
    <Badge variant="secondary" className={cfg?.className ?? ""}>
      {cfg?.label ?? status}
    </Badge>
  );
}
function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = TYPE_CFG[type];
  return (
    <Badge variant="secondary" className={cfg?.className ?? ""}>
      {cfg?.label ?? type}
    </Badge>
  );
}

function jsonField(json: unknown, key: keyof DocJson): string {
  if (!json || typeof json !== "object") return "—";
  const val = (json as DocJson)[key];
  return val != null ? String(val) : "—";
}

type Props = { organizationId: string; establishmentId: string; detailBaseUrl: string };

export function DocumentsList({ organizationId, establishmentId, detailBaseUrl }: Props) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [docType, setDocType] = useState("");

  const { data, isLoading } = useDocImports(organizationId, establishmentId, {
    status: status || undefined,
    doc_type: docType || undefined,
    page,
  });

  const docs = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents importés</h1>
        <Badge variant="outline">
          {total} document{total !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status || "__all__"}
          onValueChange={(v) => {
            setStatus(v === "__all__" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            <SelectItem value="processing">En cours</SelectItem>
            <SelectItem value="auto_valide">Auto-validé</SelectItem>
            <SelectItem value="a_valider">À valider</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="erreur">Erreur</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={docType || "__all__"}
          onValueChange={(v) => {
            setDocType(v === "__all__" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types</SelectItem>
            <SelectItem value="facture">Facture</SelectItem>
            <SelectItem value="bl">Bon de livraison</SelectItem>
            <SelectItem value="ticket">Ticket</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Liste des documents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">Aucun document trouvé.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>N° document</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => {
                  const json = doc.consensus_json;
                  const ttc = json != null && typeof json === "object" ? (json as DocJson).total_ttc : null;
                  return (
                    <TableRow key={doc.id} className="cursor-pointer">
                      <TableCell className="text-sm">
                        {doc.created_at ? format(parseISO(doc.created_at), "dd/MM/yyyy", { locale: fr }) : "—"}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={doc.doc_type} />
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm">{jsonField(json, "fournisseur")}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {jsonField(json, "numero_facture") !== "—"
                          ? jsonField(json, "numero_facture")
                          : jsonField(json, "numero_bl")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {typeof ttc === "number" ? eur.format(ttc) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <Link href={`${detailBaseUrl}/${doc.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{total} documents</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
