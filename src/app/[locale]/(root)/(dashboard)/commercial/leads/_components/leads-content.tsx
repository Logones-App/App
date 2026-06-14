"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { LayoutGrid, List, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

import { CreateLeadModal } from "./create-lead-modal";
import { LeadsKanban } from "./leads-kanban";
import { LeadsList } from "./leads-list";
import { type Lead } from "./leads-types";

export function LeadsContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [showCreate, setShowCreate] = useState(false);
  const params = useParams<{ locale: string }>();
  const router = useRouter();

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    setLeads((data ?? []) as unknown as Lead[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function handleLeadClick(id: string) {
    router.push(`/${params.locale}/commercial/leads/${id}`);
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau lead
        </Button>
      </div>

      {view === "list" ? (
        <LeadsList leads={leads} onLeadClick={handleLeadClick} />
      ) : (
        <LeadsKanban leads={leads} onLeadClick={handleLeadClick} onStatusChange={load} />
      )}

      <CreateLeadModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          void load();
        }}
      />
    </div>
  );
}
