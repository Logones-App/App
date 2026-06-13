"use client";

import React, { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, HeadphonesIcon, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

type TicketWithRelations = Tables<"support_tickets"> & {
  establishments: Pick<Tables<"establishments">, "id" | "name"> | null;
  organizations: Pick<Tables<"organizations">, "id" | "name"> | null;
};

type SupportMessage = Tables<"support_messages">;

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

const STATUS_VARIANTS: Record<TicketStatus, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

function StatusBadge({ status }: { status: string }) {
  const s = status as TicketStatus;
  // eslint-disable-next-line security/detect-object-injection
  return <Badge variant={STATUS_VARIANTS[s] ?? "outline"}>{STATUS_LABELS[s] ?? status}</Badge>;
}

function TicketItem({
  ticket,
  isSelected,
  onClick,
}: {
  ticket: TicketWithRelations;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium">{ticket.subject}</p>
        <StatusBadge status={ticket.status ?? "open"} />
      </div>
      <p className="text-muted-foreground mt-1 truncate text-xs">
        {ticket.customer_name} · {ticket.customer_email}
      </p>
      {(ticket.establishments ?? ticket.organizations) && (
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
          <Building2 className="h-3 w-3 shrink-0" />
          {ticket.establishments?.name ?? ticket.organizations?.name}
        </p>
      )}
      <p className="text-muted-foreground mt-0.5 text-xs">
        {ticket.created_at ? format(new Date(ticket.created_at), "dd MMM yyyy HH:mm", { locale: fr }) : "—"}
      </p>
    </button>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [isSending, setIsSending] = useState(false);

  async function loadTickets() {
    const supabase = createClient();
    let query = supabase
      .from("support_tickets")
      .select("*, establishments(id, name), organizations(id, name)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setTickets((data ?? []) as TicketWithRelations[]);
  }

  async function loadMessages(ticketId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  useEffect(() => {
    void loadTickets();
  }, [statusFilter]);

  async function handleSelectTicket(ticket: TicketWithRelations) {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedTicket) return;
    const supabase = createClient();
    await supabase.from("support_tickets").update({ status }).eq("id", selectedTicket.id);
    setSelectedTicket((t) => (t ? { ...t, status } : t));
    void loadTickets();
  }

  async function handleSendReply() {
    if (!selectedTicket || !reply.trim()) return;
    setIsSending(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("support_messages")
      .insert({ ticket_id: selectedTicket.id, content: reply.trim(), role: "agent", is_ai_generated: false })
      .select()
      .single();
    if (data) setMessages((prev) => [...prev, data]);
    setReply("");
    setIsSending(false);
  }

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HeadphonesIcon className="h-6 w-6" />
            Support
          </h1>
          <p className="text-muted-foreground">Gérez les tickets de support utilisateurs</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-destructive font-medium">
            {openCount} ouvert{openCount !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{inProgressCount} en cours</span>
        </div>
      </div>

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Liste tickets */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="closed">Fermés</SelectItem>
            </SelectContent>
          </Select>

          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tickets</CardTitle>
              <CardDescription>
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-22rem)] px-4 pb-4">
                <div className="space-y-2 pt-1">
                  {tickets.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">Aucun ticket</p>
                  ) : (
                    tickets.map((t) => (
                      <TicketItem
                        key={t.id}
                        ticket={t}
                        isSelected={selectedTicket?.id === t.id}
                        onClick={() => void handleSelectTicket(t)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Détail ticket */}
        <div className="lg:col-span-2">
          {!selectedTicket ? (
            <Card className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10" />
                <p className="text-sm">Sélectionnez un ticket pour voir la conversation</p>
              </div>
            </Card>
          ) : (
            <Card className="flex h-full flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
                    <CardDescription className="space-y-0.5">
                      <span>
                        {selectedTicket.customer_name} · {selectedTicket.customer_email}
                      </span>
                      {(selectedTicket.establishments ?? selectedTicket.organizations) && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedTicket.establishments?.name
                            ? `${selectedTicket.establishments.name}${selectedTicket.organizations ? ` — ${selectedTicket.organizations.name}` : ""}`
                            : selectedTicket.organizations?.name}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Select value={selectedTicket.status ?? "open"} onValueChange={(v) => void handleUpdateStatus(v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Ouvert</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="closed">Fermé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-0 px-6 pb-4">
                <ScrollArea className="flex-1 rounded-lg border p-3">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : m.role === "agent"
                                ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                                : "bg-muted"
                          }`}
                        >
                          <p>{m.content}</p>
                          {m.is_ai_generated && <p className="mt-1 text-xs opacity-60">IA</p>}
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-muted-foreground py-4 text-center text-sm">Aucun message</p>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Répondre au client..."
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="resize-none text-sm"
                  />
                  <Button
                    onClick={() => void handleSendReply()}
                    disabled={isSending || !reply.trim()}
                    className="self-end"
                  >
                    Envoyer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
