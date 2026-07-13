"use client";

import { useState } from "react";

import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidNaf, nafError } from "@/lib/utils/naf";

import { CompanySearch, type CompanyPrefill } from "./company-search";
import { CredentialsDisplay } from "./credentials-display";

interface EstFields {
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
}

const EMPTY_FORM: EstFields = {
  name: "",
  address: "",
  postal_code: "",
  city: "",
  country: "FR",
  phone: "",
  email: "",
  website: "",
  siret: "",
  no_tva: "",
  code_naf: "",
};

// Les taux de TVA ne sont plus saisis ici : ils sont seedés au niveau ORGANISATION à sa création
// (voir PLAN_VAT_ORG_SCOPING.md). Le wizard se limite à l'établissement puis au récapitulatif.
const STEPS = ["Établissement", "Récapitulatif"];

function emptyToNull(s: string): string | null {
  return s.trim() || null;
}

function WizardStepper({ step }: { step: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-start">
          <div className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-center text-[10px] ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={`mt-3.5 h-px flex-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function FormEst({
  form,
  set,
  touch,
  touched,
  prefill,
}: {
  form: EstFields;
  set: (k: keyof EstFields, v: string) => void;
  touch: (k: keyof EstFields) => void;
  touched: Set<keyof EstFields>;
  prefill: (fields: CompanyPrefill) => void;
}) {
  const err = (k: keyof EstFields) => touched.has(k) && !form[k].trim();
  const siretRaw = form.siret.replace(/\s/g, "");
  const siretErr = touched.has("siret")
    ? !form.siret.trim()
      ? "Champ requis"
      : !/^\d{14}$/.test(siretRaw)
        ? "14 chiffres requis"
        : null
    : null;
  const nafErr = nafError(form.code_naf, touched.has("code_naf"));
  const destructiveCls = "border-destructive focus-visible:ring-destructive";
  const inputCls = (k: keyof EstFields) => {
    if (k === "siret") return siretErr ? destructiveCls : "";
    if (k === "code_naf") return nafErr ? destructiveCls : "";
    return err(k) ? destructiveCls : "";
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CompanySearch onSelect={prefill} />

      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          Nom du restaurant <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={() => touch("name")}
          placeholder="Nom de l'établissement"
          autoFocus
          className={inputCls("name")}
        />
        {err("name") && <p className="text-destructive mt-0.5 text-xs">Champ requis</p>}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          Adresse <span className="text-destructive">*</span>{" "}
          <span className="text-muted-foreground text-xs">(NF525)</span>
        </Label>
        <Input
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          onBlur={() => touch("address")}
          placeholder="Rue, numéro…"
          className={inputCls("address")}
        />
        {err("address") && <p className="text-destructive mt-0.5 text-xs">Champ requis</p>}
      </div>
      <div className="space-y-1.5">
        <Label>
          Code postal <span className="text-destructive">*</span>
        </Label>
        <Input
          type="number"
          value={form.postal_code}
          onChange={(e) => set("postal_code", e.target.value)}
          onBlur={() => touch("postal_code")}
          placeholder="69000"
          className={inputCls("postal_code")}
        />
        {err("postal_code") && <p className="text-destructive mt-0.5 text-xs">Champ requis</p>}
      </div>
      <div className="space-y-1.5">
        <Label>
          Ville <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          onBlur={() => touch("city")}
          placeholder="Lyon"
          className={inputCls("city")}
        />
        {err("city") && <p className="text-destructive mt-0.5 text-xs">Champ requis</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Pays</Label>
        <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="FR" />
      </div>
      <div className="space-y-1.5">
        <Label>Téléphone</Label>
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 4 …" />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="contact@restaurant.fr"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Site web</Label>
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label>
          SIRET <span className="text-destructive">*</span>{" "}
          <span className="text-muted-foreground text-xs">(NF525)</span>
        </Label>
        <Input
          value={form.siret}
          onChange={(e) => set("siret", e.target.value)}
          onBlur={() => touch("siret")}
          placeholder="123 456 789 00012"
          className={inputCls("siret")}
        />
        {siretErr && <p className="text-destructive mt-0.5 text-xs">{siretErr}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>
          N° TVA intracomm. <span className="text-destructive">*</span>{" "}
          <span className="text-muted-foreground text-xs">(NF525)</span>
        </Label>
        <Input
          value={form.no_tva}
          onChange={(e) => set("no_tva", e.target.value)}
          onBlur={() => touch("no_tva")}
          placeholder="FR12345678901"
          className={inputCls("no_tva")}
        />
        {err("no_tva") && <p className="text-destructive mt-0.5 text-xs">Champ requis</p>}
      </div>
      <div className="space-y-1.5">
        <Label>
          Code NAF <span className="text-destructive">*</span>{" "}
          <span className="text-muted-foreground text-xs">(NF525)</span>
        </Label>
        <Input
          value={form.code_naf}
          onChange={(e) => set("code_naf", e.target.value)}
          onBlur={() => touch("code_naf")}
          placeholder="56.10A"
          className={inputCls("code_naf")}
        />
        {nafErr && <p className="text-destructive mt-0.5 text-xs">{nafErr}</p>}
      </div>
    </div>
  );
}

function FormRecap({ form }: { form: EstFields }) {
  const address = [form.address, form.postal_code, form.city, form.country].filter(Boolean).join(", ");
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1 rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Restaurant</p>
        <p className="font-semibold">{form.name}</p>
        {address && <p className="text-muted-foreground text-xs">{address}</p>}
        {form.phone && <p className="text-muted-foreground text-xs">{form.phone}</p>}
        {form.email && <p className="text-muted-foreground text-xs">{form.email}</p>}
        {form.siret && <p className="text-muted-foreground text-xs">SIRET : {form.siret}</p>}
        {form.no_tva && <p className="text-muted-foreground text-xs">TVA : {form.no_tva}</p>}
        {form.code_naf && <p className="text-muted-foreground text-xs">NAF : {form.code_naf}</p>}
      </div>
      <p className="text-muted-foreground text-xs">
        Les taux de TVA appliqués aux produits sont ceux de l&apos;organisation.
      </p>
    </div>
  );
}

interface Props {
  open: boolean;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STEP0_REQUIRED: (keyof EstFields)[] = ["name", "address", "postal_code", "city", "siret", "no_tva", "code_naf"];

export function CreateEstablishmentModal({ open, organizationId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EstFields>(EMPTY_FORM);
  const [touched, setTouched] = useState<Set<keyof EstFields>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const siretDigits = form.siret.replace(/\s/g, "");
  const isStep0Valid =
    STEP0_REQUIRED.every((k) => form[k].trim() !== "") && /^\d{14}$/.test(siretDigits) && isValidNaf(form.code_naf);

  function handleClose() {
    if (isSubmitting) return;
    setStep(0);
    setForm(EMPTY_FORM);
    setTouched(new Set());
    setCredentials(null);
    onClose();
  }

  const set = (k: keyof EstFields, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const touch = (k: keyof EstFields) => setTouched((prev) => new Set([...prev, k]));
  const prefill = (fields: CompanyPrefill) => setForm((p) => ({ ...p, ...fields }));

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/establishments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishment: {
            name: form.name.trim(),
            address: emptyToNull(form.address),
            postal_code: form.postal_code || null,
            city: emptyToNull(form.city),
            country: form.country.trim() || "FR",
            phone: emptyToNull(form.phone),
            email: emptyToNull(form.email),
            website: emptyToNull(form.website),
            siret: emptyToNull(form.siret),
            no_tva: emptyToNull(form.no_tva),
            code_naf: emptyToNull(form.code_naf),
          },
        }),
      });
      const data = (await res.json()) as {
        estId?: string;
        tabletCredentials?: { email: string; password: string } | null;
        tabletError?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.tabletCredentials) {
        setCredentials(data.tabletCredentials);
      } else {
        if (data.tabletError) toast.warning("Établissement créé, mais le compte tablette n'a pas pu être configuré");
        else toast.success("Établissement créé avec succès");
        onSuccess();
        handleClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Ajouter un établissement</DialogTitle>
        </DialogHeader>

        {credentials ? (
          <>
            <div className="flex-1 overflow-y-auto pr-1">
              <CredentialsDisplay email={credentials.email} password={credentials.password} />
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  onSuccess();
                  handleClose();
                }}
              >
                Fermer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <WizardStepper step={step} />
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {step === 0 && <FormEst form={form} set={set} touch={touch} touched={touched} prefill={prefill} />}
              {step === 1 && <FormRecap form={form} />}
            </div>
            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isSubmitting}>
                    Précédent
                  </Button>
                )}
                {!isLastStep && (
                  <Button onClick={next} disabled={step === 0 && !isStep0Valid}>
                    Suivant
                  </Button>
                )}
                {isLastStep && (
                  <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer l&apos;établissement
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
