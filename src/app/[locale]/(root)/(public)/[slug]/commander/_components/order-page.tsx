"use client";

import { useEffect, useState } from "react";

import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, Minus, Plus, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  type PublicProduct,
  type PublicSection,
  formatPrice,
  getPublicCarteSections,
} from "../../menu/_components/menu-utils";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type CartItem = {
  menuProductId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number | null;
};

type Step = "browse" | "checkout" | "waiting" | "confirmed";

interface Props {
  establishment: { id: string; name: string; slug: string };
  tableId: string;
  tableName: string;
  establishmentId: string;
}

export function OrderPage({ establishment, tableId, tableName, establishmentId }: Props) {
  const [sections, setSections] = useState<PublicSection[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState("");
  const [step, setStep] = useState<Step>("browse");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderEnabled, setOrderEnabled] = useState<boolean | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "lost">("connecting");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void getPublicCarteSections(establishmentId).then(setSections);
  }, [establishmentId]);

  useEffect(() => {
    void fetch(`/api/table-order/status?est=${establishmentId}&table=${tableId}`)
      .then((r) => r.json())
      .then((json: { enabled: boolean; reason?: string }) => {
        setOrderEnabled(json.enabled);
        setDisabledReason(json.reason ?? null);
      })
      .catch(() => {
        setOrderEnabled(false);
        setDisabledReason("Impossible de vérifier la disponibilité.");
      });
  }, [establishmentId, tableId]);

  useEffect(() => {
    if (!orderId) return;

    const timeout = setTimeout(() => setTimedOut(true), 45 * 1000);

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "table_order_requests", filter: `id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as { status: string; rejection_reason?: string | null };
          if (row.status === "accepted") {
            clearTimeout(timeout);
            setStep("confirmed");
          }
          if (row.status === "rejected") {
            clearTimeout(timeout);
            setError(row.rejection_reason ?? "Commande refusée.");
            setStep("checkout");
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("lost");
      });

    return () => {
      clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  function addToCart(item: PublicProduct) {
    if (item.price === null) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuProductId === item.menuProductId);
      if (existing)
        return prev.map((c) => (c.menuProductId === item.menuProductId ? { ...c, quantity: c.quantity + 1 } : c));
      return [
        ...prev,
        {
          menuProductId: item.menuProductId,
          productId: item.productId,
          name: item.name,
          quantity: 1,
          unitPrice: item.price!,
          vatRate: item.vatRate,
        },
      ];
    });
  }

  function removeFromCart(menuProductId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuProductId === menuProductId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.menuProductId !== menuProductId);
      return prev.map((c) => (c.menuProductId === menuProductId ? { ...c, quantity: c.quantity - 1 } : c));
    });
  }

  const getQty = (menuProductId: string) => cart.find((c) => c.menuProductId === menuProductId)?.quantity ?? 0;
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  async function handleSubmit() {
    if (!guestName.trim() || cart.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/table-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishment_id: establishmentId,
          table_id: tableId,
          guest_name: guestName.trim(),
          items: cart.map((c) => ({
            product_id: c.productId,
            name: c.name,
            quantity: c.quantity,
            unit_price: c.unitPrice,
            vat_rate: c.vatRate,
          })),
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      setOrderId(json.id!);
      setStep("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Chargement du statut en cours
  if (orderEnabled === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Commandes désactivées
  if (!orderEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <XCircle className="h-16 w-16 text-orange-400" />
        <h1 className="text-xl font-bold">Commandes indisponibles</h1>
        <p className="text-muted-foreground text-sm">{disabledReason ?? "Le service de commande n'est pas actif."}</p>
      </div>
    );
  }

  if (step === "confirmed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <h1 className="text-2xl font-bold">Commande bien reçue !</h1>
        <p className="text-muted-foreground">
          Merci <strong>{guestName}</strong>, votre commande pour la <strong>{tableName}</strong> est en cours de
          préparation.
        </p>
      </div>
    );
  }

  if (step === "waiting") {
    if (timedOut) {
      return (
        <div className="min-h-screen p-6">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <XCircle className="h-14 w-14 text-orange-400" />
            <p className="text-lg font-semibold">Commande non confirmée</p>
            <p className="text-muted-foreground text-sm">
              Montrez cette page à un serveur pour valider votre commande.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="mb-2 text-sm font-semibold">Votre commande — {tableName}</p>
            <div className="space-y-1">
              {cart.map((item) => (
                <div key={item.menuProductId} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium">{formatPrice(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setTimedOut(false);
              setStep("checkout");
            }}
            className="text-primary mt-6 w-full text-center text-sm underline"
          >
            Retenter l&apos;envoi
          </button>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
        <p className="text-lg font-medium">Commande envoyée…</p>
        <p className="text-muted-foreground text-sm">En attente de confirmation par l&apos;équipe</p>
        {realtimeStatus === "lost" && (
          <p className="mt-2 text-xs text-orange-500">Connexion perdue — tentative de reconnexion…</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
        <p className="text-muted-foreground text-xs">{establishment.name}</p>
        <h1 className="font-bold">{tableName}</h1>
      </header>

      {step === "browse" && (
        <>
          {sections.length === 0 && (
            <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
              Menu non disponible
            </div>
          )}
          {sections.map((section: PublicSection) => (
            <div key={section.id} className="px-4 py-5">
              <h2 className="mb-3 text-base font-semibold">{section.name}</h2>
              <div className="space-y-4">
                {section.items.map((item: PublicProduct) => {
                  const qty = getQty(item.menuProductId);
                  return (
                    <div key={item.menuProductId} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-muted-foreground line-clamp-2 text-xs">{item.description}</p>
                        )}
                        {item.price !== null && (
                          <p className="mt-0.5 text-sm font-semibold">{formatPrice(item.price)}</p>
                        )}
                      </div>
                      {item.price !== null && (
                        <div className="flex shrink-0 items-center gap-2">
                          {qty > 0 && (
                            <>
                              <button
                                onClick={() => removeFromCart(item.menuProductId)}
                                className="bg-muted flex h-7 w-7 items-center justify-center rounded-full"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-4 text-center text-sm font-semibold">{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <div className="fixed right-0 bottom-0 left-0 border-t bg-white p-4 shadow-lg">
              <Button className="w-full" onClick={() => setStep("checkout")}>
                Commander ({totalItems} article{totalItems > 1 ? "s" : ""}) — {formatPrice(totalPrice)}
              </Button>
            </div>
          )}
        </>
      )}

      {step === "checkout" && (
        <div className="space-y-5 p-4">
          <div>
            <h2 className="mb-3 font-semibold">Votre commande</h2>
            <div className="space-y-1">
              {cart.map((item) => (
                <div key={item.menuProductId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium">{formatPrice(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Votre prénom *</label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Entrez votre prénom"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button onClick={() => void handleSubmit()} disabled={!guestName.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer ma commande
            </Button>
            <Button variant="ghost" onClick={() => setStep("browse")}>
              ← Modifier la commande
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
