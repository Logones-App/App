"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Building2, Check, ChevronsUpDown, House } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useOrganizationEstablishments } from "@/lib/queries/establishments-queries";
import { useCurrentEstablishmentStore } from "@/lib/stores/current-establishment-store";

const LS_KEY = "current-establishment";

export function EstablishmentSwitcher() {
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const { data: establishments = [], isLoading } = useOrganizationEstablishments(organizationId);
  const { establishmentId, setEstablishment, clearEstablishment } = useCurrentEstablishmentStore();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "fr";

  // Valide que l'établissement en store appartient bien à cette org
  useEffect(() => {
    if (isLoading || establishments.length === 0 || !establishmentId) return;
    const belongs = establishments.some((e) => e.id === establishmentId);
    if (!belongs) {
      clearEstablishment();
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        /* */
      }
    }
  }, [isLoading, establishments, establishmentId, clearEstablishment]);

  // Auto-sélection si un seul établissement
  useEffect(() => {
    if (isLoading || establishments.length !== 1 || establishmentId) return;
    const e = establishments[0];
    setEstablishment(e.id, e.name);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ id: e.id, name: e.name }));
    } catch {
      /* */
    }
  }, [isLoading, establishments, establishmentId, setEstablishment]);

  if (isLoading || establishments.length === 0) return null;

  const current = establishments.find((e) => e.id === establishmentId);
  const homeHref = establishmentId ? `/${locale}/dashboard/establishments/${establishmentId}` : null;

  const handleSelect = (id: string) => {
    const found = establishments.find((e) => e.id === id);
    if (!found) return;
    setEstablishment(found.id, found.name);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ id: found.id, name: found.name }));
    } catch {
      /* */
    }
    setOpen(false);
    router.push(`/${locale}/dashboard/establishments/${found.id}`);
  };

  // Un seul établissement → affichage simple
  if (establishments.length === 1) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Établissement actif</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 py-1">
              <div className="flex min-w-0 flex-1 items-center gap-2 py-0.5">
                <Building2 className="text-primary h-4 w-4 shrink-0" />
                <span className="truncate text-sm font-medium">{establishments[0].name}</span>
              </div>
              {homeHref && (
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" asChild>
                  <Link href={homeHref}>
                    <House className="h-4 w-4" />
                    <span className="sr-only">Accueil établissement</span>
                  </Link>
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Plusieurs établissements → Combobox
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Établissement actif</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 py-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="min-w-0 flex-1 justify-between text-sm font-normal"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 className="text-primary h-4 w-4 shrink-0" />
                    <span className="truncate">{current?.name ?? "Choisir…"}</span>
                  </div>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start" side="bottom">
                <Command>
                  <CommandInput placeholder="Rechercher…" className="h-9" />
                  <CommandList>
                    <CommandEmpty>Aucun résultat.</CommandEmpty>
                    <CommandGroup>
                      {establishments.map((e) => (
                        <CommandItem key={e.id} value={e.id} onSelect={handleSelect}>
                          <Check className={`mr-2 h-4 w-4 ${e.id === establishmentId ? "opacity-100" : "opacity-0"}`} />
                          {e.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {homeHref && (
              <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" asChild>
                <Link href={homeHref}>
                  <House className="h-4 w-4" />
                  <span className="sr-only">Accueil établissement</span>
                </Link>
              </Button>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
