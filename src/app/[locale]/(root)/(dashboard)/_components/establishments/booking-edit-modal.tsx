"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Booking = Tables<"bookings">;

// Valeurs alignées sur la contrainte CHECK bookings_status_check.
const STATUS_OPTIONS = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "seated", label: "Installé (présent)" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled", label: "Annulé" },
];

type FormState = {
  date: string;
  time: string;
  number_of_guests: number;
  service_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  special_requests: string;
  status: string;
};

function toForm(b: Booking): FormState {
  return {
    date: b.date,
    time: b.time,
    number_of_guests: b.number_of_guests,
    service_name: b.service_name,
    customer_first_name: b.customer_first_name,
    customer_last_name: b.customer_last_name,
    customer_email: b.customer_email,
    customer_phone: b.customer_phone,
    special_requests: b.special_requests ?? "",
    status: b.status,
  };
}

function emptyForm(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today,
    time: "19:00",
    number_of_guests: 2,
    service_name: "Service standard",
    customer_first_name: "",
    customer_last_name: "",
    customer_email: "",
    customer_phone: "",
    special_requests: "",
    status: "pending",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function BookingEditModal({
  open,
  onOpenChange,
  booking,
  mode,
  establishmentId,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  booking: Booking | null;
  mode: "view" | "edit" | "create";
  establishmentId: string;
  organizationId: string;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const readOnly = mode === "view";
  const isCreate = mode === "create";

  useEffect(() => {
    if (!open) return;
    setForm(booking ? toForm(booking) : emptyForm());
  }, [open, booking]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const canSave =
    !!form &&
    !!form.date &&
    !!form.time &&
    !!form.customer_first_name.trim() &&
    !!form.customer_last_name.trim() &&
    form.number_of_guests > 0;

  const handleSave = async () => {
    if (!form || !canSave) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      date: form.date,
      time: form.time,
      number_of_guests: Number(form.number_of_guests),
      service_name: form.service_name,
      customer_first_name: form.customer_first_name,
      customer_last_name: form.customer_last_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      special_requests: form.special_requests || null,
      status: form.status,
    };
    const { error } = isCreate
      ? await supabase
          .from("bookings")
          .insert({ ...payload, establishment_id: establishmentId, organization_id: organizationId })
      : await supabase
          .from("bookings")
          .update(payload)
          .eq("id", booking?.id ?? "");
    setSaving(false);
    if (error) {
      console.error("[bookings] save error:", error);
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(isCreate ? "Réservation créée" : "Réservation mise à jour");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Détails de la réservation" : isCreate ? "Nouvelle réservation" : "Modifier la réservation"}
          </DialogTitle>
        </DialogHeader>

        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  disabled={readOnly}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <Field label="Heure">
                <Input
                  type="time"
                  value={form.time}
                  disabled={readOnly}
                  onChange={(e) => set("time", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Couverts">
                <Input
                  type="number"
                  min={1}
                  value={form.number_of_guests}
                  disabled={readOnly}
                  onChange={(e) => set("number_of_guests", Number(e.target.value))}
                />
              </Field>
              <Field label="Service">
                <Input
                  value={form.service_name}
                  disabled={readOnly}
                  onChange={(e) => set("service_name", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Statut">
              <Select value={form.status} onValueChange={(v) => set("status", v)} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <Input
                  value={form.customer_first_name}
                  disabled={readOnly}
                  onChange={(e) => set("customer_first_name", e.target.value)}
                />
              </Field>
              <Field label="Nom">
                <Input
                  value={form.customer_last_name}
                  disabled={readOnly}
                  onChange={(e) => set("customer_last_name", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input
                  type="email"
                  value={form.customer_email}
                  disabled={readOnly}
                  onChange={(e) => set("customer_email", e.target.value)}
                />
              </Field>
              <Field label="Téléphone">
                <Input
                  value={form.customer_phone}
                  disabled={readOnly}
                  onChange={(e) => set("customer_phone", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Demandes particulières">
              <Input
                value={form.special_requests}
                disabled={readOnly}
                onChange={(e) => set("special_requests", e.target.value)}
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving || !canSave}>
                {saving ? "Enregistrement…" : isCreate ? "Créer" : "Enregistrer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
