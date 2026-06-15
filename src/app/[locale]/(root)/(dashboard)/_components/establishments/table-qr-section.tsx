"use client";

import { useEffect, useState } from "react";

import { QrCode } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCodeDialog } from "@/components/ui/qr-code-dialog";
import { createClient } from "@/lib/supabase/client";

interface Table {
  id: string;
  name: string;
}

interface Props {
  establishmentId: string;
  establishmentSlug: string;
}

export function TableQrSection({ establishmentId, establishmentSlug }: Props) {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("tables")
      .select("id, name")
      .eq("establishment_id", establishmentId)
      .eq("deleted", false)
      .order("name")
      .then(({ data }) => setTables((data ?? []) as Table[]));
  }, [establishmentId]);

  if (tables.length === 0) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4" />
          QR codes commande par table
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <QrCodeDialog
              key={table.id}
              url={`${origin}/fr/${establishmentSlug}/commander?table=${table.id}&est=${establishmentId}`}
              label={table.name}
              description={`QR commande pour ${table.name}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
