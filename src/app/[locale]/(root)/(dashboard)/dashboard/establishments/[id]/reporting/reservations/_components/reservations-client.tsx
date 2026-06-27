"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const PERIODS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
] as const;

type Period = (typeof PERIODS)[number]["days"];

function getPeriodDates(days: Period) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) };
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmé",
  completed: "Terminé",
  pending: "En attente",
  cancelled: "Annulé",
  "no-show": "No-show",
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
  const [period, setPeriod] = useState<Period>(30);
  const { fromDate, toDate } = useMemo(() => getPeriodDates(period), [period]);

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
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={period === p.days ? "default" : "outline"}
              onClick={() => setPeriod(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
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
