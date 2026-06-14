"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Option {
  id: string;
  name: string;
}

type Mode = "lead" | "org";

export function CreateQuoteModal({ open, onClose }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const [mode, setMode] = useState<Mode>("lead");
  const [leads, setLeads] = useState<Option[]>([]);
  const [orgs, setOrgs] = useState<Option[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setIsLoading(true);
    const supabase = createClient();
    void Promise.all([
      supabase
        .from("leads")
        .select("id, company_name")
        .eq("deleted", false)
        .in("status", ["new", "contacted", "demo_scheduled", "demo_done", "proposal", "negotiation"])
        .order("company_name"),
      supabase.from("organizations").select("id, name").eq("deleted", false).order("name"),
    ]).then(([leadsRes, orgsRes]) => {
      setLeads((leadsRes.data ?? []).map((l) => ({ id: l.id, name: l.company_name })));
      setOrgs((orgsRes.data ?? []).map((o) => ({ id: o.id, name: o.name })));
      setIsLoading(false);
    });
  }, [open]);

  async function handleCreate() {
    if (!selectedId) {
      toast.error("Sélectionnez un lead ou une organisation");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("crm_quotes")
        .insert({
          lead_id: mode === "lead" ? selectedId : null,
          org_id: mode === "org" ? selectedId : null,
          status: "draft",
          vat_rate: 20,
          total_ht: 0,
          total_tva: 0,
          total_ttc: 0,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Devis créé");
      onClose();
      router.push(`/${params.locale}/commercial/devis/${data.id}`);
    } catch {
      toast.error("Erreur lors de la création du devis");
    } finally {
      setIsSubmitting(false);
    }
  }

  const options = mode === "lead" ? leads : orgs;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau devis</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              setMode(v as Mode);
              setSelectedId("");
            }}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="lead" id="q-lead" />
              <Label htmlFor="q-lead" className="cursor-pointer font-normal">
                Pour un lead
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="org" id="q-org" />
              <Label htmlFor="q-org" className="cursor-pointer font-normal">
                Pour un client
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-1.5">
            <Label>{mode === "lead" ? "Lead" : "Organisation"}</Label>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting || !selectedId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le devis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
