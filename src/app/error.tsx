"use client";

import { useEffect } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log l'erreur pour le debugging
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-red-600">Une erreur s'est produite</CardTitle>
          <CardDescription className="text-lg">Désolé, quelque chose s'est mal passé</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support si le problème persiste.
          </p>
          <div className="space-y-2">
            <Button onClick={reset} className="w-full">
              Réessayer
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">Retour au dashboard</Link>
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Détails de l'erreur (développement)</summary>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-400">{error.message}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
