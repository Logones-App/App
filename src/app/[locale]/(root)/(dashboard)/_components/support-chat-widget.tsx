"use client";

import React, { useRef, useEffect, useState } from "react";

import { MessageCircle, X, Send, UserRound, ChevronDown, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Establishment {
  id: string;
  name: string;
}

interface UserContext {
  name: string;
  email: string;
  organizationId: string | null;
  establishments: Establishment[];
}

interface EscalationForm {
  name: string;
  email: string;
  subject: string;
  establishmentId: string;
}

interface ChatResponse {
  answer: string;
  confidence: number;
  needsHuman: boolean;
}

interface TicketResponse {
  ticketId: string;
}

const WELCOME = "Bonjour ! Comment puis-je vous aider ?";
const DEFAULT_ESCALATION: EscalationForm = { name: "", email: "", subject: "", establishmentId: "" };

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function EscalationPrompt({ onEscalate, onDismiss }: { onEscalate: () => void; onDismiss: () => void }) {
  return (
    <div className="bg-muted/50 mx-4 mb-3 rounded-lg p-3 text-sm">
      <p className="mb-2 font-medium">Je n&apos;ai pas pu répondre précisément à votre question.</p>
      <p className="text-muted-foreground mb-3 text-xs">Voulez-vous contacter un agent humain ?</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onEscalate} className="flex-1">
          <UserRound className="mr-1.5 h-3.5 w-3.5" />
          Contacter le support
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Non merci
        </Button>
      </div>
    </div>
  );
}

function EscalationFormView({
  form,
  onChange,
  onSubmit,
  isLoading,
  establishments,
}: {
  form: EscalationForm;
  onChange: (f: EscalationForm) => void;
  onSubmit: () => void;
  isLoading: boolean;
  establishments: Establishment[];
}) {
  return (
    <div className="space-y-3 px-4 pb-4">
      <p className="text-sm font-medium">Créer un ticket de support</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Nom</Label>
        <Input
          placeholder="Votre nom"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          placeholder="votre@email.com"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>
      {establishments.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Établissement</Label>
          <Select value={form.establishmentId} onValueChange={(v) => onChange({ ...form, establishmentId: v })}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {establishments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Sujet</Label>
        <Textarea
          placeholder="Décrivez votre problème..."
          rows={2}
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
        />
      </div>
      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={isLoading || !form.name.trim() || !form.email.trim() || !form.subject.trim()}
      >
        {isLoading ? "Envoi..." : "Envoyer"}
      </Button>
    </div>
  );
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [{ role: "assistant", content: WELCOME }];
    try {
      const saved = localStorage.getItem("support-chat-messages");
      return saved ? (JSON.parse(saved) as Message[]) : [{ role: "assistant", content: WELCOME }];
    } catch {
      return [{ role: "assistant", content: WELCOME }];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsHuman, setNeedsHuman] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationForm, setEscalationForm] = useState<EscalationForm>(DEFAULT_ESCALATION);
  const [ticketCreated, setTicketCreated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("support-chat-ticket-created") === "true";
  });
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUserContext() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const name =
        (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? "";
      const email = user.email ?? "";

      const { data: orgData } = await supabase
        .from("users_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .limit(1)
        .maybeSingle();

      const organizationId = orgData?.organization_id ?? null;

      let establishments: Establishment[] = [];
      if (organizationId) {
        const { data: estData } = await supabase
          .from("establishments")
          .select("id, name")
          .eq("organization_id", organizationId)
          .eq("deleted", false)
          .order("name");
        establishments = (estData ?? []) as Establishment[];
      }

      setUserContext({ name, email, organizationId, establishments });
      setEscalationForm((f) => ({
        ...f,
        name: f.name || name,
        email: f.email || email,
        establishmentId: establishments.length === 1 ? establishments[0].id : f.establishmentId,
      }));
    }
    void loadUserContext();
  }, []);

  useEffect(() => {
    localStorage.setItem("support-chat-messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("support-chat-ticket-created", String(ticketCreated));
  }, [ticketCreated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, needsHuman, showEscalation]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = messages.filter((m) => m.content !== WELCOME);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setNeedsHuman(false);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await res.json()) as ChatResponse;
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      if (data.needsHuman) setNeedsHuman(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Une erreur est survenue. Réessayez." }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTicket() {
    setIsLoading(true);
    try {
      const establishmentId =
        escalationForm.establishmentId ||
        (userContext?.establishments.length === 1 ? userContext.establishments[0].id : undefined);

      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: escalationForm.name,
          customerEmail: escalationForm.email,
          subject: escalationForm.subject,
          organizationId: userContext?.organizationId ?? undefined,
          establishmentId,
          conversationHistory: messages.filter((m) => m.content !== WELCOME),
        }),
      });
      const data = (await res.json()) as TicketResponse;
      if (data.ticketId) {
        setTicketCreated(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Votre ticket a bien été créé. Un agent vous contactera à l'adresse ${escalationForm.email}.`,
          },
        ]);
        setShowEscalation(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleReset() {
    setMessages([{ role: "assistant", content: WELCOME }]);
    setTicketCreated(false);
    setNeedsHuman(false);
    setShowEscalation(false);
    setEscalationForm({
      name: userContext?.name ?? "",
      email: userContext?.email ?? "",
      subject: "",
      establishmentId: userContext?.establishments.length === 1 ? userContext.establishments[0].id : "",
    });
    localStorage.removeItem("support-chat-messages");
    localStorage.removeItem("support-chat-ticket-created");
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="bg-background flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border shadow-2xl">
          {/* Header */}
          <div className="bg-primary flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="text-primary-foreground h-4 w-4" />
              <span className="text-primary-foreground text-sm font-semibold">Support</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/80 h-7 w-7"
                onClick={handleReset}
                title="Nouvelle conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/80 h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Escalation prompt */}
          {needsHuman && !showEscalation && !ticketCreated && (
            <EscalationPrompt
              onEscalate={() => {
                setNeedsHuman(false);
                setShowEscalation(true);
              }}
              onDismiss={() => setNeedsHuman(false)}
            />
          )}

          {/* Escalation form */}
          {showEscalation && !ticketCreated && (
            <EscalationFormView
              form={escalationForm}
              onChange={setEscalationForm}
              onSubmit={() => void handleCreateTicket()}
              isLoading={isLoading}
              establishments={userContext?.establishments ?? []}
            />
          )}

          {/* Input */}
          {!showEscalation && !ticketCreated && (
            <div className="border-t px-3 py-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Votre message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="text-sm"
                />
                <Button size="icon" onClick={() => void handleSend()} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <button
                onClick={() => {
                  setNeedsHuman(false);
                  setShowEscalation(true);
                }}
                className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-center gap-1 text-xs transition-colors"
              >
                <UserRound className="h-3 w-3" />
                Contacter le support
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => setIsOpen((v) => !v)}>
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
