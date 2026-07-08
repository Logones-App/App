"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLES = [
  {
    emoji: "🍽️",
    name: "Recette",
    desc: "A une composition (BOM) : fabriquée à partir d'ingrédients. Ex : burger, cocktail, sauce maison.",
  },
  {
    emoji: "🧄",
    name: "Ingrédient",
    desc: "Matière première ou préparation, stockée et consommée dans les recettes. Ex : farine, huile.",
  },
  {
    emoji: "🏷️",
    name: "En vente",
    desc: "Mis en vente : a un prix dans un ou plusieurs menus. C'est une intention commerciale, découplée de la structure.",
  },
];

const CASES = [
  {
    produit: "Plat cuisiné (burger, salade)",
    roles: "Recette + En vente",
    note: "Composé d'ingrédients, vendu au client.",
  },
  {
    produit: "Boisson en bouteille revendue",
    roles: "Ingrédient + En vente",
    note: "Revente sèche : achetée/stockée et vendue telle quelle (vente 1:1 avec le stock).",
  },
  {
    produit: "Farine, huile",
    roles: "Ingrédient",
    note: "Matière d'achat / de stock, pas vendue seule.",
  },
  {
    produit: "Sauce maison (préparation)",
    roles: "Recette (+ Ingrédient)",
    note: "Fabriquée ; devient aussi Ingrédient si utilisée dans d'autres recettes.",
  },
  {
    produit: "Shot 4 cl d'une matière au litre",
    roles: "En vente (format)",
    note: "Unité de vente ≠ unité de stock → format de vente séparé, avec BOM mono-source sur la matière.",
  },
];

export function ProductTypesInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-7 w-7"
          title="Comprendre les types de produit"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Types de produit — comment ça marche</DialogTitle>
          <DialogDescription>
            Trois rôles cumulables (le champ «&nbsp;type&nbsp;»). Un même produit peut en porter plusieurs à la fois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            {ROLES.map((r) => (
              <div key={r.name} className="flex gap-2">
                <Badge variant="secondary" className="h-fit shrink-0 font-normal">
                  {r.emoji} {r.name}
                </Badge>
                <p className="text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </section>

          <section className="space-y-1.5">
            <h4 className="font-semibold">Le principe : structure ≠ vente</h4>
            <p className="text-muted-foreground">
              {"« Recette » et « Ingrédient » décrivent la structure (comment le produit est fait ou utilisé). " +
                "« En vente » décrit l'intention commerciale. Les deux sont indépendants : un ingrédient peut être " +
                "vendu, et une recette peut ne pas l'être."}
            </p>
            <p className="text-muted-foreground">
              {"Le prix de vente est toujours défini par menu — un même produit peut donc avoir un prix différent " +
                "(ou être absent) selon le menu : carte, midi, happy hour…"}
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-semibold">Comment les créer</h4>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5">
              <li>{"« Nouveau produit » → une fiche destinée à la vente (plat, boisson…)."}</li>
              <li>{"« Nouvel ingrédient » → une matière d'achat / de stock."}</li>
              <li>
                {"Ajouter un ingrédient dans la composition d'un produit pose automatiquement le rôle « Recette » " +
                  "sur le parent et « Ingrédient » sur le composant."}
              </li>
              <li>
                {"Revente sèche (vente 1:1 avec l'unité stockée, sans transformation) → l'ingrédient lui-même est " +
                  "mis « En vente »."}
              </li>
              <li>
                {"Vente d'une portion dans une autre unité (ex. shot 4 cl d'une matière au litre) → créer un format " +
                  "de vente séparé, avec une composition mono-source sur la matière."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold">Cas typiques</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-1.5 pr-3 font-medium">Produit</th>
                    <th className="py-1.5 pr-3 font-medium">Rôles</th>
                    <th className="py-1.5 font-medium">Pourquoi</th>
                  </tr>
                </thead>
                <tbody>
                  {CASES.map((c) => (
                    <tr key={c.produit} className="border-b align-top last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{c.produit}</td>
                      <td className="text-muted-foreground py-1.5 pr-3 whitespace-nowrap">{c.roles}</td>
                      <td className="text-muted-foreground py-1.5">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
