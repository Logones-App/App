"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CheckSquare, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Checklist {
  id: string;
  org_id: string;
  title: string;
  created_at: string;
  organizations: { name: string } | null;
  crm_onboarding_steps: { id: string; completed: boolean }[];
}

interface OrgOption {
  id: string;
  name: string;
}

function pct(steps: { completed: boolean }[]) {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.completed).length / steps.length) * 100);
}

export function OnboardingContent() {
  const params = useParams<{ locale: string }>();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createOrgId, setCreateOrgId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function loadChecklists() {
    const supabase = createClient();
    const [clRes, orgsRes] = await Promise.all([
      supabase
        .from("crm_onboarding_checklists")
        .select("*, organizations(name), crm_onboarding_steps(id, completed)")
        .eq("deleted", false)
        .order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name").eq("deleted", false).order("name"),
    ]);
    setChecklists((clRes.data ?? []) as unknown as Checklist[]);
    setOrgs((orgsRes.data ?? []) as unknown as OrgOption[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadChecklists();
  }, []);

  async function handleCreate() {
    if (!createOrgId || !createTitle.trim()) {
      toast.error("Organisation et titre requis");
      return;
    }
    setIsCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("crm_onboarding_checklists").insert({
        org_id: createOrgId,
        title: createTitle.trim(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Checklist créée");
      setShowCreate(false);
      setCreateOrgId("");
      setCreateTitle("");
      void loadChecklists();
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {checklists.length} checklist{checklists.length > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle checklist
        </Button>
      </div>

      {checklists.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <CheckSquare className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">Aucune checklist d&apos;onboarding</p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            Créer la première
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map((cl) => {
            const progress = pct(cl.crm_onboarding_steps);
            const done = cl.crm_onboarding_steps.filter((s) => s.completed).length;
            const total = cl.crm_onboarding_steps.length;
            return (
              <Card key={cl.id}>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <p className="text-sm font-medium">{cl.title}</p>
                    <p className="text-muted-foreground text-xs">{cl.organizations?.name ?? "—"}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">
                        {done}/{total} ({progress}%)
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/${params.locale}/commercial/onboarding/${cl.id}`}>
                    <Button variant="outline" size="sm" className="h-7 w-full text-xs">
                      Gérer les étapes
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={showCreate}
        onOpenChange={(v) => {
          if (!v) setShowCreate(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle checklist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Organisation</Label>
              <Select value={createOrgId} onValueChange={setCreateOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Onboarding client…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
