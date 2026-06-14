"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { LEAD_SECTORS, LEAD_SOURCES, type LeadSource } from "./leads-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateLeadModal({ open, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    sector: "",
    website: "",
    notes: "",
    source: "manual" as LeadSource,
    source_details: "",
  });

  function set(field: string, value: string) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("leads").insert({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        city: form.city.trim() || null,
        sector: form.sector || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        source: form.source,
        source_details: form.source_details.trim() || null,
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
        status: "new",
      });

      if (error) throw error;

      toast.success("Lead créé avec succès");
      setForm({
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        city: "",
        sector: "",
        website: "",
        notes: "",
        source: "manual",
        source_details: "",
      });
      onSuccess();
    } catch {
      toast.error("Erreur lors de la création du lead");
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau lead</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Entreprise <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                placeholder="Prénom Nom"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Poste</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="+33 6 …"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              placeholder="contact@restaurant.fr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Paris" />
            </div>
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
          </div>

          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://restaurant.fr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Détail source</Label>
              <Input
                value={form.source_details}
                onChange={(e) => set("source_details", e.target.value)}
                placeholder="Ex: LinkedIn, Salon SIRHA…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Contexte, besoins, informations utiles…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
