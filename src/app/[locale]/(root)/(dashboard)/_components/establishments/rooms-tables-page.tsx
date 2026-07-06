"use client";

import { useState } from "react";

import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCodeDialog } from "@/components/ui/qr-code-dialog";
import { useEstablishment } from "@/lib/queries/establishments";
import {
  type RoomWithTables,
  type TableRow,
  useCreateRoom,
  useCreateTable,
  useDeleteRoom,
  useDeleteTable,
  useRoomsWithTables,
  useUpdateRoom,
  useUpdateTable,
} from "@/lib/queries/rooms-tables-queries";

// ─── Room modal ───────────────────────────────────────────────────────────────

function RoomModal({
  open,
  initial,
  onClose,
  onSave,
  pending,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial);

  const handleOpen = (v: boolean) => {
    if (v) setName(initial);
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la salle" : "Nouvelle salle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Restaurant, Terrasse…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSave(name);
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={() => onSave(name)} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table modal ──────────────────────────────────────────────────────────────

function TableModal({
  open,
  initial,
  onClose,
  onSave,
  pending,
}: {
  open: boolean;
  initial: TableRow | null;
  onClose: () => void;
  onSave: (name: string, seats: number | null) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [seats, setSeats] = useState<string>(initial?.seats != null ? String(initial.seats) : "");

  const handleOpen = (v: boolean) => {
    if (v) {
      setName(initial?.name ?? "");
      setSeats(initial?.seats != null ? String(initial.seats) : "");
    } else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la table" : "Nouvelle table"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Nom / Numéro <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Table 1, Bar…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onSave(name, seats ? Number(seats) : null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre de places</Label>
            <Input type="number" min={0} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="—" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={() => onSave(name, seats ? Number(seats) : null)} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────────

function TableTile({
  table,
  room,
  orderUrl,
  onEditTable,
  onDeleteTable,
}: {
  table: TableRow;
  room: RoomWithTables;
  orderUrl: string | null;
  onEditTable: (table: TableRow, room: RoomWithTables) => void;
  onDeleteTable: (table: TableRow) => void;
}) {
  return (
    <div className="bg-muted/40 flex flex-col justify-between gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{table.name}</p>
          {table.seats != null && <p className="text-muted-foreground text-xs">{table.seats} places</p>}
        </div>
        <UtensilsCrossed className="text-muted-foreground h-4 w-4 shrink-0" />
      </div>
      <div className="flex items-center gap-1">
        {orderUrl && (
          <QrCodeDialog
            url={orderUrl}
            label="QR"
            title={`QR commande — ${table.name}`}
            description={`Commande à table pour ${table.name}`}
            downloadName={`qr-${table.name}.png`}
            footer="Placez ce QR sur la table. Les clients scannent pour commander directement."
          />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-7 w-7"
          onClick={() => onEditTable(table, room)}
          aria-label="Modifier la table"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive h-7 w-7"
          onClick={() => onDeleteTable(table)}
          aria-label="Supprimer la table"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RoomCard({
  room,
  establishmentSlug,
  establishmentId,
  onEditRoom,
  onDeleteRoom,
  onAddTable,
  onEditTable,
  onDeleteTable,
}: {
  room: RoomWithTables;
  establishmentSlug: string;
  establishmentId: string;
  onEditRoom: (room: RoomWithTables) => void;
  onDeleteRoom: (room: RoomWithTables) => void;
  onAddTable: (room: RoomWithTables) => void;
  onEditTable: (table: TableRow, room: RoomWithTables) => void;
  onDeleteTable: (table: TableRow) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const orderUrlFor = (tableId: string) =>
    establishmentSlug ? `${origin}/fr/${establishmentSlug}/commander?table=${tableId}&est=${establishmentId}` : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="text-base font-semibold">{room.name}</CardTitle>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditRoom(room)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={() => onDeleteRoom(room)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {room.tables.map((table) => (
            <TableTile
              key={table.id}
              table={table}
              room={room}
              orderUrl={orderUrlFor(table.id)}
              onEditTable={onEditTable}
              onDeleteTable={onDeleteTable}
            />
          ))}
          <button
            type="button"
            onClick={() => onAddTable(room)}
            className="text-muted-foreground hover:border-primary hover:text-foreground flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Table
          </button>
        </div>
        {room.tables.length === 0 && (
          <p className="text-muted-foreground mt-2 text-xs">Aucune table — ajoutez-en une.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function RoomsTablesPage({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { data: rooms = [], isLoading } = useRoomsWithTables(establishmentId, organizationId);
  const { data: establishment } = useEstablishment(establishmentId);
  const establishmentSlug = establishment?.slug ?? "";

  const createRoom = useCreateRoom(establishmentId, organizationId);
  const updateRoom = useUpdateRoom(establishmentId);
  const deleteRoom = useDeleteRoom(establishmentId);
  const createTable = useCreateTable(establishmentId, organizationId);
  const updateTable = useUpdateTable(establishmentId);
  const deleteTable = useDeleteTable(establishmentId);

  const [roomModal, setRoomModal] = useState<{ open: boolean; editing: RoomWithTables | null }>({
    open: false,
    editing: null,
  });
  const [tableModal, setTableModal] = useState<{
    open: boolean;
    editing: TableRow | null;
    room: RoomWithTables | null;
  }>({ open: false, editing: null, room: null });

  function handleSaveRoom(name: string) {
    if (roomModal.editing) {
      updateRoom.mutate(
        { id: roomModal.editing.id, name },
        {
          onSuccess: () => {
            toast.success("Salle mise à jour.");
            setRoomModal({ open: false, editing: null });
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createRoom.mutate(name, {
        onSuccess: () => {
          toast.success("Salle créée.");
          setRoomModal({ open: false, editing: null });
        },
        onError: (e) => toast.error(e.message),
      });
    }
  }

  function handleDeleteRoom(room: RoomWithTables) {
    const label = room.tables.length > 0 ? ` et ses ${room.tables.length} table(s)` : "";
    if (!confirm(`Supprimer la salle "${room.name}"${label} ?`)) return;
    deleteRoom.mutate(room.id, {
      onSuccess: () => toast.success("Salle supprimée."),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleSaveTable(name: string, seats: number | null) {
    if (tableModal.editing) {
      updateTable.mutate(
        { id: tableModal.editing.id, name, seats },
        {
          onSuccess: () => {
            toast.success("Table mise à jour.");
            setTableModal({ open: false, editing: null, room: null });
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else if (tableModal.room) {
      createTable.mutate(
        { roomId: tableModal.room.id, name, seats, existingCount: tableModal.room.tables.length },
        {
          onSuccess: () => {
            toast.success("Table créée.");
            setTableModal({ open: false, editing: null, room: null });
          },
          onError: (e) => toast.error(e.message),
        },
      );
    }
  }

  function handleDeleteTable(table: TableRow) {
    if (!confirm(`Supprimer la table "${table.name}" ?`)) return;
    deleteTable.mutate(table.id, {
      onSuccess: () => toast.success("Table supprimée."),
      onError: (e) => toast.error(e.message),
    });
  }

  const roomPending = createRoom.isPending || updateRoom.isPending;
  const tablePending = createTable.isPending || updateTable.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salles & Tables</h1>
          <p className="text-muted-foreground text-sm">Plan de salle de l&apos;établissement.</p>
        </div>
        <Button onClick={() => setRoomModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle salle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
          <UtensilsCrossed className="h-8 w-8 opacity-30" />
          <p>Aucune salle — créez-en une pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              establishmentSlug={establishmentSlug}
              establishmentId={establishmentId}
              onEditRoom={(r) => setRoomModal({ open: true, editing: r })}
              onDeleteRoom={handleDeleteRoom}
              onAddTable={(r) => setTableModal({ open: true, editing: null, room: r })}
              onEditTable={(t, r) => setTableModal({ open: true, editing: t, room: r })}
              onDeleteTable={handleDeleteTable}
            />
          ))}
        </div>
      )}

      <RoomModal
        open={roomModal.open}
        initial={roomModal.editing?.name ?? ""}
        onClose={() => setRoomModal({ open: false, editing: null })}
        onSave={handleSaveRoom}
        pending={roomPending}
      />

      <TableModal
        open={tableModal.open}
        initial={tableModal.editing ?? null}
        onClose={() => setTableModal({ open: false, editing: null, room: null })}
        onSave={handleSaveTable}
        pending={tablePending}
      />
    </div>
  );
}
