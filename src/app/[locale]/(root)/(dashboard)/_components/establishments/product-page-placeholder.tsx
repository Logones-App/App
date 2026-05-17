"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  backHref: string;
  title: string;
  subtitle: string;
};

/** Page produit / nouveau produit : contenu minimal en attendant le formulaire complet. */
export function ProductPagePlaceholder({ backHref, title, subtitle }: Props) {
  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
