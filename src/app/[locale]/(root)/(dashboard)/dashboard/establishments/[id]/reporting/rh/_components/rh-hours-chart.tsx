"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

import type { LaborEmployeeRow } from "./labor-compute";

const config: ChartConfig = {
  plannedHours: { label: "Heures planifiées", color: "var(--chart-1)" },
};

function shortName(name: string) {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

export function RhHoursChart({ rows }: { rows: LaborEmployeeRow[] }) {
  const data = rows
    .slice(0, 10)
    .map((r) => ({ name: shortName(r.name), plannedHours: r.plannedHours }))
    .reverse();

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Heures planifiées par employé</CardTitle>
        <CardDescription>Volume d&apos;heures planifiées sur la période (hors pointage réel).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => String(v)} tickMargin={8} />
            <YAxis type="category" dataKey="name" width={140} tickMargin={8} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => `${Number(v).toLocaleString("fr-FR")} h`} />}
            />
            <Bar dataKey="plannedHours" fill="var(--color-plannedHours)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
