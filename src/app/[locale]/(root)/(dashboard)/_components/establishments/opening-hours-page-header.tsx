import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageHeader({ backLink, t }: { backLink: string; t: any }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Link href={backLink}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("openingHours.title")}</h1>
          <p className="text-muted-foreground">{t("openingHours.description")}</p>
        </div>
      </div>
    </div>
  );
}
