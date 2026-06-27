"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { toFriendlyUnitCost } from "@/lib/utils/unit-conversion";

type Snapshot = {
  id: string;
  unit_cost: number;
  effective_from: string;
  supplier_reference_id: string | null;
};

type RefInfo = {
  id: string;
  supplier: { name: string } | null;
  supplier_product_name: string | null;
};

function refLabel(ref: RefInfo | undefined): string {
  if (!ref) return "Référence";
  const supplier = ref.supplier?.name ?? "—";
  return ref.supplier_product_name ? `${supplier} · ${ref.supplier_product_name}` : supplier;
}

function buildChart(history: Snapshot[], references: RefInfo[], portionUnit: string | null) {
  const withRef = history.filter((h) => h.supplier_reference_id != null);
  const refIds = [...new Set(withRef.map((h) => h.supplier_reference_id as string))];

  const config: ChartConfig = {};
  refIds.forEach((id, i) => {
    config[id] = { label: refLabel(references.find((r) => r.id === id)), color: `var(--chart-${(i % 5) + 1})` };
  });

  const byTs = new Map<number, Record<string, number>>();
  for (const h of withRef) {
    const ts = new Date(h.effective_from).getTime();
    const row = byTs.get(ts) ?? { ts };
    row[h.supplier_reference_id as string] = toFriendlyUnitCost(h.unit_cost, portionUnit).value;
    byTs.set(ts, row);
  }
  const data = [...byTs.values()].sort((a, b) => a.ts - b.ts);
  const displayUnit = toFriendlyUnitCost(1, portionUnit).displayUnit;
  return { config, data, refIds, displayUnit };
}

export function ProductPriceHistoryChart({
  history,
  references,
  portionUnit,
}: {
  history: Snapshot[];
  references: RefInfo[];
  portionUnit: string | null;
}) {
  const { config, data, refIds, displayUnit } = buildChart(history, references, portionUnit);

  // Affiché dès le premier prix (un seul point = un repère).
  if (data.length === 0 || refIds.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Évolution du prix d&apos;achat</CardTitle>
        <CardDescription>Coût d&apos;achat dans le temps{displayUnit ? ` (€/${displayUnit})` : ""}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
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
            <YAxis tickMargin={8} width={48} tickFormatter={(v: number) => String(v)} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const ts = (payload[0]?.payload as { ts?: number } | undefined)?.ts;
                    return ts != null ? format(new Date(ts), "d MMM yyyy", { locale: fr }) : "";
                  }}
                />
              }
            />
            {refIds.map((id) => (
              <Line
                key={id}
                dataKey={id}
                type="monotone"
                stroke={`var(--color-${id})`}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
