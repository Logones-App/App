"use client";

import React from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_name: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  booking_id: string | null;
  organization_id: string | null;
}

interface EmailLogsProps {
  logs: EmailLog[];
}

export function EmailLogs({ logs }: EmailLogsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Envoyé
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Échec
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateName = (templateName: string) => {
    switch (templateName) {
      case "booking_confirmation":
        return "Confirmation de réservation";
      case "establishment_notification":
        return "Notification établissement";
      case "booking_reminder":
        return "Rappel de réservation";
      default:
        return templateName;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs d&apos;emails</CardTitle>
        <CardDescription>Historique des emails envoyés et leur statut</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">Aucun log d&apos;email trouvé</div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.recipient_email}</span>
                    {getStatusBadge(log.status)}
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sujet:</span>
                    <span className="text-sm">{log.subject}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Template:</span>
                    <span className="text-sm">{getTemplateName(log.template_name)}</span>
                  </div>

                  {log.booking_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Réservation:</span>
                      <span className="text-sm">{log.booking_id}</span>
                    </div>
                  )}

                  {log.sent_at && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Envoyé le:</span>
                      <span className="text-sm">
                        {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  )}

                  {log.error_message && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-600">Erreur:</span>
                      <span className="text-sm text-red-600">{log.error_message}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
