"use client";

import { useState } from "react";

import { AlertTriangle, Check, CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { type EstForm, type OrgForm, type VatRow } from "./convert-lead-types";

export const PLANS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

export function StepOrg({ form, setOrg }: { form: OrgForm; setOrg: (f: keyof OrgForm, v: string) => void }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>
          Nom de l&apos;organisation <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setOrg("name", e.target.value)}
          placeholder="Nom de l'entreprise"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setOrg("description", e.target.value)}
          rows={2}
          placeholder="Description courte (optionnel)"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Plan d&apos;abonnement</Label>
        <Select value={form.subscription_plan} onValueChange={(v) => setOrg("subscription_plan", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function StepEst({ form, setEst }: { form: EstForm; setEst: (f: keyof EstForm, v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          Nom du restaurant <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setEst("name", e.target.value)}
          placeholder="Nom de l'établissement"
          autoFocus
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Adresse</Label>
        <Input value={form.address} onChange={(e) => setEst("address", e.target.value)} placeholder="Rue, numéro…" />
      </div>
      <div className="space-y-1.5">
        <Label>Code postal</Label>
        <Input
          type="number"
          value={form.postal_code}
          onChange={(e) => setEst("postal_code", e.target.value)}
          placeholder="69000"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Ville</Label>
        <Input value={form.city} onChange={(e) => setEst("city", e.target.value)} placeholder="Lyon" />
      </div>
      <div className="space-y-1.5">
        <Label>Téléphone</Label>
        <Input value={form.phone} onChange={(e) => setEst("phone", e.target.value)} placeholder="+33 4 …" />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setEst("email", e.target.value)}
          placeholder="contact@restaurant.fr"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Site web</Label>
        <Input value={form.website} onChange={(e) => setEst("website", e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label>SIRET</Label>
        <Input value={form.siret} onChange={(e) => setEst("siret", e.target.value)} placeholder="123 456 789 00012" />
      </div>
      <div className="space-y-1.5">
        <Label>N° TVA intracomm.</Label>
        <Input value={form.no_tva} onChange={(e) => setEst("no_tva", e.target.value)} placeholder="FR12345678901" />
      </div>
    </div>
  );
}

export function StepVat({
  rates,
  toggle,
  update,
  add,
  remove,
}: {
  rates: VatRow[];
  toggle: (i: number) => void;
  update: (i: number, field: "name" | "value", val: string) => void;
  add: () => void;
  remove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Taux appliqués aux produits de cet établissement. Taux standards français pré-sélectionnés.
      </p>
      <div className="space-y-2">
        {rates.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Checkbox checked={r.checked} onCheckedChange={() => toggle(i)} />
            <Input
              value={r.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Libellé"
              className="h-8 flex-1 text-sm"
              disabled={!r.checked}
            />
            <Input
              value={r.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="0"
              className="h-8 w-16 text-sm"
              type="number"
              step="0.1"
              min="0"
              max="100"
              disabled={!r.checked}
            />
            <span className="text-muted-foreground text-sm">%</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Ajouter un taux
      </Button>
    </div>
  );
}

export function StepRecap({
  orgForm,
  estForm,
  activeVat,
  activePlan,
  contactEmail,
  contactName,
}: {
  orgForm: OrgForm;
  estForm: EstForm;
  activeVat: VatRow[];
  activePlan: string;
  contactEmail?: string | null;
  contactName?: string | null;
}) {
  const addressLine = [estForm.address, estForm.postal_code, estForm.city].filter(Boolean).join(", ");
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1 rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Organisation</p>
        <p className="font-semibold">{orgForm.name}</p>
        {orgForm.description && <p className="text-muted-foreground text-xs">{orgForm.description}</p>}
        <Badge variant="outline" className="text-xs">
          {activePlan}
        </Badge>
      </div>
      <div className="space-y-1 rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Restaurant</p>
        <p className="font-semibold">{estForm.name}</p>
        {addressLine && <p className="text-muted-foreground text-xs">{addressLine}</p>}
        {estForm.phone && <p className="text-muted-foreground text-xs">{estForm.phone}</p>}
        {estForm.email && <p className="text-muted-foreground text-xs">{estForm.email}</p>}
        {estForm.siret && <p className="text-muted-foreground text-xs">SIRET : {estForm.siret}</p>}
        {estForm.no_tva && <p className="text-muted-foreground text-xs">TVA : {estForm.no_tva}</p>}
      </div>
      <div className="space-y-1.5 rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Taux TVA</p>
        {activeVat.length === 0 ? (
          <p className="text-muted-foreground text-xs">Aucun taux sélectionné</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeVat.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {r.name || `Taux ${r.value}%`} — {r.value}%
              </Badge>
            ))}
          </div>
        )}
      </div>
      {contactEmail && (
        <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="text-[10px] font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">
            Accès SaaS (org_admin)
          </p>
          {contactName && <p className="text-xs font-medium">{contactName}</p>}
          <p className="font-mono text-xs">{contactEmail}</p>
          <p className="text-muted-foreground text-xs">Une invitation sera envoyée à cette adresse</p>
        </div>
      )}
    </div>
  );
}

export function StepTabletCredentials({ email, password }: { email: string; password: string }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  function copy(text: string, setCopied: (v: boolean) => void) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrContent = JSON.stringify({ email, password });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}&margin=10`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700 dark:bg-green-950/30 dark:text-green-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Établissement créé avec succès</p>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Identifiants tablette</p>
        <div className="flex justify-center rounded-lg border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code credentials POS" width={200} height={200} />
        </div>

        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="text-muted-foreground min-w-14 text-xs font-medium">Email</span>
          <span className="flex-1 font-mono text-xs break-all">{email}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(email, setCopiedEmail)}>
            {copiedEmail ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="text-muted-foreground min-w-14 text-xs font-medium">Password</span>
          <span className="flex-1 font-mono text-xs break-all">{password}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(password, setCopiedPwd)}>
            {copiedPwd ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Ces credentials ne seront plus affichés après fermeture. Scannez le QR code ou notez-les maintenant.</p>
      </div>
    </div>
  );
}
