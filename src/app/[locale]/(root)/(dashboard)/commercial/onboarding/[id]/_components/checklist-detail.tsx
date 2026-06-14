"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, CheckCircle2, Circle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface Step {
  id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
}

interface Checklist {
  id: string;
  title: string;
  org_id: string;
  organizations: { name: string } | null;
}

interface Props {
  id: string;
  locale: string;
}

export function ChecklistDetail({ id, locale }: Props) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function loadData() {
    const supabase = createClient();
    const [clRes, stepsRes] = await Promise.all([
      supabase
        .from("crm_onboarding_checklists")
        .select("*, organizations(name)")
        .eq("id", id)
        .eq("deleted", false)
        .single(),
      supabase.from("crm_onboarding_steps").select("*").eq("checklist_id", id).order("position"),
    ]);
    const cl = clRes.data as unknown as Checklist | null;
    if (!cl) {
      router.push(`/${locale}/commercial/onboarding`);
      return;
    }
    setChecklist(cl);
    setSteps((stepsRes.data ?? []) as unknown as Step[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(step: Step) {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("crm_onboarding_steps")
      .update({
        completed: !step.completed,
        completed_at: step.completed ? null : now,
      })
      .eq("id", step.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, completed: !step.completed, completed_at: step.completed ? null : now } : s,
      ),
    );
  }

  async function handleAddStep() {
    if (!newLabel.trim()) {
      toast.error("Libellé requis");
      return;
    }
    setIsAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("crm_onboarding_steps").insert({
        checklist_id: id,
        label: newLabel.trim(),
        completed: false,
        position: steps.length,
      });
      if (error) throw error;
      setNewLabel("");
      void loadData();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!checklist) return null;

  const done = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => router.push(`/${locale}/commercial/onboarding`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{checklist.title}</h1>
          <p className="text-muted-foreground text-sm">{checklist.organizations?.name ?? "—"}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-medium">
            {done}/{steps.length} étapes ({progress}%)
          </span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Étapes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {steps.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Aucune étape — ajoutez-en ci-dessous</p>
          ) : (
            steps.map((step) => (
              <button
                key={step.id}
                onClick={() => void handleToggle(step)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" />
                )}
                <span className={`text-sm ${step.completed ? "text-muted-foreground line-through" : ""}`}>
                  {step.label}
                </span>
              </button>
            ))
          )}

          <div className="flex gap-2 border-t pt-3">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddStep();
              }}
              placeholder="Nouvelle étape…"
              className="text-sm"
            />
            <Button size="sm" onClick={() => void handleAddStep()} disabled={isAdding}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
