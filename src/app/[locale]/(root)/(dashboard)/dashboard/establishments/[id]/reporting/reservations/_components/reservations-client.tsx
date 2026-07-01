"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, defaultDateRange, rangeToIso } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  computeBookingKPIs,
  computeCapacity,
  computeCoversByDay,
  computeCoversByService,
  computeStatusBreakdown,
  useBookingSlots,
  useBookingsInRange,
} from "@/lib/queries/bookings-reporting-queries";

import { FrequentationChart } from "./frequentation-chart";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  seated: "Installé",
  cancelled: "Annulé",
  no_show: "No-show",
};

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function ReservationsClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const [range, setRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const { fromDate, toDate } = rangeToIso(range);

  const bookingsQ = useBookingsInRange(establishmentId, organizationId, fromDate, toDate);
  const slotsQ = useBookingSlots(establishmentId, organizationId);
  const bookings = useMemo(() => bookingsQ.data ?? [], [bookingsQ.data]);

  const kpis = useMemo(() => computeBookingKPIs(bookings), [bookings]);
  const byDay = useMemo(() => computeCoversByDay(bookings), [bookings]);
  const byService = useMemo(() => computeCoversByService(bookings), [bookings]);
  const byStatus = useMemo(() => computeStatusBreakdown(bookings), [bookings]);
  const capacity = useMemo(() => computeCapacity(slotsQ.data ?? [], fromDate, toDate), [slotsQ.data, fromDate, toDate]);

  const fillRate = capacity > 0 ? Math.round((kpis.honoredCovers / capacity) * 1000) / 10 : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Réservations & fréquentation</h1>
          <p className="text-muted-foreground text-sm">Couverts, taux de remplissage et no-show par période</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Couverts" value={String(kpis.honoredCovers)} hint={`${kpis.honoredCount} réservations`} />
        <StatCard
          title="Taux de remplissage"
          value={fillRate === null ? "—" : `${fillRate.toFixed(1)} %`}
          hint={fillRate === null ? "capacité créneaux non configurée" : "couverts / capacité créneaux"}
        />
        <StatCard
          title="Taux de no-show"
          value={kpis.noShowRate === null ? "—" : `${kpis.noShowRate.toFixed(1)} %`}
          hint="no-show / (honorés + no-show)"
        />
        <StatCard
          title="Taux d'annulation"
          value={kpis.cancellationRate === null ? "—" : `${kpis.cancellationRate.toFixed(1)} %`}
          hint="annulées / total réservations"
        />
      </div>

      {bookingsQ.isPending ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">Chargement…</p>
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">Aucune réservation sur la période.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <FrequentationChart rows={byDay} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Couverts par service</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Réservations</TableHead>
                      <TableHead className="text-right">Couverts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byService.map((r) => (
                      <TableRow key={r.service}>
                        <TableCell className="font-medium">{r.service}</TableCell>
                        <TableCell className="text-right">{r.bookings}</TableCell>
                        <TableCell className="text-right">{r.covers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Réservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byStatus.map((r) => (
                      <TableRow key={r.status}>
                        <TableCell className="font-medium">{STATUS_LABELS[r.status] ?? r.status}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
