"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
export type TableRow = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];

export type RoomWithTables = Room & { tables: TableRow[] };

const QUERY_KEY = "rooms-tables";

function calcTablePosition(index: number) {
  const cols = 4;
  const spacing = 120;
  return { x: (index % cols) * spacing + 50, y: Math.floor(index / cols) * spacing + 100 };
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function useRoomsWithTables(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("rooms")
        .select("*, tables(id, name, seats, x, y, width, height, deleted, room_id, establishment_id, organization_id)")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        tables: (r.tables as TableRow[]).filter((t) => !t.deleted),
      })) as RoomWithTables[];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

// ─── Room mutations ───────────────────────────────────────────────────────────

export function useCreateRoom(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          name: name.trim(),
          establishment_id: establishmentId,
          organization_id: organizationId,
          deleted: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Room;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}

export function useUpdateRoom(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("rooms").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}

export function useDeleteRoom(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const supabase = createClient();
      await supabase.from("tables").update({ deleted: true }).eq("room_id", roomId);
      const { error } = await supabase.from("rooms").update({ deleted: true }).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}

// ─── Table mutations ──────────────────────────────────────────────────────────

export function useCreateTable(establishmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      name,
      seats,
      existingCount,
    }: {
      roomId: string;
      name: string;
      seats: number | null;
      existingCount: number;
    }) => {
      const supabase = createClient();
      const pos = calcTablePosition(existingCount);
      const { data, error } = await supabase
        .from("tables")
        .insert({
          name: name.trim(),
          room_id: roomId,
          establishment_id: establishmentId,
          organization_id: organizationId,
          seats: seats ?? null,
          deleted: false,
          ...pos,
          width: 80,
          height: 80,
          rotation: 0,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as TableRow;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}

export function useUpdateTable(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, seats }: { id: string; name: string; seats: number | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tables").update({ name: name.trim(), seats }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}

export function useDeleteTable(establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tableId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tables").update({ deleted: true }).eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, establishmentId] });
    },
  });
}
