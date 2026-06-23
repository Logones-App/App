"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizationEstablishments } from "@/lib/queries/establishments";

export function EstablishmentsShared({ organizationId }: { organizationId: string }) {
  const t = useTranslations("establishments");
  const { data: establishments = [], isLoading, error } = useOrganizationEstablishments(organizationId);
  const pathname = usePathname();

  const isSystemAdmin = pathname.includes("/admin/organizations/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : error ? (
        <p className="text-destructive">{t("error_loading")}</p>
      ) : establishments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("empty.title")}</CardTitle>
            <CardDescription>{t("empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {establishments.map((establishment) => {
            const detailHref = isSystemAdmin
              ? `/admin/organizations/${organizationId}/establishments/${establishment.id}`
              : `/dashboard/establishments/${establishment.id}`;
            return (
              <Card key={establishment.id} className="flex h-full flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl leading-tight">{establishment.name}</CardTitle>
                  {establishment.address ? (
                    <CardDescription className="flex items-start gap-2 pt-1">
                      <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{establishment.address}</span>
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardFooter className="mt-auto border-t">
                  <Button className="w-full" asChild>
                    <Link href={detailHref}>{t("manage")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
