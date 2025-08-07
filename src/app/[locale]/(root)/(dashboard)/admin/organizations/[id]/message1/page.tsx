"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { useParams } from "next/navigation";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { ColumnDef } from "@tanstack/react-table";
import { Trash2, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export default function Message1Page() {
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
      .channel("messages_realtime_message1")
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
        content: `Message test créé à ${new Date().toLocaleTimeString()} - ${Date.now()} (Message1)`,
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

  // Définition des colonnes du tableau
  const columns: ColumnDef<Message>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("id")}</div>,
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "content",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contenu" />,
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.getValue("content")}>
          {row.getValue("content")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "organization_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Organisation" />,
      cell: ({ row }) => {
        const orgId = row.getValue("organization_id");
        return orgId ? (
          <Badge variant="outline" className="font-mono text-xs">
            {(orgId as string).slice(0, 8)}...
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "deleted",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
      cell: ({ row }) => (
        <Badge variant={row.getValue("deleted") ? "destructive" : "default"}>
          {row.getValue("deleted") ? "Supprimé" : "Actif"}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Créé le" />,
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at");
        return (
          <div className="text-sm">
            {createdAt && typeof createdAt === "string" ? new Date(createdAt).toLocaleString() : "-"}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Modifié le" />,
      cell: ({ row }) => {
        const updatedAt = row.getValue("updated_at");
        const createdAt = row.getValue("created_at");
        return updatedAt && typeof updatedAt === "string" && updatedAt !== createdAt ? (
          <div className="text-sm">{new Date(updatedAt).toLocaleString()}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const message = row.original;
        return (
          <div className="flex justify-end">
            {!message.deleted && (
              <Button onClick={() => deleteMessage(message.id)} variant="destructive" size="sm" className="h-8 w-8 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Instance du tableau
  const table = useDataTableInstance({
    data: messages,
    columns,
    enableRowSelection: false,
    defaultPageSize: 10,
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Messages (Message1)</CardTitle>
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
            <CardTitle>Messages Realtime (Message1) - Tableau</CardTitle>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "🟢 Connecté" : "🔴 Déconnecté"}
              </Badge>
              <Button onClick={addTestMessage} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un message
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">{error}</div>}
          <div className="rounded-md border">
            <DataTable table={table} columns={columns} />
          </div>
          {messages.length === 0 && <div className="py-8 text-center text-gray-500">Aucun message trouvé</div>}
        </CardContent>
      </Card>
    </div>
  );
}
