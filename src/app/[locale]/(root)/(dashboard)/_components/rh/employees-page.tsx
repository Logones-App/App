"use client";

import { useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Pencil, Plus, Search, Smartphone, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roleLabel } from "@/lib/permissions/employee-permissions";
import {
  type Employee,
  type EmployeeInsert,
  type EmployeeUpdate,
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useEstablishmentEmployees,
  useUpdateEmployee,
} from "@/lib/queries/employees-queries";

import { type EstablishmentOption, EmployeeModal } from "./employee-modal";

const CONTRACT_LABELS: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  apprentissage: "Apprentissage",
  stagiaire: "Stage",
  other: "Autre",
};

export function EmployeesPage({
  organizationId,
  establishmentId,
  establishments,
}: {
  organizationId: string;
  establishmentId?: string | null;
  establishments?: EstablishmentOption[];
}) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data: allEmployees = [], isLoading: loadingAll } = useEmployees(organizationId);
  const { data: estEmployees = [], isLoading: loadingEst } = useEstablishmentEmployees(
    establishmentId ?? "",
    organizationId,
  );
  const employees = establishmentId ? estEmployees : allEmployees;
  const isLoading = establishmentId ? loadingEst : loadingAll;

  const createMutation = useCreateEmployee(organizationId, establishmentId);
  const updateMutation = useUpdateEmployee(organizationId, establishmentId);
  const deleteMutation = useDeleteEmployee(organizationId, establishmentId);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.firstname.toLowerCase().includes(q) ||
      e.lastname.toLowerCase().includes(q) ||
      (e.job_title ?? "").toLowerCase().includes(q)
    );
  });

  const handleSave = (payload: EmployeeInsert | (EmployeeUpdate & { id: string })) => {
    if (editingEmployee) {
      updateMutation.mutate(
        { ...(payload as EmployeeUpdate), id: editingEmployee.id },
        {
          onSuccess: () => {
            toast.success("Employé mis à jour.");
            setModalOpen(false);
            setEditingEmployee(null);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createMutation.mutate(payload as EmployeeInsert, {
        onSuccess: () => {
          toast.success("Employé créé.");
          setModalOpen(false);
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleDelete = (emp: Employee) => {
    if (!confirm(`Désactiver ${emp.firstname} ${emp.lastname} ?`)) return;
    deleteMutation.mutate(emp.id, {
      onSuccess: () => toast.success("Employé désactivé."),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employés</h1>
          <p className="text-muted-foreground text-sm">
            {establishmentId ? "Employés de cet établissement." : "Registre du personnel de votre organisation."}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un employé
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un employé…"
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Entrée</TableHead>
              <TableHead>Rôle app</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                  {search ? "Aucun résultat." : "Aucun employé pour l'instant."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="font-medium">
                      {emp.lastname} {emp.firstname}
                    </div>
                    {emp.email && <div className="text-muted-foreground text-xs">{emp.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{emp.job_title ?? "—"}</TableCell>
                  <TableCell>
                    {emp.contract_type ? (
                      <Badge variant="outline">{CONTRACT_LABELS[emp.contract_type] ?? emp.contract_type}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {emp.hire_datetime ? format(new Date(emp.hire_datetime), "d MMM yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {emp.has_mobile_access && <Smartphone className="text-primary h-3.5 w-3.5" />}
                      <span className="text-sm">{roleLabel(emp.role) ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {emp.is_active ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-600">
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactif
                      </Badge>
                    )}
                    {emp.exit_date && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Sorti {format(new Date(emp.exit_date), "d MMM yyyy", { locale: fr })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingEmployee(emp);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-7 w-7"
                        onClick={() => handleDelete(emp)}
                      >
                        {emp.is_active ? <UserX className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditingEmployee(null);
        }}
        initial={editingEmployee}
        organizationId={organizationId}
        establishmentId={establishmentId}
        establishments={establishments}
        onSave={handleSave}
        pending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
