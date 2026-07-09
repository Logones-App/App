"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  type SupplierRow,
  type SupplierWithCount,
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/lib/queries/supplier-queries";

// ─── Formulaire fournisseur ───────────────────────────────────────────────────

type SupplierForm = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  notes: string;
  is_active: boolean;
  ce_approval_number: string;
  certifications: string; // saisie séparée par virgules → text[]
  quality_rating: string; // "" | "1".."5"
};

const emptyForm = (): SupplierForm => ({
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  notes: "",
  is_active: true,
  ce_approval_number: "",
  certifications: "",
  quality_rating: "",
});

const rowToForm = (s: SupplierRow): SupplierForm => ({
  name: s.name,
  contact_name: s.contact_name ?? "",
  email: s.email ?? "",
  phone: s.phone ?? "",
  address: s.address ?? "",
  website: s.website ?? "",
  notes: s.notes ?? "",
  is_active: s.is_active,
  ce_approval_number: s.ce_approval_number ?? "",
  certifications: (s.certifications ?? []).join(", "),
  quality_rating: s.quality_rating != null ? String(s.quality_rating) : "",
});

/** Convertit les champs qualité/HACCP du formulaire vers le patch table `suppliers`. */
const haccpPatch = (v: SupplierForm) => ({
  ce_approval_number: v.ce_approval_number.trim() || null,
  certifications: v.certifications
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  quality_rating: v.quality_rating ? Number(v.quality_rating) : null,
});

const RATINGS = ["1", "2", "3", "4", "5"];
const NO_RATING = "__none__";

function SupplierFormCard({
  title,
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  title: string;
  initial: SupplierForm;
  onSave: (values: SupplierForm) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<SupplierForm>(initial);
  const patch = (key: keyof SupplierForm, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sup-name">Nom *</Label>
            <Input
              id="sup-name"
              autoFocus
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Métro, Transgourmet…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-contact">Contact</Label>
            <Input
              id="sup-contact"
              value={form.contact_name}
              onChange={(e) => patch("contact_name", e.target.value)}
              placeholder="Jean Dupont"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              placeholder="commandes@fournisseur.fr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-phone">Téléphone</Label>
            <Input
              id="sup-phone"
              value={form.phone}
              onChange={(e) => patch("phone", e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-address">Adresse</Label>
            <Input
              id="sup-address"
              value={form.address}
              onChange={(e) => patch("address", e.target.value)}
              placeholder="12 rue de la Paix, 75001 Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-website">Site web</Label>
            <Input
              id="sup-website"
              value={form.website}
              onChange={(e) => patch("website", e.target.value)}
              placeholder="https://www.fournisseur.fr"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sup-notes">Notes</Label>
            <Textarea
              id="sup-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="Conditions particulières, horaires livraison…"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="sup-active" checked={form.is_active} onCheckedChange={(v) => patch("is_active", v)} />
            <Label htmlFor="sup-active">Actif</Label>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Qualité &amp; HACCP</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sup-ce">N° d&apos;agrément sanitaire CE</Label>
              <Input
                id="sup-ce"
                value={form.ce_approval_number}
                onChange={(e) => patch("ce_approval_number", e.target.value)}
                placeholder="FR 12.345.678 CE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-rating">Note qualité</Label>
              <Select
                value={form.quality_rating || NO_RATING}
                onValueChange={(v) => patch("quality_rating", v === NO_RATING ? "" : v)}
              >
                <SelectTrigger id="sup-rating">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RATING}>— Non notée</SelectItem>
                  {RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sup-certs">
                Certifications{" "}
                <span className="text-muted-foreground text-xs font-normal">(séparées par des virgules)</span>
              </Label>
              <Input
                id="sup-certs"
                value={form.certifications}
                onChange={(e) => patch("certifications", e.target.value)}
                placeholder="IFS, ISO 22000, BIO, Label Rouge"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => onSave(form)} disabled={isPending || !form.name.trim()}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Ligne fournisseur ────────────────────────────────────────────────────────

function SupplierTableRow({
  supplier,
  organizationId,
  basePath,
}: {
  supplier: SupplierWithCount;
  organizationId: string;
  basePath: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateMutation = useUpdateSupplier(organizationId);
  const deleteMutation = useDeleteSupplier(organizationId);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="p-2">
          <SupplierFormCard
            title="Modifier le fournisseur"
            initial={rowToForm(supplier)}
            onSave={(values) =>
              updateMutation.mutate(
                {
                  id: supplier.id,
                  patch: {
                    name: values.name,
                    contact_name: values.contact_name || null,
                    email: values.email || null,
                    phone: values.phone || null,
                    address: values.address || null,
                    website: values.website || null,
                    notes: values.notes || null,
                    is_active: values.is_active,
                    ...haccpPatch(values),
                  },
                },
                { onSuccess: () => setEditing(false) },
              )
            }
            onCancel={() => setEditing(false)}
            isPending={updateMutation.isPending}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`${basePath}/${supplier.id}`} className="hover:underline">
              {supplier.name}
            </Link>
            {!supplier.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactif
              </Badge>
            )}
            {supplier.ce_approval_number && (
              <Badge variant="outline" className="text-xs" title={supplier.ce_approval_number}>
                CE ✓
              </Badge>
            )}
            {supplier.quality_rating != null && (
              <span className="text-muted-foreground text-xs">★ {supplier.quality_rating}/5</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{supplier.contact_name ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{supplier.email ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{supplier.phone ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">{supplier.notes ?? "—"}</TableCell>
        <TableCell className="text-center text-sm tabular-nums">
          {supplier.productCount > 0 ? (
            <Badge variant="secondary">{supplier.productCount}</Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateMutation.mutate({ id: supplier.id, patch: { is_active: !supplier.is_active } })}
              title={supplier.is_active ? "Désactiver" : "Activer"}
            >
              {supplier.is_active ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="text-muted-foreground h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditing(true)}
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Voir les produits">
              <Link href={`${basePath}/${supplier.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {supplier.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {supplier.productCount > 0
                ? `Ce fournisseur est lié à ${supplier.productCount} produit${supplier.productCount > 1 ? "s" : ""}. Les associations seront supprimées. L'historique des prix est conservé.`
                : "Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMutation.mutate(supplier.id);
                setConfirmDelete(false);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SuppliersClient({ organizationId: orgIdProp }: { organizationId?: string } = {}) {
  const orgIdFromHook = useOrgaUserOrganizationId();
  const organizationId = orgIdProp ?? orgIdFromHook ?? "";
  const pathname = usePathname();
  const basePath = pathname.replace(/\/$/, "");
  const [showCreate, setShowCreate] = useState(false);
  const { data: suppliers = [], isLoading } = useSuppliers(organizationId);
  const createMutation = useCreateSupplier(organizationId);

  const active = suppliers.filter((s) => s.is_active);
  const inactive = suppliers.filter((s) => !s.is_active);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-muted-foreground text-sm">
            {suppliers.length} fournisseur{suppliers.length > 1 ? "s" : ""} — {active.length} actif
            {active.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {showCreate && (
        <SupplierFormCard
          title="Nouveau fournisseur"
          initial={emptyForm()}
          onSave={(values) =>
            createMutation.mutate(
              {
                name: values.name,
                contact_name: values.contact_name || null,
                email: values.email || null,
                phone: values.phone || null,
                address: values.address || null,
                website: values.website || null,
                notes: values.notes || null,
                is_active: values.is_active,
                ...haccpPatch(values),
              },
              { onSuccess: () => setShowCreate(false) },
            )
          }
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-center">Produits</TableHead>
              <TableHead className="w-[120px] text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Aucun fournisseur. Créez-en un pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {active.map((s) => (
                  <SupplierTableRow key={s.id} supplier={s} organizationId={organizationId} basePath={basePath} />
                ))}
                {inactive.length > 0 && active.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground bg-muted/30 py-2 text-xs font-medium">
                      Inactifs ({inactive.length})
                    </TableCell>
                  </TableRow>
                )}
                {inactive.map((s) => (
                  <SupplierTableRow key={s.id} supplier={s} organizationId={organizationId} basePath={basePath} />
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
