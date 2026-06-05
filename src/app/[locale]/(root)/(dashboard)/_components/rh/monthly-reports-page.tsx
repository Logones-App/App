"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/lib/queries/employees-queries";
import {
  type MonthlyReport,
  type MonthlyReportInsert,
  useDeleteMonthlyReport,
  useMonthlyReports,
  useUpsertMonthlyReport,
} from "@/lib/queries/monthly-reports-queries";

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function NumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={0.5}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder ?? "0"}
        className="h-8 text-sm"
      />
    </div>
  );
}

function ReportModal({
  open,
  onOpenChange,
  initial,
  organizationId,
  year,
  month,
  employees,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: MonthlyReport | null;
  organizationId: string;
  year: number;
  month: number;
  employees: { id: string; firstname: string; lastname: string }[];
  onSave: (p: MonthlyReportInsert) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<MonthlyReportInsert>>({});

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...initial } : { organization_id: organizationId, year, month, deleted: false });
  }, [open, initial, organizationId, year, month]);

  const set = (k: keyof MonthlyReportInsert, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Fiche {MONTHS_FR[month - 1]} {year}
            {initial && (initial as MonthlyReport & { employee?: { lastname: string } | null }).employee?.lastname
              ? ` — ${(initial as MonthlyReport & { employee?: { lastname: string } | null }).employee?.lastname}`
              : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {!initial && (
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
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Commentaires</Label>
            <Textarea
              value={form.comments ?? ""}
              onChange={(e) => set("comments", e.target.value || null)}
              rows={2}
              placeholder="Augmentation de salaire, changement d'horaire…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Entrée en cours de mois</Label>
              <Input
                type="date"
                value={form.hire_mid_month_date ?? ""}
                onChange={(e) => set("hire_mid_month_date", e.target.value || null)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sortie en cours de mois</Label>
              <Input
                type="date"
                value={form.exit_mid_month_date ?? ""}
                onChange={(e) => set("exit_mid_month_date", e.target.value || null)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Heures supp. / complémentaires
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((w) => (
                <NumField
                  key={w}
                  label={`S${w}`}
                  value={(form as Record<string, number | null>)[`overtime_week_${w}`] ?? null}
                  onChange={(v) => set(`overtime_week_${w}` as keyof MonthlyReportInsert, v)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Complément de rémunération
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Prime brute (€)"
                value={form.bonus_gross ?? null}
                onChange={(v) => set("bonus_gross", v)}
              />
              <NumField label="Prime nette (€)" value={form.bonus_net ?? null} onChange={(v) => set("bonus_net", v)} />
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Autre</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Tickets restaurant"
                value={form.meal_vouchers_count ?? null}
                onChange={(v) => set("meal_vouchers_count", v)}
                placeholder="nb"
              />
              <NumField
                label="Frais professionnels (€)"
                value={form.expense_claims ?? null}
                onChange={(v) => set("expense_claims", v)}
              />
              <NumField
                label="Acompte (€)"
                value={form.advance_payment ?? null}
                onChange={(v) => set("advance_payment", v)}
              />
              <NumField
                label="Transport 50% (€)"
                value={form.transport_subsidy ?? null}
                onChange={(v) => set("transport_subsidy", v)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Autres notes</Label>
            <Textarea
              value={form.other_notes ?? ""}
              onChange={(e) => set("other_notes", e.target.value || null)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => onSave(form as MonthlyReportInsert)} disabled={pending || !form.employee_id}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonthlyReportsPage({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MonthlyReport | null>(null);

  const { data: reports = [], isLoading } = useMonthlyReports(organizationId, year, month);
  const { data: employees = [] } = useEmployees(organizationId);
  const upsertMutation = useUpsertMonthlyReport(organizationId);
  const deleteMutation = useDeleteMonthlyReport(organizationId, year, month);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const handleSave = (payload: MonthlyReportInsert) => {
    upsertMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Fiche enregistrée.");
        setModalOpen(false);
        setEditing(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const totalOvertimeHours = (r: MonthlyReport) =>
    [r.overtime_week_1, r.overtime_week_2, r.overtime_week_3, r.overtime_week_4, r.overtime_week_5].reduce<number>(
      (acc, v) => acc + (v ?? 0),
      0,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fiches mensuelles</h1>
          <p className="text-muted-foreground text-sm">Transmission des éléments variables au comptable.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une fiche
        </Button>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[160px] text-center font-medium capitalize">
          {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: fr })}
        </span>
        <Button size="icon" variant="outline" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Badge variant="outline">
          {reports.length} fiche{reports.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead className="text-right">H. supp.</TableHead>
              <TableHead className="text-right">Prime brute</TableHead>
              <TableHead className="text-right">Prime nette</TableHead>
              <TableHead className="text-right">Tickets resto</TableHead>
              <TableHead className="text-right">Acompte</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-12 text-center text-sm">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-12 text-center text-sm">
                  Aucune fiche pour {MONTHS_FR[month - 1]} {year}.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => {
                const emp = r as MonthlyReport & {
                  employee?: { id: string; firstname: string; lastname: string } | null;
                };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {emp.employee ? `${emp.employee.lastname} ${emp.employee.firstname}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {totalOvertimeHours(r) > 0 ? `${totalOvertimeHours(r)}h` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.bonus_gross ? `${r.bonus_gross} €` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.bonus_net ? `${r.bonus_net} €` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.meal_vouchers_count ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.advance_payment ? `${r.advance_payment} €` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate text-xs">
                      {r.comments ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(r);
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
                            if (!confirm("Supprimer cette fiche ?")) return;
                            deleteMutation.mutate(r.id, {
                              onSuccess: () => toast.success("Fiche supprimée."),
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

      <ReportModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        organizationId={organizationId}
        year={year}
        month={month}
        employees={employees}
        onSave={handleSave}
        pending={upsertMutation.isPending}
      />
    </div>
  );
}
