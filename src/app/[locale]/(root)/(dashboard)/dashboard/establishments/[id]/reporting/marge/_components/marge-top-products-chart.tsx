"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { MarginRow } from "@/lib/queries/margin-reporting-queries";

const config: ChartConfig = {
  marginEur: { label: "Marge brute (€)", color: "var(--chart-1)" },
};

// Tronque les noms longs pour l'axe.
function shortName(name: string) {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

export function MargeTopProductsChart({ rows }: { rows: MarginRow[] }) {
  const data = rows
    .slice(0, 8)
    .map((r) => ({ name: shortName(r.recipeName), marginEur: r.marginEur }))
    .reverse(); // plus grande marge en haut

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top produits par marge brute</CardTitle>
        <CardDescription>Contribution à la marge sur la période (CA HT − coût matière FIFO).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => String(v)} tickMargin={8} />
            <YAxis type="category" dataKey="name" width={140} tickMargin={8} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => `${Number(v).toLocaleString("fr-FR")} €`} />}
            />
            <Bar dataKey="marginEur" fill="var(--color-marginEur)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
