"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/supabase/database.types";
import { isValidNaf, nafError } from "@/lib/utils/naf";

type Est = Tables<"establishments">;

interface FormState {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  siret: string;
  no_tva: string;
  code_naf: string;
  description: string;
}

function toForm(est: Est): FormState {
  return {
    name: est.name ?? "",
    address: est.address ?? "",
    postal_code: est.postal_code != null ? String(est.postal_code) : "",
    city: est.city ?? "",
    country: est.country ?? "FR",
    phone: est.phone ?? "",
    email: est.email ?? "",
    website: est.website ?? "",
    siret: est.siret ?? "",
    no_tva: est.no_tva ?? "",
    code_naf: est.code_naf ?? "",
    description: est.description ?? "",
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  tag,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  tag?: string;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {tag && <span className="text-muted-foreground ml-1 text-xs">({tag})</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-destructive focus-visible:ring-destructive" : ""}
      />
      {error && <p className="text-destructive mt-0.5 text-xs">{error}</p>}
    </div>
  );
}

export function EstablishmentEditModal({
  establishment,
  open,
  onOpenChange,
}: {
  establishment: Est;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(establishment));

  useEffect(() => {
    if (open) setForm(toForm(establishment));
  }, [open, establishment]);

  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/establishments/${establishment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          country: form.country || null,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          siret: form.siret || null,
          no_tva: form.no_tva || null,
          code_naf: form.code_naf || null,
          description: form.description || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur inattendue");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["establishment", establishment.id] });
      toast.success("Établissement mis à jour.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;établissement</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nom" value={form.name} onChange={set("name")} required />
          </div>
          <div className="sm:col-span-2">
            <Field label="Adresse" value={form.address} onChange={set("address")} tag="NF525" />
          </div>
          <Field label="Code postal" value={form.postal_code} onChange={set("postal_code")} tag="NF525" />
          <Field label="Ville" value={form.city} onChange={set("city")} tag="NF525" />
          <Field label="Pays" value={form.country} onChange={set("country")} />
          <Field label="Téléphone" value={form.phone} onChange={set("phone")} type="tel" />
          <Field label="Email" value={form.email} onChange={set("email")} type="email" />
          <Field label="Site web" value={form.website} onChange={set("website")} type="url" />
          <Field label="SIRET" value={form.siret} onChange={set("siret")} required tag="NF525" />
          <Field label="N° TVA intracomm." value={form.no_tva} onChange={set("no_tva")} required tag="NF525" />
          <Field
            label="Code NAF"
            value={form.code_naf}
            onChange={set("code_naf")}
            required
            tag="NF525"
            error={nafError(form.code_naf, true)}
          />
          <div className="sm:col-span-2">
            <Field label="Description" value={form.description} onChange={set("description")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !form.name.trim() ||
              !form.siret.trim() ||
              !form.no_tva.trim() ||
              !isValidNaf(form.code_naf)
            }
          >
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
