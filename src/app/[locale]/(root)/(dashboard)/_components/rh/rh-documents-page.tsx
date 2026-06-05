"use client";

import { useRef, useState } from "react";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/lib/queries/employees-queries";
import {
  type EmployeeDocumentInsert,
  useDeleteEmployeeDocument,
  useDocumentSignedUrl,
  useEmployeeDocuments,
  useUploadEmployeeDocument,
} from "@/lib/queries/rh-documents-queries";
import { cn } from "@/lib/utils";

const DOC_LABELS: Record<string, string> = {
  employment_contract: "Contrat de travail",
  dpae: "DPAE",
  sick_leave_certificate: "Arrêt maladie",
  expense_receipt: "Justificatif frais",
  transport_receipt: "Justificatif transport",
  id_document: "Pièce d'identité",
  work_permit: "Titre de travail",
  other: "Autre",
};

const DOC_COLORS: Record<string, string> = {
  employment_contract: "bg-blue-100 text-blue-800 border-blue-200",
  dpae: "bg-purple-100 text-purple-800 border-purple-200",
  sick_leave_certificate: "bg-red-100 text-red-800 border-red-200",
  expense_receipt: "bg-orange-100 text-orange-800 border-orange-200",
  transport_receipt: "bg-teal-100 text-teal-800 border-teal-200",
  id_document: "bg-gray-100 text-gray-800 border-gray-200",
  work_permit: "bg-amber-100 text-amber-800 border-amber-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
};

function UploadModal({
  open,
  onOpenChange,
  organizationId,
  employees,
  onUpload,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId: string;
  employees: { id: string; firstname: string; lastname: string }[];
  onUpload: (file: File, meta: Omit<EmployeeDocumentInsert, "file_path">) => void;
  pending: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [docType, setDocType] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const valid = employeeId && docType && file;

  const handleSubmit = () => {
    if (!file || !valid) return;
    onUpload(file, {
      organization_id: organizationId,
      employee_id: employeeId,
      document_type: docType,
      issued_at: issuedAt || null,
      expires_at: expiresAt || null,
      notes: notes || null,
      deleted: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Employé <span className="text-destructive">*</span>
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
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
              Type de document <span className="text-destructive">*</span>
            </Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date du document</Label>
              <Input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date d&apos;expiration</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionnel"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Fichier <span className="text-destructive">*</span>
            </Label>
            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                file ? "border-primary bg-primary/5" : "hover:border-primary/50",
              )}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="text-primary h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="mx-auto mb-1 h-6 w-6" />
                  Cliquer pour sélectionner un fichier
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !valid}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Téléverser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RhDocumentsPage({ organizationId }: { organizationId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: allDocs = [], isLoading } = useEmployeeDocuments(organizationId);
  const { data: employees = [] } = useEmployees(organizationId);
  const uploadMutation = useUploadEmployeeDocument(organizationId);
  const deleteMutation = useDeleteEmployeeDocument(organizationId);
  const signedUrlMutation = useDocumentSignedUrl();

  const docs = allDocs.filter((d) => {
    if (filterEmployee !== "all" && d.employee_id !== filterEmployee) return false;
    if (filterType !== "all" && d.document_type !== filterType) return false;
    return true;
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const url = await signedUrlMutation.mutateAsync(filePath);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Impossible d'ouvrir le document.");
    }
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documents RH</h1>
          <p className="text-muted-foreground text-sm">Contrats, DPAE, arrêts maladie et justificatifs.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Ajouter un document
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
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(DOC_LABELS).map(([k, v]) => (
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
              <TableHead>Fichier</TableHead>
              <TableHead>Date doc.</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Notes</TableHead>
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
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
                  Aucun document.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d) => {
                const emp = (d as typeof d & { employee?: { id: string; firstname: string; lastname: string } | null })
                  .employee;
                const fileName = d.file_path.split("/").pop() ?? d.file_path;
                const expired = isExpired(d.expires_at);
                const expiring = isExpiringSoon(d.expires_at);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{emp ? `${emp.lastname} ${emp.firstname}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", DOC_COLORS[d.document_type])}>
                        {DOC_LABELS[d.document_type] ?? d.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-primary flex max-w-[160px] items-center gap-1.5 truncate text-sm hover:underline"
                        onClick={() => handleDownload(d.file_path, fileName)}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        {fileName}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.issued_at ? format(new Date(d.issued_at), "d MMM yyyy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.expires_at ? (
                        <span
                          className={cn(
                            expired && "text-destructive font-medium",
                            expiring && "font-medium text-amber-600",
                          )}
                        >
                          {format(new Date(d.expires_at), "d MMM yyyy", { locale: fr })}
                          {expired && " ⚠️"}
                          {expiring && " ⏰"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[140px] truncate text-xs">
                      {d.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Télécharger"
                          onClick={() => handleDownload(d.file_path, fileName)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 w-7"
                          onClick={() => {
                            if (!confirm("Supprimer ce document ?")) return;
                            deleteMutation.mutate(d.id, {
                              onSuccess: () => toast.success("Document supprimé."),
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

      <UploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={organizationId}
        employees={employees}
        onUpload={(file, meta) => {
          uploadMutation.mutate(
            { file, meta },
            {
              onSuccess: () => {
                toast.success("Document ajouté.");
                setModalOpen(false);
              },
              onError: (e) => toast.error(e.message),
            },
          );
        }}
        pending={uploadMutation.isPending}
      />
    </div>
  );
}
