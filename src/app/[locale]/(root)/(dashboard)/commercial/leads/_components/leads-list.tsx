"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, ChevronRight, MapPin, Target, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { type Lead, getStatusConfig } from "./leads-types";

interface Props {
  leads: Lead[];
  onLeadClick: (id: string) => void;
}

export function LeadsList({ leads, onLeadClick }: Props) {
  if (leads.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <Target className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Aucun lead pour l&apos;instant</p>
        <p className="text-muted-foreground text-xs">Créez votre premier lead avec le bouton ci-dessus</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => {
        const status = getStatusConfig(lead.status);
        return (
          <Card
            key={lead.id}
            className="hover:border-primary/50 cursor-pointer transition-colors"
            onClick={() => onLeadClick(lead.id)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{lead.company_name}</span>
                  <Badge className={`shrink-0 border-0 text-xs ${status.color}`}>{status.label}</Badge>
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  {lead.contact_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {lead.contact_name}
                    </span>
                  )}
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
                </div>
              </div>
              <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                <span>{format(new Date(lead.created_at), "d MMM yyyy", { locale: fr })}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
