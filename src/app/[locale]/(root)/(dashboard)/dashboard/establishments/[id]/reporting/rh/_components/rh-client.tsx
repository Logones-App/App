"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, defaultDateRange, rangeToIso } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useAbsences } from "@/lib/queries/absences-queries";
import { useEstablishmentEmployees } from "@/lib/queries/employees-queries";
import { useEstablishmentOrders } from "@/lib/queries/orders-queries";
import { useEmployeeShifts, useShiftOverrides } from "@/lib/queries/planning-queries";
import { computeSalesKPIs } from "@/lib/queries/sales-reporting-queries";

import { computeAbsencesByType, computeLaborByEmployee } from "./labor-compute";
import { RhHoursChart } from "./rh-hours-chart";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export function RhClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const [range, setRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const { fromIso: from, toIso: to } = rangeToIso(range);

  const shiftsQ = useEmployeeShifts(establishmentId, organizationId);
  const overridesQ = useShiftOverrides(establishmentId, organizationId);
  const employeesQ = useEstablishmentEmployees(establishmentId, organizationId);
  const absencesQ = useAbsences(organizationId);
  const ordersQ = useEstablishmentOrders(establishmentId, organizationId, from, to);

  const labor = useMemo(
    () => computeLaborByEmployee(shiftsQ.data ?? [], overridesQ.data ?? [], employeesQ.data ?? [], from, to),
    [shiftsQ.data, overridesQ.data, employeesQ.data, from, to],
  );
  const absenceRows = useMemo(
    () => computeAbsencesByType(absencesQ.data ?? [], establishmentId, from, to),
    [absencesQ.data, establishmentId, from, to],
  );
  const revenueHt = useMemo(() => computeSalesKPIs(ordersQ.data ?? []).revenueHt, [ordersQ.data]);

  const totalHours = labor.reduce((s, r) => s + r.plannedHours, 0);
  const totalCost = labor.reduce((s, r) => s + (r.laborCost ?? 0), 0);
  const totalAbsenceDays = absenceRows.reduce((s, r) => s + r.days, 0);
  const costRatio = revenueHt > 0 ? (totalCost / revenueHt) * 100 : null;

  const isPending = shiftsQ.isPending || employeesQ.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">RH & main d&apos;œuvre</h1>
            <Badge variant="secondary">Heures planifiées</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Heures planifiées, coût main d&apos;œuvre estimé et absences (sans pointage réel)
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Heures planifiées" value={`${fmt(totalHours)} h`} hint="sur la période" />
        <StatCard title="Coût MO estimé" value={`${fmt(totalCost)} €`} hint="brut, hors charges patronales" />
        <StatCard
          title="Coût MO / CA HT"
          value={costRatio === null ? "—" : `${costRatio.toFixed(1)} %`}
          hint="ratio sur coût estimé"
        />
        <StatCard title="Jours d'absence" value={String(totalAbsenceDays)} hint="chevauchant la période" />
      </div>

      {isPending ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">Chargement…</p>
          </CardContent>
        </Card>
      ) : labor.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">
              Aucun shift planifié sur la période — la charge apparaîtra dès que le planning sera renseigné.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <RhHoursChart rows={labor} />

          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-sm font-medium">Détail par employé</CardTitle>
              <p className="text-muted-foreground text-xs">
                Coût estimé = heures planifiées × (salaire brut mensuel ÷ {MONTHLY_HOURS_LABEL} h). Hors charges
                patronales et hors pointage réel.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Heures planifiées</TableHead>
                    <TableHead className="text-right">Taux horaire</TableHead>
                    <TableHead className="text-right">Coût estimé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labor.map((r) => (
                    <TableRow key={r.employeeId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{fmt(r.plannedHours)} h</TableCell>
                      <TableCell className="text-right">
                        {r.costKnown ? (
                          `${fmt(r.hourlyRate as number)} €/h`
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            salaire non renseigné
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {r.costKnown ? `${fmt(r.laborCost as number)} €` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Absences par type</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {absenceRows.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">Aucune absence sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Absences</TableHead>
                      <TableHead className="text-right">Jours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absenceRows.map((r) => (
                      <TableRow key={r.type}>
                        <TableCell className="font-medium">{r.type}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const MONTHLY_HOURS_LABEL = "151,67";
