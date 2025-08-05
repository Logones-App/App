"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { useParams } from "next/navigation";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export default function MessagesPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Charger les messages initiaux
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      setMessages(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des messages");
    } finally {
      setLoading(false);
    }
  }, [supabase, organizationId]);

  // Initialiser le realtime
  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMsg = payload.new as Message | undefined;
          const oldMsg = payload.old as Message | undefined;
          if (newMsg && newMsg.organization_id !== organizationId) return;
          if (payload.eventType === "INSERT") {
            if (newMsg) setMessages((prev) => [newMsg, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            if (newMsg) setMessages((prev) => prev.map((msg) => (msg.id === newMsg.id ? newMsg : msg)));
          } else if (payload.eventType === "DELETE") {
            if (oldMsg) setMessages((prev) => prev.filter((msg) => msg.id !== oldMsg.id));
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadMessages, supabase, organizationId]);

  // Fonction pour ajouter un message de test
  const addTestMessage = async () => {
    try {
      const testMessage = {
        content: `Message test créé à ${new Date().toLocaleTimeString()} - ${Date.now()}`,
        organization_id: organizationId,
      };
      const { error } = await supabase.from("messages").insert(testMessage);
      if (error) setError(error.message);
    } catch (err) {
      setError("Erreur lors de l'ajout du message");
    }
  };

  // Fonction pour supprimer un message
  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) setError(error.message);
    } catch (err) {
      setError("Erreur lors de la suppression du message");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">Chargement...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Messages Realtime</CardTitle>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "🟢 Connecté" : "🔴 Déconnecté"}
              </Badge>
              <Button onClick={addTestMessage} size="sm">
                Ajouter un message
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">{error}</div>}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500">Aucun message trouvé</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="rounded-lg border p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={message.deleted ? "destructive" : "default"}>
                          {message.deleted ? "Supprimé" : "Actif"}
                        </Badge>
                        {message.organization_id && (
                          <Badge variant="outline">Org: {message.organization_id.slice(0, 8)}...</Badge>
                        )}
                      </div>
                      <p className="mb-2 text-gray-800">{message.content}</p>
                      <div className="text-sm text-gray-500">
                        Créé le: {new Date(message.created_at).toLocaleString()}
                        {message.updated_at && message.updated_at !== message.created_at && (
                          <span className="ml-4">Modifié le: {new Date(message.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {!message.deleted && (
                      <Button onClick={() => deleteMessage(message.id)} variant="destructive" size="sm">
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
