"use client";

import { useEffect, useState } from "react";

import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type Absence,
  type AbsenceInsert,
  useAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  useUpdateAbsence,
} from "@/lib/queries/absences-queries";
import { useEmployees } from "@/lib/queries/employees-queries";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  paid_leave: "Congés payés",
  sick_leave: "Maladie",
  unpaid_leave: "Sans solde",
  other: "Autre",
};

const TYPE_COLORS: Record<string, string> = {
  paid_leave: "bg-blue-100 text-blue-800 border-blue-200",
  sick_leave: "bg-red-100 text-red-800 border-red-200",
  unpaid_leave: "bg-orange-100 text-orange-800 border-orange-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
};

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const date = value ? new Date(value) : undefined;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left text-sm font-normal", !value && "text-muted-foreground")}
          >
            {date ? format(date, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
            locale={fr}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AbsenceModal({
  open,
  onOpenChange,
  initial,
  organizationId,
  employees,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Absence | null;
  organizationId: string;
  employees: { id: string; firstname: string; lastname: string }[];
  onSave: (p: AbsenceInsert | (Partial<Absence> & { id: string })) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<AbsenceInsert>>({});

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...initial } : { organization_id: organizationId, has_document: false, deleted: false });
  }, [open, initial, organizationId]);

  const set = (k: keyof AbsenceInsert, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.employee_id && form.type && form.start_date && form.end_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'absence" : "Nouvelle absence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Employé <span className="text-destructive">*</span>
            </Label>
            <Select value={form.employee_id ?? ""} onValueChange={(v) => set("employee_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un employé…" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastname} {e.firstname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Type d&apos;absence <span className="text-destructive">*</span>
            </Label>
            <Select value={form.type ?? ""} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerField
              label="Premier jour *"
              value={form.start_date ?? ""}
              onChange={(v) => set("start_date", v)}
            />
            <DatePickerField label="Dernier jour *" value={form.end_date ?? ""} onChange={(v) => set("end_date", v)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={form.has_document ?? false} onCheckedChange={(v) => set("has_document", Boolean(v))} />
            <span className="text-sm">
              Justificatif reçu
              {form.type === "sick_leave" && <span className="text-destructive ml-1">(obligatoire)</span>}
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onSave(
                initial ? ({ ...form, id: initial.id } as Partial<Absence> & { id: string }) : (form as AbsenceInsert),
              )
            }
            disabled={pending || !valid}
          >
            {initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AbsencesPage({ organizationId }: { organizationId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Absence | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: rawAbsences = [], isLoading } = useAbsences(organizationId);
  const { data: employees = [] } = useEmployees(organizationId);
  const createMutation = useCreateAbsence(organizationId);
  const updateMutation = useUpdateAbsence(organizationId);
  const deleteMutation = useDeleteAbsence(organizationId);

  const absences = rawAbsences.filter((a) => {
    if (filterEmployee !== "all" && a.employee_id !== filterEmployee) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const handleSave = (payload: AbsenceInsert | (Partial<Absence> & { id: string })) => {
    if (editing) {
      updateMutation.mutate(payload as Partial<Absence> & { id: string }, {
        onSuccess: () => {
          toast.success("Absence mise à jour.");
          setModalOpen(false);
          setEditing(null);
        },
        onError: (e) => toast.error(e.message),
      });
    } else {
      createMutation.mutate(payload as AbsenceInsert, {
        onSuccess: () => {
          toast.success("Absence enregistrée.");
          setModalOpen(false);
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Absences</h1>
          <p className="text-muted-foreground text-sm">Suivi des absences de votre équipe.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Déclarer une absence
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les employés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les employés</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.lastname} {e.firstname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Du</TableHead>
              <TableHead>Au</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Justificatif</TableHead>
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
            ) : absences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                  Aucune absence enregistrée.
                </TableCell>
              </TableRow>
            ) : (
              absences.map((a) => {
                const days =
                  a.start_date && a.end_date
                    ? differenceInCalendarDays(new Date(a.end_date), new Date(a.start_date)) + 1
                    : null;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.employee ? `${a.employee.lastname} ${a.employee.firstname}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[a.type])}>
                        {TYPE_LABELS[a.type] ?? a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.start_date ? format(new Date(a.start_date), "d MMM yyyy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.end_date ? format(new Date(a.end_date), "d MMM yyyy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{days ? `${days} j` : "—"}</TableCell>
                    <TableCell>
                      {a.has_document ? (
                        <Badge variant="outline" className="border-emerald-300 text-xs text-emerald-600">
                          Reçu
                        </Badge>
                      ) : a.type === "sick_leave" ? (
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                          Manquant
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(a);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 w-7"
                          onClick={() => {
                            if (!confirm("Supprimer cette absence ?")) return;
                            deleteMutation.mutate(a.id, {
                              onSuccess: () => toast.success("Absence supprimée."),
                              onError: (e) => toast.error(e.message),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AbsenceModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        organizationId={organizationId}
        employees={employees}
        onSave={handleSave}
        pending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
