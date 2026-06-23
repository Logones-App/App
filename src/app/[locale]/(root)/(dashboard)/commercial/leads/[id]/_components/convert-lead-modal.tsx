"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

import { PLANS, StepEst, StepOrg, StepRecap, StepTabletCredentials, StepVat } from "./convert-lead-steps";
import { type EstForm, type LeadInfo, type OrgForm, type VatRow } from "./convert-lead-types";

export type { LeadInfo };

type WizardMode = "new" | "existing";

interface OrgOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  leadId: string;
  lead: LeadInfo;
  onClose: () => void;
  onSuccess: (orgId: string) => void;
}

const DEFAULT_VAT: VatRow[] = [
  { name: "Taux réduit", value: "5.5", checked: true },
  { name: "Taux intermédiaire", value: "10", checked: true },
  { name: "Taux normal", value: "20", checked: true },
];

const STEPS = ["Organisation", "Restaurant", "Taux TVA", "Récapitulatif"];

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
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
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

export function ConvertLeadWizard({ open, leadId, lead, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<WizardMode>("new");
  const [step, setStep] = useState(0);
  const [existingOrgId, setExistingOrgId] = useState("");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabletCredentials, setPosCredentials] = useState<{ email: string; password: string } | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<OrgForm>({ name: "", description: "", subscription_plan: "starter" });
  const [estForm, setEstForm] = useState<EstForm>({
    name: "",
    address: "",
    postal_code: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    siret: "",
    no_tva: "",
  });
  const [vatRates, setVatRates] = useState<VatRow[]>(DEFAULT_VAT);

  useEffect(() => {
    if (!open) return;
    setMode("new");
    setStep(0);
    setExistingOrgId("");
    setPosCredentials(null);
    setPendingOrgId(null);
    setVatRates(DEFAULT_VAT);
    setOrgForm({ name: lead.company_name, description: "", subscription_plan: "starter" });
    setEstForm({
      name: lead.company_name,
      address: "",
      postal_code: "",
      city: lead.city ?? "",
      phone: lead.contact_phone ?? "",
      email: lead.contact_email ?? "",
      website: lead.website ?? "",
      siret: "",
      no_tva: "",
    });
  }, [open, lead.company_name, lead.city, lead.contact_phone, lead.contact_email, lead.website]);

  useEffect(() => {
    if (mode !== "existing") return;
    setIsLoadingOrgs(true);
    const supabase = createClient();
    void supabase
      .from("organizations")
      .select("id, name")
      .eq("deleted", false)
      .order("name")
      .then(({ data }) => {
        setOrgs((data ?? []) as OrgOption[]);
        setIsLoadingOrgs(false);
      });
  }, [mode]);

  const setOrg = (f: keyof OrgForm, v: string) => setOrgForm((p) => ({ ...p, [f]: v }));
  const setEst = (f: keyof EstForm, v: string) => setEstForm((p) => ({ ...p, [f]: v }));

  function toggleVat(i: number) {
    setVatRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r)));
  }
  function updateVat(i: number, field: "name" | "value", val: string) {
    setVatRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }
  function addVat() {
    setVatRates((prev) => [...prev, { name: "", value: "", checked: true }]);
  }
  function removeVat(i: number) {
    setVatRates((prev) => prev.filter((_, idx) => idx !== i));
  }

  function validateStep(): boolean {
    if (step === 0 && !orgForm.name.trim()) {
      toast.error("Le nom de l'organisation est requis");
      return false;
    }
    if (step === 1 && !estForm.name.trim()) {
      toast.error("Le nom du restaurant est requis");
      return false;
    }
    return true;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmitNew() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "new",
          org: {
            name: orgForm.name.trim(),
            description: emptyToNull(orgForm.description),
            subscription_plan: orgForm.subscription_plan,
          },
          establishment: {
            name: estForm.name.trim(),
            address: emptyToNull(estForm.address),
            postal_code: estForm.postal_code ? parseInt(estForm.postal_code, 10) : null,
            city: emptyToNull(estForm.city),
            phone: emptyToNull(estForm.phone),
            email: emptyToNull(estForm.email),
            website: emptyToNull(estForm.website),
            siret: emptyToNull(estForm.siret),
            no_tva: emptyToNull(estForm.no_tva),
          },
          vat_rates: vatRates
            .filter((r) => r.checked && r.value)
            .map((r) => ({ name: r.name || `${r.value}%`, value: parseFloat(r.value) })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        orgId?: string;
        error?: string;
        tabletCredentials?: { email: string; password: string } | null;
        tabletError?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la conversion");
      if (data.tabletCredentials) {
        setPendingOrgId(data.orgId ?? "");
        setPosCredentials(data.tabletCredentials);
      } else {
        if (data.tabletError) toast.warning("Organisation créée, mais le compte tablette n'a pas pu être configuré");
        else toast.success("Organisation et restaurant créés avec succès");
        onSuccess(data.orgId ?? "");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitExisting() {
    if (!existingOrgId) {
      toast.error("Sélectionnez une organisation");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "existing", org_id: existingOrgId }),
      });
      const data = (await res.json()) as { ok?: boolean; orgId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success("Lead lié à l'organisation");
      onSuccess(data.orgId ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const activePlan = PLANS.find((p) => p.value === orgForm.subscription_plan)?.label ?? orgForm.subscription_plan;
  const activeVat = vatRates.filter((r) => r.checked && r.value);
  const spinner = isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Convertir le lead en organisation</DialogTitle>
        </DialogHeader>

        {tabletCredentials ? (
          <>
            <div className="flex-1 overflow-y-auto pr-1">
              <StepTabletCredentials email={tabletCredentials.email} password={tabletCredentials.password} />
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => onSuccess(pendingOrgId ?? "")}>
                Fermer et accéder à l&apos;organisation
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <RadioGroup
              value={mode}
              onValueChange={(v) => {
                setMode(v as WizardMode);
                setStep(0);
              }}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="new" id="m-new" />
                <Label htmlFor="m-new" className="cursor-pointer font-normal">
                  Nouvelle organisation
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="existing" id="m-existing" />
                <Label htmlFor="m-existing" className="flex cursor-pointer items-center gap-1.5 font-normal">
                  <Search className="h-3.5 w-3.5" />
                  Lier à une existante
                </Label>
              </div>
            </RadioGroup>

            <Separator />

            {mode === "existing" && (
              <div className="space-y-2 py-2">
                <Label>Organisation</Label>
                {isLoadingOrgs ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </div>
                ) : (
                  <Select value={existingOrgId} onValueChange={setExistingOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {mode === "new" && (
              <>
                <WizardStepper step={step} />
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {step === 0 && <StepOrg form={orgForm} setOrg={setOrg} />}
                  {step === 1 && <StepEst form={estForm} setEst={setEst} />}
                  {step === 2 && (
                    <StepVat rates={vatRates} toggle={toggleVat} update={updateVat} add={addVat} remove={removeVat} />
                  )}
                  {step === 3 && (
                    <StepRecap
                      orgForm={orgForm}
                      estForm={estForm}
                      activeVat={activeVat}
                      activePlan={activePlan}
                      contactEmail={lead.contact_email}
                      contactName={lead.contact_name}
                    />
                  )}
                </div>
              </>
            )}

            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <div className="flex gap-2">
                {mode === "new" && step > 0 && (
                  <Button variant="outline" onClick={back} disabled={isSubmitting}>
                    Précédent
                  </Button>
                )}
                {mode === "new" && !isLastStep && <Button onClick={next}>Suivant</Button>}
                {mode === "new" && isLastStep && (
                  <Button onClick={handleSubmitNew} disabled={isSubmitting}>
                    {spinner}
                    Créer l&apos;organisation
                  </Button>
                )}
                {mode === "existing" && (
                  <Button onClick={handleSubmitExisting} disabled={isSubmitting || !existingOrgId}>
                    {spinner}
                    Lier
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
