"use client";

import { useEffect, useState } from "react";

import { createClient } from "@supabase/supabase-js";
import { Loader2, XCircle } from "lucide-react";

import type { Formula, FormulaProduct } from "@/app/api/table-order/formulas/route";
import { Button } from "@/components/ui/button";

import {
  type PublicProduct,
  type PublicSection,
  getPublicCarteSectionsWithStock,
} from "../../menu/_components/menu-utils";

import { BrowseSection } from "./browse-section";
import { CheckoutStep } from "./checkout-step";
import { CustomizationModal } from "./customization-modal";
import { type CartItemSelections, buildOrderItem } from "./customization-utils";
import { FormulaPicker } from "./formula-picker";
import { TableView } from "./table-view";
import { WaitingScreen } from "./waiting-screen";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type OpenOrderResult = { ordersId: string; savedNameMatch: boolean; names: string[] } | { ordersId: null };

async function fetchOpenOrder(tableId: string, establishmentId: string): Promise<OpenOrderResult> {
  const res = await fetch(`/api/table-order/open-order?table=${tableId}&est=${establishmentId}`);
  const json = (await res.json()) as { ordersId: string | null; names: string[] };
  if (!json.ordersId) return { ordersId: null };
  const savedName = localStorage.getItem(`table_guest_${tableId}`);
  return { ordersId: json.ordersId, savedNameMatch: !!savedName && json.names.includes(savedName), names: json.names };
}

type CartItem = {
  id: string;
  menuProductId: string;
  productId: string;
  name: string;
  unitPrice: number;
  vatRate: number | null;
  note: string;
  menusId: string;
  selections: CartItemSelections;
  formulaInstanceId?: string;
  formulaId?: string;
  formulaName?: string;
};

type Step = "browse" | "checkout" | "waiting" | "table-view" | "name-pick";
type ModalState = { product: PublicProduct; cartItemId?: string };

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
  const [ordersId, setOrdersId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderEnabled, setOrderEnabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "lost">("connecting");
  const [timedOut, setTimedOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openOrderNames, setOpenOrderNames] = useState<string[]>([]);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [roundRequestId, setRoundRequestId] = useState<string | null>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [pendingGuestName, setPendingGuestName] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [formulaModal, setFormulaModal] = useState<Formula | null>(null);

  useEffect(() => {
    void getPublicCarteSectionsWithStock(establishmentId).then(setSections);
  }, [establishmentId]);

  useEffect(() => {
    const menuId = sections.flatMap((s) => s.items).find((i) => i.menusId)?.menusId;
    if (!menuId) return;
    fetch(`/api/table-order/formulas?menu_id=${menuId}&est=${establishmentId}`)
      .then((r) => r.json() as Promise<Formula[]>)
      .then(setFormulas)
      .catch(() => {});
  }, [sections, establishmentId]);

  useEffect(() => {
    const statusPromise = fetch(`/api/table-order/status?est=${establishmentId}&table=${tableId}`)
      .then((r) => r.json() as Promise<{ enabled: boolean; reason?: string }>)
      .then((json) => {
        setOrderEnabled(json.enabled);
        setDisabledReason(json.reason ?? null);
      })
      .catch(() => {
        setOrderEnabled(false);
        setDisabledReason("Impossible de vérifier la disponibilité.");
      });
    const openPromise = fetchOpenOrder(tableId, establishmentId).then((result) => {
      if (!result.ordersId) return;
      setOrdersId(result.ordersId);
      if (result.savedNameMatch) {
        setGuestName(localStorage.getItem(`table_guest_${tableId}`) ?? "");
        setStep("table-view");
      } else {
        setOpenOrderNames(result.names);
        setStep("name-pick");
      }
    });
    void Promise.all([statusPromise, openPromise]).finally(() => setIsLoading(false));
  }, [tableId, establishmentId]);

  useEffect(() => {
    if (!orderId) return;
    const timeout = setTimeout(() => setTimedOut(true), 5 * 60 * 1000);
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "table_order_requests", filter: `id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as { status: string; order_id?: string | null; rejection_reason?: string | null };
          if (row.status === "accepted") {
            clearTimeout(timeout);
            setOrdersId(row.order_id ?? null);
            setStep("table-view");
          }
          if (row.status === "rejected") {
            clearTimeout(timeout);
            setError(row.rejection_reason ?? "Commande refusée.");
            setStep("checkout");
          }
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setRealtimeStatus("connected");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(s)) setRealtimeStatus("lost");
      });
    return () => {
      clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (!roundRequestId) return;
    const channel = supabase
      .channel(`round-${roundRequestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "table_order_requests", filter: `id=eq.${roundRequestId}` },
        (payload) => {
          const row = payload.new as { status: string; rejection_reason?: string | null };
          if (row.status === "rejected") setRoundError(row.rejection_reason ?? "Articles refusés.");
          setRoundRequestId(null);
          setPendingGuestName(null);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roundRequestId]);

  function handleAddProduct(item: PublicProduct) {
    if (item.price === null || item.isOutOfStock) return;
    if (item.isCustomizable) {
      setModalState({ product: item });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        menuProductId: item.menuProductId,
        productId: item.productId,
        name: item.name,
        unitPrice: item.price!,
        vatRate: item.vatRate,
        note: "",
        menusId: item.menusId,
        selections: { options: {}, compositions: {} },
      },
    ]);
  }

  function handleModalConfirm(selections: CartItemSelections, unitPrice: number) {
    if (!modalState) return;
    const { product, cartItemId } = modalState;
    if (cartItemId) {
      setCart((prev) => prev.map((c) => (c.id === cartItemId ? { ...c, selections, unitPrice } : c)));
    } else {
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          menuProductId: product.menuProductId,
          productId: product.productId,
          name: product.name,
          unitPrice,
          vatRate: product.vatRate,
          note: "",
          menusId: product.menusId,
          selections,
        },
      ]);
    }
    setModalState(null);
  }

  function editCartItem(cartItemId: string) {
    const item = cart.find((c) => c.id === cartItemId);
    const section = sections.flatMap((s) => s.items).find((p) => p.menuProductId === (item?.menuProductId ?? ""));
    if (!item || !section) return;
    setModalState({ product: section, cartItemId });
  }

  const removeCartItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const removeFormulaGroup = (groupId: string) =>
    setCart((prev) => prev.filter((c) => c.formulaInstanceId !== groupId));
  const handleNoteChange = (id: string, note: string) =>
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)));
  const handleFormulaGroupNoteChange = (groupId: string, note: string) =>
    setCart((prev) => prev.map((c) => (c.formulaInstanceId === groupId ? { ...c, note } : c)));

  function handleFormulaConfirm(formula: Formula, sels: Partial<Record<string, FormulaProduct>>) {
    const groupId = crypto.randomUUID();
    const supplementTotal = formula.slots.reduce((s, sl) => s + (sels[sl.id]?.supplement_price ?? 0), 0);
    const groupPrice = formula.price + supplementTotal;
    const items: CartItem[] = formula.slots
      .slice()
      .sort((a, b) => a.slot_order - b.slot_order)
      .map((sl, i) => ({
        id: crypto.randomUUID(),
        menuProductId: "",
        productId: sels[sl.id]?.product_id ?? "",
        name: sels[sl.id]?.product_name ?? "",
        unitPrice: i === 0 ? groupPrice : 0,
        vatRate: null,
        note: "",
        menusId: formula.menu_id,
        selections: { options: {}, compositions: {} },
        formulaInstanceId: groupId,
        formulaId: formula.id,
        formulaName: formula.name,
      }));
    setCart((prev) => [...prev, ...items]);
    setFormulaModal(null);
  }
  const totalPrice = cart.reduce((s, c) => s + c.unitPrice, 0);

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
          menu_id: cart[0].menusId,
          ...(isAddingItems && ordersId ? { orders_id: ordersId } : {}),
          items: cart.map((c) =>
            buildOrderItem({
              productId: c.productId,
              name: c.name,
              unitPrice: c.formulaInstanceId ? 0 : c.unitPrice,
              vatRate: c.vatRate,
              note: c.note,
              formulaId: c.formulaId,
              formulaInstanceId: c.formulaInstanceId,
              selections: c.selections,
            }),
          ),
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      localStorage.setItem(`table_guest_${tableId}`, guestName.trim());
      if (isAddingItems) {
        setPendingGuestName(guestName.trim());
        setRoundRequestId(json.id!);
        setCart([]);
        setIsAddingItems(false);
        setStep("table-view");
      } else {
        setOrderId(json.id!);
        setStep("waiting");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectGuest(name: string) {
    setGuestName(name);
    setCart([]);
    setIsAddingItems(true);
    setRoundError(null);
    setStep("browse");
  }

  function handleNewGuest() {
    setGuestName("");
    setCart([]);
    setIsAddingItems(true);
    setRoundError(null);
    setStep("checkout");
  }

  function handleNamePick(name: string) {
    setGuestName(name);
    localStorage.setItem(`table_guest_${tableId}`, name);
    setStep("table-view");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!orderEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <XCircle className="h-16 w-16 text-orange-400" />
        <h1 className="text-xl font-bold">Commandes indisponibles</h1>
        <p className="text-muted-foreground text-sm">{disabledReason ?? "Le service de commande n'est pas actif."}</p>
      </div>
    );
  }
  if (step === "name-pick") {
    return (
      <div className="min-h-screen">
        <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
          <p className="text-muted-foreground text-xs">{establishment.name}</p>
          <h1 className="font-bold">{tableName}</h1>
        </header>
        <div className="space-y-3 p-6">
          <p className="font-medium">Une commande est en cours à cette table. Qui êtes-vous ?</p>
          <div className="flex flex-col gap-2 pt-2">
            {openOrderNames.map((name) => (
              <Button key={name} onClick={() => handleNamePick(name)}>
                {name}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setOrdersId(null);
                setStep("browse");
              }}
            >
              Nouveau convive
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (step === "table-view" && ordersId) {
    return (
      <TableView
        ordersId={ordersId}
        establishmentId={establishmentId}
        tableName={tableName}
        guestName={guestName}
        onSelectGuest={handleSelectGuest}
        onNewGuest={handleNewGuest}
        pendingGuestName={pendingGuestName}
        roundError={roundError}
        onClearRoundError={() => setRoundError(null)}
      />
    );
  }
  if (step === "waiting") {
    return (
      <WaitingScreen
        cart={cart}
        tableName={tableName}
        totalPrice={totalPrice}
        timedOut={timedOut}
        realtimeStatus={realtimeStatus}
        onRetry={() => {
          setTimedOut(false);
          setStep("checkout");
        }}
      />
    );
  }

  const backToTable = () => setStep("table-view");
  return (
    <>
      {formulaModal && (
        <FormulaPicker
          formula={formulaModal}
          onConfirm={(sels) => handleFormulaConfirm(formulaModal, sels)}
          onClose={() => setFormulaModal(null)}
        />
      )}
      {modalState && (
        <CustomizationModal
          product={modalState.product}
          establishmentId={establishmentId}
          initialSelections={
            modalState.cartItemId ? cart.find((c) => c.id === modalState.cartItemId)?.selections : undefined
          }
          onConfirm={handleModalConfirm}
          onClose={() => setModalState(null)}
        />
      )}
      <div className="min-h-screen pb-28">
        <header className="bg-background/95 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
          <p className="text-muted-foreground text-xs">{establishment.name}</p>
          <h1 className="font-bold">{tableName}</h1>
          <button hidden={!ordersId} onClick={backToTable} className="text-primary mt-0.5 text-xs underline">
            ← Commande en cours
          </button>
        </header>
        {step === "browse" && (
          <BrowseSection
            sections={sections}
            formulas={formulas}
            cartLength={cart.length}
            totalPrice={totalPrice}
            isAddingItems={isAddingItems}
            guestName={guestName}
            getProductCount={(id) => cart.filter((c) => c.menuProductId === id).length}
            onAddProduct={handleAddProduct}
            onOpenFormula={setFormulaModal}
            onGoToCheckout={() => setStep("checkout")}
          />
        )}
        {step === "checkout" && (
          <CheckoutStep
            cart={cart}
            totalPrice={totalPrice}
            guestName={guestName}
            isAddingItems={isAddingItems}
            isSubmitting={isSubmitting}
            error={error}
            isItemCustomizable={(id) =>
              sections.flatMap((s) => s.items).some((p) => p.menuProductId === id && p.isCustomizable)
            }
            onGuestNameChange={setGuestName}
            onNoteChange={handleNoteChange}
            onFormulaGroupNoteChange={handleFormulaGroupNoteChange}
            onEditItem={editCartItem}
            onRemoveItem={removeCartItem}
            onRemoveFormulaGroup={removeFormulaGroup}
            onSubmit={() => void handleSubmit()}
            onBack={() => setStep("browse")}
            onCancel={() => {
              setIsAddingItems(false);
              setCart([]);
              setStep("table-view");
            }}
          />
        )}
      </div>
    </>
  );
}
