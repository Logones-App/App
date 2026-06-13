"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface OrgOption {
  id: string;
  name: string;
  establishments: { id: string; name: string }[];
}

interface EmployeeOption {
  id: string;
  firstname: string;
  lastname: string;
  email: string | null;
}

interface Props {
  open: boolean;
  organizations: OrgOption[];
  onClose: () => void;
  onSuccess: () => void;
}

type RoleType = "commercial" | "org_admin" | "manager" | "employee";

export function CreateUserModal({ open, organizations, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleType>("commercial");
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les employés sans compte quand l'établissement est sélectionné
  useEffect(() => {
    if (role !== "employee" || !selectedEstablishmentId) {
      setEmployees([]);
      setSelectedEmployeeId("");
      return;
    }
    setIsLoadingEmployees(true);
    fetch(`/api/admin/employees?establishmentId=${selectedEstablishmentId}`)
      .then((r) => r.json())
      .then((d: { employees: EmployeeOption[] }) => setEmployees(d.employees))
      .catch(() => setEmployees([]))
      .finally(() => setIsLoadingEmployees(false));
  }, [role, selectedEstablishmentId]);

  // Pré-remplir l'email depuis la fiche employé sélectionnée
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (emp?.email && !email) setEmail(emp.email);
    if (emp && !name) setName(`${emp.firstname} ${emp.lastname}`);
  }, [selectedEmployeeId, employees, email, name]);

  function reset() {
    setEmail("");
    setName("");
    setRole("commercial");
    setSelectedOrgIds(new Set());
    setSelectedOrgId("");
    setSelectedEstablishmentId("");
    setSelectedEmployeeId("");
    setEmployees([]);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleOrg(id: string) {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!email.trim()) {
      setError("L'email est requis");
      return;
    }
    if ((role === "org_admin" || role === "manager") && !selectedOrgId) {
      setError("Veuillez sélectionner une organisation");
      return;
    }
    if (role === "employee" && !selectedEmployeeId) {
      setError("Veuillez sélectionner un employé à lier");
      return;
    }

    const organizationIds = role === "commercial" ? Array.from(selectedOrgIds) : selectedOrgId ? [selectedOrgId] : [];

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          organizationIds,
          establishmentId: role === "manager" ? selectedEstablishmentId || null : null,
          employeeId: role === "employee" ? selectedEmployeeId || null : null,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");

      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedOrgForManager = organizations.find((o) => o.id === selectedOrgId);
  const selectedOrgForEmployee = organizations.find((o) => o.id === selectedOrgId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rôle en premier pour adapter le formulaire */}
          <div className="space-y-1.5">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as RoleType);
                setSelectedOrgId("");
                setSelectedOrgIds(new Set());
                setSelectedEstablishmentId("");
                setSelectedEmployeeId("");
              }}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial (multi-org Logones)</SelectItem>
                <SelectItem value="org_admin">Org Admin (admin client)</SelectItem>
                <SelectItem value="manager">Manager (établissement)</SelectItem>
                <SelectItem value="employee">Employé (accès planning)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flow employé : org → établissement → fiche employé → email auto */}
          {role === "employee" && (
            <>
              <div className="space-y-1.5">
                <Label>Organisation</Label>
                <Select
                  value={selectedOrgId}
                  onValueChange={(v) => {
                    setSelectedOrgId(v);
                    setSelectedEstablishmentId("");
                    setSelectedEmployeeId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrgForEmployee && (
                <div className="space-y-1.5">
                  <Label>Établissement</Label>
                  <Select
                    value={selectedEstablishmentId}
                    onValueChange={(v) => {
                      setSelectedEstablishmentId(v);
                      setSelectedEmployeeId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un établissement" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrgForEmployee.establishments.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedEstablishmentId && (
                <div className="space-y-1.5">
                  <Label>Fiche employé à lier</Label>
                  {isLoadingEmployees ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement…
                    </div>
                  ) : employees.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucun employé sans compte dans cet établissement.</p>
                  ) : (
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un employé" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.lastname} {e.firstname}
                            {e.email && <span className="text-muted-foreground ml-1 text-xs">({e.email})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean@example.com"
            />
          </div>

          {/* Organisations pour commercial */}
          {role === "commercial" && (
            <div className="space-y-1.5">
              <Label>
                Organisations assignées{" "}
                {selectedOrgIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedOrgIds.size}
                  </Badge>
                )}
              </Label>
              <ScrollArea className="h-44 rounded-md border p-2">
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`org-${org.id}`}
                        checked={selectedOrgIds.has(org.id)}
                        onCheckedChange={() => toggleOrg(org.id)}
                      />
                      <Label htmlFor={`org-${org.id}`} className="cursor-pointer text-sm font-normal">
                        {org.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Organisation + établissement pour org_admin / manager */}
          {(role === "org_admin" || role === "manager") && (
            <div className="space-y-1.5">
              <Label>Organisation</Label>
              <Select
                value={selectedOrgId}
                onValueChange={(v) => {
                  setSelectedOrgId(v);
                  setSelectedEstablishmentId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "manager" && selectedOrgForManager && (
            <div className="space-y-1.5">
              <Label>Établissement</Label>
              <Select value={selectedEstablishmentId} onValueChange={setSelectedEstablishmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un établissement" />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrgForManager.establishments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <p className="text-muted-foreground text-xs">
            Un email de réinitialisation de mot de passe sera envoyé à l&apos;utilisateur.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
