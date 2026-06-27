"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingSlot = Database["public"]["Tables"]["booking_slots"]["Row"];

// Statuts honorés (présence réelle) vs annulés / no-show.
const HONORED = new Set(["confirmed", "completed"]);

// ── Fetch ──────────────────────────────────────────────────────────────────
export function useBookingsInRange(establishmentId: string, organizationId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["bookings-range", establishmentId, organizationId, fromDate, toDate],
    queryFn: async (): Promise<Booking[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .gte("date", fromDate)
        .lte("date", toDate);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId && !!fromDate && !!toDate,
  });
}

export function useBookingSlots(establishmentId: string, organizationId: string) {
  return useQuery({
    queryKey: ["booking-slots", establishmentId, organizationId],
    queryFn: async (): Promise<BookingSlot[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
}

// ── Compute (purs) ─────────────────────────────────────────────────────────

export type BookingKPIs = {
  honoredCount: number;
  honoredCovers: number;
  noShowRate: number | null; // no-show / (honoré + no-show)
  cancellationRate: number | null; // annulé / total
};

export function computeBookingKPIs(bookings: Booking[]): BookingKPIs {
  let honoredCount = 0;
  let honoredCovers = 0;
  let noShow = 0;
  let cancelled = 0;
  for (const b of bookings) {
    if (HONORED.has(b.status)) {
      honoredCount += 1;
      honoredCovers += b.number_of_guests;
    } else if (b.status === "no-show") {
      noShow += 1;
    } else if (b.status === "cancelled") {
      cancelled += 1;
    }
  }
  const dueTotal = honoredCount + noShow;
  return {
    honoredCount,
    honoredCovers,
    noShowRate: dueTotal > 0 ? Math.round((noShow / dueTotal) * 1000) / 10 : null,
    cancellationRate: bookings.length > 0 ? Math.round((cancelled / bookings.length) * 1000) / 10 : null,
  };
}

export type CoversDayRow = { date: string; covers: number; bookings: number };

export function computeCoversByDay(bookings: Booking[]): CoversDayRow[] {
  const byDate = new Map<string, { covers: number; bookings: number }>();
  for (const b of bookings) {
    if (!HONORED.has(b.status)) continue;
    const e = byDate.get(b.date) ?? { covers: 0, bookings: 0 };
    e.covers += b.number_of_guests;
    e.bookings += 1;
    byDate.set(b.date, e);
  }
  return [...byDate.entries()]
    .map(([date, e]) => ({ date, covers: e.covers, bookings: e.bookings }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type CoversServiceRow = { service: string; covers: number; bookings: number };

export function computeCoversByService(bookings: Booking[]): CoversServiceRow[] {
  const byService = new Map<string, { covers: number; bookings: number }>();
  for (const b of bookings) {
    if (!HONORED.has(b.status)) continue;
    const service = b.service_name || "—";
    const e = byService.get(service) ?? { covers: 0, bookings: 0 };
    e.covers += b.number_of_guests;
    e.bookings += 1;
    byService.set(service, e);
  }
  return [...byService.entries()]
    .map(([service, e]) => ({ service, covers: e.covers, bookings: e.bookings }))
    .sort((a, b) => b.covers - a.covers);
}

export type StatusRow = { status: string; count: number };

export function computeStatusBreakdown(bookings: Booking[]): StatusRow[] {
  const byStatus = new Map<string, number>();
  for (const b of bookings) byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
  return [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

function dayStrList(fromDate: string, toDate: string): string[] {
  const days: string[] = [];
  const end = new Date(`${toDate}T00:00:00`);
  let cur = new Date(`${fromDate}T00:00:00`);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return days;
}

// Capacité théorique de la période = Σ max_capacity des créneaux actifs dont le
// day_of_week correspond et dont la validité couvre le jour. 0 si rien de configuré.
export function computeCapacity(slots: BookingSlot[], fromDate: string, toDate: string): number {
  let capacity = 0;
  for (const dayStr of dayStrList(fromDate, toDate)) {
    const wd = new Date(`${dayStr}T00:00:00`).getDay();
    for (const s of slots) {
      if (s.is_active === false || s.max_capacity == null) continue;
      if (s.day_of_week !== wd) continue;
      if (s.valid_from && dayStr < s.valid_from) continue;
      if (s.valid_until && dayStr > s.valid_until) continue;
      capacity += s.max_capacity;
    }
  }
  return capacity;
}
