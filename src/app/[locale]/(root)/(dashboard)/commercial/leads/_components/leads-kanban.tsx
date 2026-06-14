"use client";

import { useState } from "react";

import { Building2, MapPin, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

import { type Lead, type LeadStatus, LEAD_STATUSES, getStatusConfig } from "./leads-types";

interface Props {
  leads: Lead[];
  onLeadClick: (id: string) => void;
  onStatusChange: () => void;
}

const KANBAN_STAGES = LEAD_STATUSES.filter((s) => s.value !== "won" && s.value !== "lost");

export function LeadsKanban({ leads, onLeadClick, onStatusChange }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStatus | null>(null);

  function getLeadsForStage(status: LeadStatus) {
    return leads.filter((l) => l.status === status);
  }

  async function handleDrop(status: LeadStatus) {
    if (!draggingId || !overStage) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || lead.status === status) {
      setDraggingId(null);
      setOverStage(null);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status, stage_changed_at: new Date().toISOString() })
      .eq("id", draggingId);

    setDraggingId(null);
    setOverStage(null);

    if (error) {
      toast.error("Impossible de déplacer le lead");
    } else {
      onStatusChange();
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_STAGES.map((stage) => {
        const stageLeads = getLeadsForStage(stage.value);
        const isOver = overStage === stage.value;

        return (
          <div
            key={stage.value}
            className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg p-2 transition-colors ${
              isOver ? "bg-primary/5 ring-primary/30 ring-2" : "bg-muted/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage.value);
            }}
            onDragLeave={() => setOverStage(null)}
            onDrop={() => void handleDrop(stage.value)}
          >
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-sm font-medium">{stage.label}</span>
              <Badge variant="outline" className="text-xs">
                {stageLeads.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              {stageLeads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead.id)}
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStage(null);
                  }}
                  isDragging={draggingId === lead.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Colonnes Won / Lost séparées */}
      {(["won", "lost"] as LeadStatus[]).map((status) => {
        const stageLeads = getLeadsForStage(status);
        const cfg = getStatusConfig(status);
        return (
          <div
            key={status}
            className={`flex w-52 shrink-0 flex-col gap-2 rounded-lg p-2 ${
              overStage === status ? "bg-primary/5 ring-primary/30 ring-2" : "bg-muted/20"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(status);
            }}
            onDragLeave={() => setOverStage(null)}
            onDrop={() => void handleDrop(status)}
          >
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-sm font-medium">{cfg.label}</span>
              <Badge variant="outline" className="text-xs">
                {stageLeads.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {stageLeads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead.id)}
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStage(null);
                  }}
                  isDragging={draggingId === lead.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function KanbanCard({ lead, onClick, onDragStart, onDragEnd, isDragging }: KanbanCardProps) {
  return (
    <Card
      draggable
      className={`cursor-pointer transition-opacity ${isDragging ? "opacity-40" : "hover:border-primary/50"}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <p className="truncate text-sm font-medium">{lead.company_name}</p>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-0.5 p-3 pt-0 text-xs">
        {lead.contact_name && (
          <p className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0" />
            {lead.contact_name}
          </p>
        )}
        {lead.city && (
          <p className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {lead.city}
          </p>
        )}
        {lead.sector && (
          <p className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            {lead.sector}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
