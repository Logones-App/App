"use client";

import { useState } from "react";

import { Users } from "lucide-react";

import { useEstablishmentEmployees } from "@/lib/queries/employees-queries";

import { BackToEstablishmentButton } from "../back-to-establishment-button";

import { EmployeeAccessPanel } from "./employee-access-panel";
import { EmployeeListPanel } from "./employee-list-panel";

interface EmployeeAccessPageProps {
  establishmentId: string;
  organizationId: string;
}

export function EmployeeAccessPage({ establishmentId, organizationId }: EmployeeAccessPageProps) {
  const { data: employees = [], isLoading } = useEstablishmentEmployees(establishmentId, organizationId);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
        <h1 className="text-2xl font-bold">Accès &amp; Permissions</h1>
        <p className="text-muted-foreground text-sm">
          Configurez les modules accessibles et les permissions de chaque employé sur l&apos;application mobile.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <EmployeeListPanel
          employees={employees}
          isLoading={isLoading}
          selectedId={selectedEmployeeId}
          onSelect={setSelectedEmployeeId}
        />

        {selectedEmployee ? (
          <EmployeeAccessPanel
            employee={selectedEmployee}
            establishmentId={establishmentId}
            organizationId={organizationId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Users className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">Sélectionnez un employé pour configurer ses accès.</p>
          </div>
        )}
      </div>
    </div>
  );
}
