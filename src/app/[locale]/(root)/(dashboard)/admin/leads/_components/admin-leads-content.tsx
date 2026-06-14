"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, ChevronRight, Loader2, MapPin, Target, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

import { type Lead, getStatusConfig } from "../../../commercial/leads/_components/leads-types";

interface CommercialUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

type Filter = "all" | "unassigned" | "won" | "lost";

export function AdminLeadsContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [commercials, setCommercials] = useState<CommercialUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [assignModal, setAssignModal] = useState<Lead | null>(null);
  const [selectedCommercial, setSelectedCommercial] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const params = useParams<{ locale: string }>();
  const router = useRouter();

  async function loadLeads() {
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    setLeads((data ?? []) as unknown as Lead[]);
  }

  async function loadCommercials() {
    const res = await fetch("/api/admin/users?roles=commercial,account_manager");
    if (res.ok) {
      const data = (await res.json()) as { users: CommercialUser[] };
      setCommercials(data.users ?? []);
    }
  }

  async function load() {
    await Promise.all([loadLeads(), loadCommercials()]);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAssign() {
    if (!assignModal || !selectedCommercial) return;
    setIsAssigning(true);
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ assigned_to: selectedCommercial }).eq("id", assignModal.id);

    setIsAssigning(false);
    if (error) {
      toast.error("Impossible d'assigner le lead");
    } else {
      toast.success("Lead assigné");
      setAssignModal(null);
      setSelectedCommercial("");
      void loadLeads();
    }
  }

  const filtered = leads.filter((l) => {
    if (filter === "unassigned") return !l.assigned_to;
    if (filter === "won") return l.status === "won";
    if (filter === "lost") return l.status === "lost";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const unassignedCount = leads.filter((l) => !l.assigned_to).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">Tous ({leads.length})</TabsTrigger>
            <TabsTrigger value="unassigned" className="gap-1.5">
              {unassignedCount > 0 && (
                <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {unassignedCount}
                </span>
              )}
              File d&apos;attente
            </TabsTrigger>
            <TabsTrigger value="won">Gagnés</TabsTrigger>
            <TabsTrigger value="lost">Perdus</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <Target className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {filter === "unassigned" ? "Aucun lead en attente" : "Aucun lead"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((lead) => {
            const status = getStatusConfig(lead.status);
            const commercial = commercials.find((c) => c.id === lead.assigned_to);
            return (
              <Card key={lead.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => router.push(`/${params.locale}/commercial/leads/${lead.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{lead.company_name}</span>
                      <Badge className={`shrink-0 border-0 text-xs ${status.color}`}>{status.label}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      {lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.city}
                        </span>
                      )}
                      {lead.sector && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.sector}
                        </span>
                      )}
                      {commercial ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <UserCheck className="h-3 w-3" />
                          {commercial.full_name ?? commercial.email}
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <UserX className="h-3 w-3" />
                          Non assigné
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(lead.created_at), "d MMM", { locale: fr })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setAssignModal(lead);
                        setSelectedCommercial(lead.assigned_to ?? "");
                      }}
                    >
                      {lead.assigned_to ? "Réassigner" : "Assigner"}
                    </Button>
                    <ChevronRight
                      className="text-muted-foreground h-4 w-4 cursor-pointer"
                      onClick={() => router.push(`/${params.locale}/commercial/leads/${lead.id}`)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal d'assignation */}
      <Dialog
        open={!!assignModal}
        onOpenChange={(v) => {
          if (!v) {
            setAssignModal(null);
            setSelectedCommercial("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assigner le lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm">
              Lead : <span className="text-foreground font-medium">{assignModal?.company_name}</span>
            </p>
            <div className="space-y-1.5">
              <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un commercial" />
                </SelectTrigger>
                <SelectContent>
                  {commercials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span>{c.full_name ?? c.email}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        ({c.role.replace("_", " ")})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignModal(null);
                setSelectedCommercial("");
              }}
              disabled={isAssigning}
            >
              Annuler
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedCommercial}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
