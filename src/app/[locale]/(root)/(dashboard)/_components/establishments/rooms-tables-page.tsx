"use client";

import { useState } from "react";

import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function RoomCard({
  room,
  onEditRoom,
  onDeleteRoom,
  onAddTable,
  onEditTable,
  onDeleteTable,
}: {
  room: RoomWithTables;
  onEditRoom: (room: RoomWithTables) => void;
  onDeleteRoom: (room: RoomWithTables) => void;
  onAddTable: (room: RoomWithTables) => void;
  onEditTable: (table: TableRow, room: RoomWithTables) => void;
  onDeleteTable: (table: TableRow) => void;
}) {
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
        <div className="flex flex-wrap gap-2">
          {room.tables.map((table) => (
            <div key={table.id} className="group bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <UtensilsCrossed className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{table.name}</span>
              {table.seats != null && <span className="text-muted-foreground text-xs">{table.seats}p</span>}
              <div className="ml-1 hidden gap-0.5 group-hover:flex">
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onEditTable(table, room)}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => onDeleteTable(table)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="h-9" onClick={() => onAddTable(room)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Table
          </Button>
        </div>
        {room.tables.length === 0 && <p className="text-muted-foreground text-xs">Aucune table — ajoutez-en une.</p>}
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
