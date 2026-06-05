"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

interface EmployeeListPanelProps {
  employees: Employee[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EmployeeListPanel({ employees, isLoading, selectedId, onSelect }: EmployeeListPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Employés
          <span className="text-muted-foreground ml-2 text-sm font-normal">({employees.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-1 px-4 pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <p className="text-muted-foreground px-4 pb-4 text-sm">Aucun employé pour cet établissement.</p>
        ) : (
          <ul className="divide-y">
            {employees.map((emp) => (
              <li key={emp.id}>
                <button
                  type="button"
                  onClick={() => onSelect(emp.id)}
                  className={cn(
                    "hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                    selectedId === emp.id && "bg-muted",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {emp.lastname} {emp.firstname}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{emp.job_title ?? emp.role ?? "—"}</p>
                  </div>
                  {emp.has_mobile_access ? (
                    <Badge variant="default" className="shrink-0 text-[10px]">
                      Mobile
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground shrink-0 text-[10px]">
                      Inactif
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
