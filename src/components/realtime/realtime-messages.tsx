"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtime } from "@/hooks/use-realtime";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function RealtimeMessages() {
  const { messages, clearMessages } = useRealtime();
  const [isVisible, setIsVisible] = useState(false);

  // Afficher automatiquement quand il y a de nouveaux messages
  useEffect(() => {
    if (messages.length > 0) {
      setIsVisible(true);
    }
  }, [messages.length]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleClear = () => {
    clearMessages();
    setIsVisible(false);
  };

  if (!isVisible || messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            Messages temps réel ({messages.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
              Effacer
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id} className="bg-muted/50 rounded-lg border p-3">
                  <div className="mb-1 flex items-start justify-between">
                    <span className="text-sm font-medium">{message.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(message.timestamp), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-2 text-xs">{message.message}</p>
                  {message.data && (
                    <div className="text-muted-foreground text-xs">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(message.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
