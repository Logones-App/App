"use client";

import { useState } from "react";

import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  organizationId: string;
  onSuccess?: () => void;
}

export function OrgAdminCard({ organizationId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    if (isSubmitting) return;
    setEmail("");
    setName("");
    setOpen(false);
  }

  async function handleSubmit() {
    if (!email.trim()) {
      toast.error("L'email est requis");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/org-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = (await res.json()) as { userId?: string; emailSent?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(data.emailSent ? "Compte admin créé — invitation envoyée" : "Compte admin créé");
      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="bg-muted/30 border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="text-muted-foreground h-4 w-4" />
            Accès SaaS (org_admin)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <p className="text-muted-foreground mb-3 text-xs">
            Crée un compte client avec accès au dashboard SaaS pour cette organisation.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-3.5 w-3.5" />
            Créer compte admin
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer un compte admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responsable@entreprise.fr"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom Nom"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Un email d&apos;invitation sera envoyé pour définir le mot de passe.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !email.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
