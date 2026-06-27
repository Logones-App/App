"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { SalesDayRow } from "@/lib/queries/sales-reporting-queries";

const config: ChartConfig = {
  revenueHt: { label: "CA HT (€)", color: "var(--chart-1)" },
};

export function VentesRevenueChart({ rows }: { rows: SalesDayRow[] }) {
  const data = rows.map((r) => ({ ts: new Date(r.date).getTime(), revenueHt: r.revenueHt }));
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Évolution du CA HT</CardTitle>
        <CardDescription>Chiffre d&apos;affaires HT par jour sur la période.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => format(new Date(v), "d MMM", { locale: fr })}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis tickMargin={8} width={56} tickFormatter={(v: number) => String(v)} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `${Number(value).toLocaleString("fr-FR")} €`}
                  labelFormatter={(_, payload) => {
                    const ts = (payload[0]?.payload as { ts?: number } | undefined)?.ts;
                    return ts != null ? format(new Date(ts), "d MMM yyyy", { locale: fr }) : "";
                  }}
                />
              }
            />
            <Area
              dataKey="revenueHt"
              type="monotone"
              stroke="var(--color-revenueHt)"
              fill="var(--color-revenueHt)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
