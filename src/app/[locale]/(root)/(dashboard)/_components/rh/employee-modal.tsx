"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee, EmployeeInsert, EmployeeUpdate } from "@/lib/queries/employees-queries";

const CONTRACTS = ["cdi", "cdd", "interim", "apprentissage", "stagiaire", "other"] as const;
const CONTRACT_LABELS: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  apprentissage: "Apprentissage",
  stagiaire: "Stage",
  other: "Autre",
};
const ROLES = ["cashier", "manager", "supervisor", "hr_manager"] as const;
const ROLE_LABELS: Record<string, string> = {
  cashier: "Caissier",
  manager: "Manager",
  supervisor: "Superviseur",
  hr_manager: "Resp. RH",
};
const GENDERS = [
  { value: "M", label: "Homme" },
  { value: "F", label: "Femme" },
  { value: "other", label: "Autre" },
];

type SetFn = (k: keyof EmployeeInsert, v: unknown) => void;

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Onglet Identité ──────────────────────────────────────────────────────────

function TabIdentity({ form, set }: { form: Partial<EmployeeInsert>; set: SetFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" required>
          <Input value={form.lastname ?? ""} onChange={(e) => set("lastname", e.target.value)} />
        </Field>
        <Field label="Prénom" required>
          <Input value={form.firstname ?? ""} onChange={(e) => set("firstname", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sexe">
          <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date de naissance">
          <Input type="date" value={form.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} />
        </Field>
        <Field label="Nationalité">
          <Input value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Département de naissance">
          <Input
            value={form.birth_department ?? ""}
            onChange={(e) => set("birth_department", e.target.value)}
            placeholder="Ex : 75"
          />
        </Field>
        <Field label="Commune de naissance">
          <Input value={form.birth_city ?? ""} onChange={(e) => set("birth_city", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="N° Sécurité sociale">
          <Input
            value={form.social_security_number ?? ""}
            onChange={(e) => set("social_security_number", e.target.value)}
            placeholder="15 chiffres"
          />
        </Field>
        <Field label="NIA (si pas de SS)">
          <Input value={form.nia_number ?? ""} onChange={(e) => set("nia_number", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

// ─── Onglet Contrat ───────────────────────────────────────────────────────────

function TabContract({ form, set }: { form: Partial<EmployeeInsert>; set: SetFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type de contrat">
          <Select value={form.contract_type ?? ""} onValueChange={(v) => set("contract_type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONTRACT_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Emploi / Poste">
          <Input value={form.job_title ?? ""} onChange={(e) => set("job_title", e.target.value)} />
        </Field>
      </div>
      <Field label="Qualification">
        <Input value={form.qualification ?? ""} onChange={(e) => set("qualification", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date & heure d'embauche (DPAE)">
          <Input
            type="datetime-local"
            value={form.hire_datetime ? form.hire_datetime.slice(0, 16) : ""}
            onChange={(e) => set("hire_datetime", e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </Field>
        <Field label="Date de sortie">
          <Input type="date" value={form.exit_date ?? ""} onChange={(e) => set("exit_date", e.target.value || null)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salaire brut (€)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={form.gross_salary ?? ""}
            onChange={(e) => set("gross_salary", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Salaire net (€)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={form.net_salary ?? ""}
            onChange={(e) => set("net_salary", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Onglet Accès app ─────────────────────────────────────────────────────────

function TabAccess({ form, set }: { form: Partial<EmployeeInsert>; set: SetFn }) {
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Accès application mobile</p>
          <p className="text-muted-foreground text-sm">Cet employé peut se connecter sur les devices avec un PIN</p>
        </div>
        <Switch checked={form.has_mobile_access ?? false} onCheckedChange={(v) => set("has_mobile_access", v)} />
      </label>
      {form.has_mobile_access && (
        <>
          <Field label="Rôle dans l'app">
            <Select value={form.role ?? ""} onValueChange={(v) => set("role", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un rôle…" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Code PIN">
            <Input
              type="password"
              value={form.pin_code ?? ""}
              onChange={(e) => set("pin_code", e.target.value || null)}
              placeholder="4 à 6 chiffres"
              maxLength={6}
            />
          </Field>
        </>
      )}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Actif</p>
          <p className="text-muted-foreground text-sm">Décocher pour désactiver sans supprimer</p>
        </div>
        <Switch checked={form.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
      </label>
    </div>
  );
}

// ─── Onglet Divers ────────────────────────────────────────────────────────────

function TabOther({ form, set }: { form: Partial<EmployeeInsert>; set: SetFn }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Travailleur étranger / -16 ans
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date autorisation">
          <Input
            type="date"
            value={form.work_permit_date ?? ""}
            onChange={(e) => set("work_permit_date", e.target.value || null)}
          />
        </Field>
        <Field label="Type de titre">
          <Input
            value={form.work_permit_type ?? ""}
            onChange={(e) => set("work_permit_type", e.target.value || null)}
          />
        </Field>
        <Field label="N° d'ordre du titre">
          <Input
            value={form.work_permit_number ?? ""}
            onChange={(e) => set("work_permit_number", e.target.value || null)}
          />
        </Field>
      </div>
      <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wide uppercase">
        Travailleur temporaire / mise à disposition
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom de l'entreprise">
          <Input
            value={form.temp_agency_name ?? ""}
            onChange={(e) => set("temp_agency_name", e.target.value || null)}
          />
        </Field>
        <Field label="Adresse de l'entreprise">
          <Input
            value={form.temp_agency_address ?? ""}
            onChange={(e) => set("temp_agency_address", e.target.value || null)}
          />
        </Field>
      </div>
    </div>
  );
}

// ─── EmployeeModal ────────────────────────────────────────────────────────────

export function EmployeeModal({
  open,
  onOpenChange,
  initial,
  organizationId,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Employee | null;
  organizationId: string;
  onSave: (p: EmployeeInsert | (EmployeeUpdate & { id: string })) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<EmployeeInsert>>({});

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? { ...initial }
        : { organization_id: organizationId, is_active: true, has_mobile_access: false, deleted: false },
    );
  }, [open, initial, organizationId]);

  const set: SetFn = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.firstname?.trim() || !form.lastname?.trim()) return;
    if (initial) {
      onSave({ ...form, id: initial.id });
    } else {
      onSave(form as EmployeeInsert);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l&apos;employé" : "Nouvel employé"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-xs">
            <TabsTrigger value="identity">Identité</TabsTrigger>
            <TabsTrigger value="contract">Contrat</TabsTrigger>
            <TabsTrigger value="access">Accès app</TabsTrigger>
            <TabsTrigger value="other">Divers</TabsTrigger>
          </TabsList>
          <TabsContent value="identity" className="mt-4">
            <TabIdentity form={form} set={set} />
          </TabsContent>
          <TabsContent value="contract" className="mt-4">
            <TabContract form={form} set={set} />
          </TabsContent>
          <TabsContent value="access" className="mt-4">
            <TabAccess form={form} set={set} />
          </TabsContent>
          <TabsContent value="other" className="mt-4">
            <TabOther form={form} set={set} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={pending || !form.firstname?.trim() || !form.lastname?.trim()}>
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
