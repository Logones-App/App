"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { type OrgOption } from "./create-user-modal";
import { type UserRow } from "./users-table";

interface Props {
  user: UserRow | null;
  organizations: OrgOption[];
  onClose: () => void;
  onSuccess: () => void;
}

type RoleType = "commercial" | "org_admin" | "manager";

const ROLES: { value: RoleType; label: string }[] = [
  { value: "commercial", label: "Commercial" },
  { value: "org_admin", label: "Org Admin" },
  { value: "manager", label: "Manager" },
];

export function ChangeRoleModal({ user, organizations, onClose, onSuccess }: Props) {
  const [role, setRole] = useState<RoleType>("org_admin");
  const [orgId, setOrgId] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = !!user;
  const selectedOrg = organizations.find((o) => o.id === orgId);
  const targetOrg = user?.organizations[0];
  const isFromEmployee = user?.role === "employee";

  async function handleSubmit() {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          organizationId: orgId !== "" ? orgId : (targetOrg?.id ?? null),
          establishmentId: role === "manager" ? establishmentId || null : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      onClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Changer le rôle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">
            Utilisateur : <span className="text-foreground font-medium">{user?.email}</span>
          </p>

          {isFromEmployee && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Cet employé sera délié de sa fiche et perdra l&apos;accès planning. Assignez-lui une organisation après la
              confirmation.
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nouveau rôle</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as RoleType);
                setOrgId("");
                setEstablishmentId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Pour passer un utilisateur en Employé, supprimez ce compte et recréez-le via &quot;Nouvel
              utilisateur&quot;.
            </p>
          </div>

          {(role === "org_admin" || role === "manager") && !isFromEmployee && (
            <div className="space-y-1.5">
              <Label>Organisation à mettre à jour</Label>
              <Select
                value={orgId}
                onValueChange={(v) => {
                  setOrgId(v);
                  setEstablishmentId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={targetOrg?.name ?? "Sélectionner"} />
                </SelectTrigger>
                <SelectContent>
                  {user?.organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                  {organizations
                    .filter((o) => !user?.organizations.some((uo) => uo.id === o.id))
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "manager" && selectedOrg && !isFromEmployee && (
            <div className="space-y-1.5">
              <Label>Établissement</Label>
              <Select value={establishmentId} onValueChange={setEstablishmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un établissement" />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrg.establishments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isFromEmployee && (
            <div className="space-y-1.5">
              <Label>Organisation à assigner</Label>
              <Select
                value={orgId}
                onValueChange={(v) => {
                  setOrgId(v);
                  setEstablishmentId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "manager" && isFromEmployee && selectedOrg && (
            <div className="space-y-1.5">
              <Label>Établissement</Label>
              <Select value={establishmentId} onValueChange={setEstablishmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un établissement" />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrg.establishments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
