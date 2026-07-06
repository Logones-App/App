"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Tablet } from "lucide-react";
import { toast } from "sonner";

import { CredentialsDisplay } from "@/app/[locale]/(root)/(dashboard)/admin/organizations/[id]/establishments/_components/credentials-display";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TabletCreds = { email: string; password: string };
type TabletInfo = { email: string | null; password: string | null };

async function fetchTabletCredentials(establishmentId: string): Promise<TabletInfo> {
  const res = await fetch(`/api/establishments/${establishmentId}/tablet-credentials`);
  const data = (await res.json()) as TabletInfo & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data;
}

async function resetTabletPassword(establishmentId: string): Promise<TabletCreds> {
  const res = await fetch(`/api/establishments/${establishmentId}/tablet-credentials`, { method: "POST" });
  const data = (await res.json()) as TabletCreds & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data;
}

export function TabletAccessCard({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newCreds, setNewCreds] = useState<TabletCreds | null>(null);

  const infoQuery = useQuery({
    queryKey: ["tablet-credentials", establishmentId],
    queryFn: () => fetchTabletCredentials(establishmentId),
    enabled: !!establishmentId,
  });

  const resetMutation = useMutation({
    mutationFn: () => resetTabletPassword(establishmentId),
    onSuccess: (data) => {
      setConfirmOpen(false);
      setNewCreds(data);
      void queryClient.invalidateQueries({ queryKey: ["tablet-credentials", establishmentId] });
      toast.success("Mot de passe tablette réinitialisé");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de la réinitialisation"),
  });

  const email = infoQuery.data?.email ?? null;
  const password = infoQuery.data?.password ?? null;

  const copy = (text: string, setter: (v: boolean) => void) => {
    void navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tablet className="size-4" aria-hidden />
          Accès tablette
        </CardTitle>
        <CardDescription>
          Identifiant de connexion partagé par tous les appareils (POS) de cet établissement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {infoQuery.isLoading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </p>
        ) : email ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground min-w-20 text-xs font-medium">Identifiant</span>
              <span className="flex-1 font-mono text-xs break-all">{email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copy(email, setCopiedEmail)}
                aria-label="Copier l'identifiant"
              >
                {copiedEmail ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground min-w-20 text-xs font-medium">Mot de passe</span>
              <span className="flex-1 font-mono text-xs break-all">
                {password ? (revealed ? password : "•".repeat(password.length)) : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!password}
                onClick={() => setRevealed((v) => !v)}
                aria-label={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!password}
                onClick={() => password && copy(password, setCopiedPwd)}
                aria-label="Copier le mot de passe"
              >
                {copiedPwd ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {!password && (
              <p className="text-muted-foreground text-xs">
                Mot de passe non enregistré (compte antérieur) — réinitialisez-le pour le rendre visible.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun compte tablette trouvé pour cet établissement.</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!email || resetMutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          <KeyRound className="mr-2 size-4" />
          Réinitialiser le mot de passe
        </Button>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe tablette ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Tous les appareils</strong> de cet établissement connectés avec ce compte seront déconnectés et
              devront se reconnecter avec le nouveau mot de passe. Il restera visible ici.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Annuler</AlertDialogCancel>
            <Button type="button" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? "Réinitialisation…" : "Réinitialiser"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={newCreds !== null}
        onOpenChange={(o) => {
          if (!o) setNewCreds(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveaux identifiants tablette</DialogTitle>
          </DialogHeader>
          {newCreds && (
            <CredentialsDisplay
              email={newCreds.email}
              password={newCreds.password}
              heading="Mot de passe réinitialisé"
            />
          )}
          <DialogFooter>
            <Button type="button" className="w-full" onClick={() => setNewCreds(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
