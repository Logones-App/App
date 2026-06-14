"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { type Lead, LEAD_SECTORS } from "../../_components/leads-types";

interface FormState {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  website: string;
  sector: string;
  current_software: string;
  employees_count: string;
  covers_per_day: string;
  photo_url: string;
  notes: string;
}

interface Props {
  open: boolean;
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

function toStr(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function emptyToNull(s: string): string | null {
  return s.trim() || null;
}

export function EditLeadModal({ open, lead, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    website: "",
    sector: "",
    current_software: "",
    employees_count: "",
    covers_per_day: "",
    photo_url: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      company_name: lead.company_name,
      contact_name: toStr(lead.contact_name),
      contact_email: toStr(lead.contact_email),
      contact_phone: toStr(lead.contact_phone),
      city: toStr(lead.city),
      website: toStr(lead.website),
      sector: toStr(lead.sector),
      current_software: toStr(lead.current_software),
      employees_count: toStr(lead.employees_count),
      covers_per_day: toStr(lead.covers_per_day),
      photo_url: toStr(lead.photo_url),
      notes: toStr(lead.notes),
    });
  }, [open, lead]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.company_name.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("leads")
        .update({
          company_name: form.company_name.trim(),
          contact_name: emptyToNull(form.contact_name),
          contact_email: emptyToNull(form.contact_email),
          contact_phone: emptyToNull(form.contact_phone),
          city: emptyToNull(form.city),
          website: emptyToNull(form.website),
          sector: emptyToNull(form.sector),
          current_software: emptyToNull(form.current_software),
          employees_count: form.employees_count ? parseInt(form.employees_count, 10) : null,
          covers_per_day: form.covers_per_day ? parseInt(form.covers_per_day, 10) : null,
          photo_url: emptyToNull(form.photo_url),
          notes: emptyToNull(form.notes),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      if (error) throw error;
      toast.success("Lead mis à jour");
      onSuccess();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le lead</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Entreprise</p>
          <div className="space-y-1.5">
            <Label>Nom de l&apos;entreprise *</Label>
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Secteur</Label>
              <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </div>

          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Contact</p>
          <div className="space-y-1.5">
            <Label>Nom du contact</Label>
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
          </div>

          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Qualification</p>
          <div className="space-y-1.5">
            <Label>Logiciel actuel</Label>
            <Input
              value={form.current_software}
              onChange={(e) => set("current_software", e.target.value)}
              placeholder="Ex : Lightspeed, Zelty…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Effectif</Label>
              <Input
                type="number"
                min="0"
                value={form.employees_count}
                onChange={(e) => set("employees_count", e.target.value)}
                placeholder="Nb personnes"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couverts / jour</Label>
              <Input
                type="number"
                min="0"
                value={form.covers_per_day}
                onChange={(e) => set("covers_per_day", e.target.value)}
                placeholder="Nb couverts"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL photo</Label>
            <Input value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://" />
          </div>

          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Notes internes</p>
          <div className="space-y-1.5">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Informations complémentaires…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
