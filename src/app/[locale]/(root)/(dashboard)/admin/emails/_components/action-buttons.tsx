"use client";

import React from "react";

import { Send, Trash2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  sendReminders: () => void;
  sendingReminders: boolean;
  cleanOldLogs: () => void;
  cleaningLogs: boolean;
}

export function ActionButtons({ sendReminders, sendingReminders, cleanOldLogs, cleaningLogs }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button onClick={sendReminders} disabled={sendingReminders} variant="outline">
        {sendingReminders ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Envoyer les rappels
          </>
        )}
      </Button>
      <Button onClick={cleanOldLogs} disabled={cleaningLogs} variant="outline">
        {cleaningLogs ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Nettoyage...
          </>
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Nettoyer les logs
          </>
        )}
      </Button>
    </div>
  );
}
