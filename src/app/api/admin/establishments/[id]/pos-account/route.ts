// Deprecated — replaced by /api/admin/establishments/[id]/orga-user
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Deprecated — use /api/admin/establishments/[id]/orga-user" }, { status: 410 });
}
