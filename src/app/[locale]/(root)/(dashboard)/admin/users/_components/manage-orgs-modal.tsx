"use client";

import { useState } from "react";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { OrgOption } from "./create-user-modal";
import type { UserRow } from "./users-table";

interface Props {
  user: UserRow | null;
  organizations: OrgOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageOrgsModal({ user, organizations, onClose, onSuccess }: Props) {
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!user) return null;

  const assignedIds = new Set(user.organizations.map((o) => o.id));
  const unassigned = organizations.filter((o) => !assignedIds.has(o.id));

  // org_admin et manager : une seule org autorisée
  const canAddOrg = user.role === "commercial" || user.organizations.length === 0;

  async function removeOrg(orgId: string) {
    setLoadingId(`remove-${orgId}`);
    try {
      const res = await fetch(`/api/admin/users/${user!.id}/orgs?orgId=${orgId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        toast.error(d.error ?? "Erreur lors de la suppression");
        return;
      }
      onSuccess();
    } finally {
      setLoadingId(null);
    }
  }

  async function addOrgs() {
    if (pendingAdd.size === 0) return;
    setLoadingId("add");
    try {
      const results = await Promise.all(
        Array.from(pendingAdd).map((orgId) =>
          fetch(`/api/admin/users/${user!.id}/orgs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizationId: orgId, role: user!.role }),
          }),
        ),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast.error(`${failed.length} organisation(s) n'ont pas pu être ajoutées`);
      }
      setPendingAdd(new Set());
      onSuccess();
    } finally {
      setLoadingId(null);
    }
  }

  function togglePending(id: string) {
    setPendingAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog
      open={!!user}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Organisations de <span className="font-semibold">{user.name || user.email}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Organisations assignées ({user.organizations.length})</p>
            {user.organizations.length === 0 ? (
              <p className="text-muted-foreground text-xs">Aucune organisation assignée</p>
            ) : (
              <div className="space-y-1.5">
                {user.organizations.map((org) => (
                  <div key={org.id} className="bg-muted flex items-center justify-between rounded-md px-3 py-1.5">
                    <span className="text-sm">{org.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-7 w-7"
                      disabled={loadingId === `remove-${org.id}`}
                      onClick={() => removeOrg(org.id)}
                    >
                      {loadingId === `remove-${org.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {unassigned.length > 0 && canAddOrg && (
            <>
              <Separator />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Ajouter des organisations
                    {pendingAdd.size > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {pendingAdd.size}
                      </Badge>
                    )}
                  </p>
                  {pendingAdd.size > 0 && (
                    <Button size="sm" disabled={loadingId === "add"} onClick={addOrgs}>
                      {loadingId === "add" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Confirmer
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-44 rounded-md border p-2">
                  <div className="space-y-2">
                    {unassigned.map((org) => (
                      <div key={org.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`add-org-${org.id}`}
                          checked={pendingAdd.has(org.id)}
                          onCheckedChange={() => togglePending(org.id)}
                        />
                        <Label htmlFor={`add-org-${org.id}`} className="cursor-pointer text-sm font-normal">
                          {org.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
