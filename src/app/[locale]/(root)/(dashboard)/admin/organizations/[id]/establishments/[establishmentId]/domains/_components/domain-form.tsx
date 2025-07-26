"use client";

import { useState, useEffect, useCallback } from "react";

import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DomainService } from "@/lib/services/domain-service";
import { Tables } from "@/lib/supabase/database.types";

import { DnsInstructions } from "./dns-instructions";
import { ValidationFeedback } from "./validation-feedback";

type Establishment = Tables<"establishments">;

interface DomainFormProps {
  establishment: Establishment;
  establishmentId: string;
  onDomainAdded: () => void;
}

function useDomainValidation() {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const validateDomain = useCallback((domain: string) => {
    if (!domain.trim()) {
      setValidationError(null);
      setValidationWarnings([]);
      return;
    }

    const domainService = new DomainService();
    const validation = domainService.validateDomain(domain);

    if (!validation.isValid) {
      setValidationError(validation.error ?? "Format invalide");
      setValidationWarnings([]);
    } else {
      setValidationError(null);
      const warnings: string[] = [];
      const trimmedDomain = domain.trim().toLowerCase();

      if (trimmedDomain.includes("localhost") || trimmedDomain.includes("127.0.0.1")) {
        warnings.push("Ce domaine semble être un domaine de développement");
      }

      if (trimmedDomain.startsWith("www.")) {
        warnings.push("Le préfixe 'www.' n'est pas nécessaire");
      }

      setValidationWarnings(warnings);
    }
  }, []);

  return { validationError, validationWarnings, validateDomain };
}

function useAddDomainMutation(queryClient: QueryClient, establishmentId: string, onSuccess: () => void) {
  return useMutation({
    mutationFn: async ({ domain, establishment }: { domain: string; establishment: Establishment }) => {
      return new DomainService().addCustomDomain(
        domain,
        establishmentId,
        establishment.slug ?? "",
        establishment.organization_id ?? "",
      );
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`Erreur lors de l'ajout: ${result.error}`);
      } else {
        toast.success("Domaine ajouté avec succès");
        // ❌ RETIRÉ - Cette ligne causait la boucle infinie
        // queryClient.invalidateQueries({ queryKey: ["custom-domains", establishmentId] });
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout du domaine");
      console.error("Erreur d'ajout:", error);
    },
  });
}

export function DomainForm({ establishment, establishmentId, onDomainAdded }: DomainFormProps) {
  const [newDomain, setNewDomain] = useState("");
  const queryClient = useQueryClient();

  const { validationError, validationWarnings, validateDomain } = useDomainValidation();
  const addDomainMutation = useAddDomainMutation(queryClient, establishmentId, onDomainAdded);

  // ✅ CORRIGÉ - useEffect avec useCallback pour éviter la boucle infinie
  useEffect(() => {
    validateDomain(newDomain);
  }, [newDomain, validateDomain]);

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error("Veuillez saisir un domaine");
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }

    addDomainMutation.mutate({ domain: newDomain, establishment });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Ajouter un domaine
        </CardTitle>
        <CardDescription>Ajoutez un nouveau domaine personnalisé pour cet établissement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain">Domaine</Label>
              <Input
                id="domain"
                placeholder="exemple.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={addDomainMutation.isPending}
                className={
                  validationError ? "border-red-500" : validationWarnings.length > 0 ? "border-yellow-500" : ""
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddDomain}
                disabled={addDomainMutation.isPending || !newDomain.trim() || !!validationError}
              >
                {addDomainMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </div>

          <ValidationFeedback
            validationError={validationError}
            validationWarnings={validationWarnings}
            newDomain={newDomain}
          />

          <DnsInstructions newDomain={newDomain} validationError={validationError} />
        </div>
      </CardContent>
    </Card>
  );
}
