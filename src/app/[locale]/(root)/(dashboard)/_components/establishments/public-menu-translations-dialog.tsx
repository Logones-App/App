"use client";

import { useState } from "react";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type LocalizedContent, localeLabel, rawLocalized, setLocalized } from "@/lib/i18n/localized";

export type TranslField = { key: string; label: string; base: string | null; multiline?: boolean };

/** Un groupe = un ensemble de champs partageant une même source `translations` et un même `onSave`. */
export type TranslGroup = {
  fields: TranslField[];
  translations: unknown;
  onSave: (next: LocalizedContent) => void;
  /** Titre affiché au-dessus du groupe (utile quand plusieurs groupes cohabitent). */
  label?: string;
};

function normalize(translations: unknown): LocalizedContent {
  return translations && typeof translations === "object" ? (translations as LocalizedContent) : {};
}

/**
 * Bouton 🌐 + dialogue de saisie des traductions par langue secondaire.
 * Accepte plusieurs groupes de champs (ex. produit + note), chacun sauvegardé vers sa propre cible.
 * Ne s'affiche que si l'établissement propose plus d'une langue.
 */
export function TranslationsButton({
  title,
  locales,
  groups,
  isPending,
  triggerTitle = "Traductions",
}: {
  title: string;
  locales: string[];
  groups: TranslGroup[];
  isPending?: boolean;
  triggerTitle?: string;
}) {
  const secondary = locales.slice(1);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(secondary[0] ?? "");
  const [drafts, setDrafts] = useState<LocalizedContent[]>(() => groups.map((g) => normalize(g.translations)));

  if (secondary.length === 0) return null;

  const handleOpen = (o: boolean) => {
    if (o) {
      setDrafts(groups.map((g) => normalize(g.translations)));
      setActive(secondary[0]);
    }
    setOpen(o);
  };

  const setField = (groupIdx: number, code: string, key: string, value: string) =>
    setDrafts((ds) => ds.map((d, i) => (i === groupIdx ? setLocalized(d, code, key, value) : d)));

  const save = () => {
    groups.forEach((g, i) => g.onSave(drafts.at(i) ?? {}));
    setOpen(false);
  };

  const multiGroup = groups.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" title={triggerTitle}>
          <Languages className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Traductions — {title}</DialogTitle>
        </DialogHeader>

        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex-wrap">
            {secondary.map((code) => (
              <TabsTrigger key={code} value={code}>
                {localeLabel(code)}
              </TabsTrigger>
            ))}
          </TabsList>

          {secondary.map((code) => (
            <TabsContent key={code} value={code} className="space-y-4 pt-2">
              {groups.map((g, gi) => (
                <div key={g.label ?? gi} className="space-y-3">
                  {multiGroup && g.label && (
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{g.label}</p>
                  )}
                  {g.fields.map((f) => {
                    const value = rawLocalized(drafts.at(gi), code, f.key);
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        {f.multiline ? (
                          <Textarea
                            value={value}
                            onChange={(e) => setField(gi, code, f.key, e.target.value)}
                            placeholder={f.base ?? ""}
                            rows={2}
                            className="text-sm"
                          />
                        ) : (
                          <Input
                            value={value}
                            onChange={(e) => setField(gi, code, f.key, e.target.value)}
                            placeholder={f.base ?? ""}
                            className="h-8 text-sm"
                          />
                        )}
                        {f.base && <p className="text-muted-foreground text-[11px]">Réf. : {f.base}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button type="button" onClick={save} disabled={isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
