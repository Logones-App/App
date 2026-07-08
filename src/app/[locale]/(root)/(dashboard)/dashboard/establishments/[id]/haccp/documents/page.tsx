"use client";

import { useState } from "react";

import { useParams } from "next/navigation";

import { ExternalLink, Loader2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import {
  type DocType,
  type HaccpDocument,
  getHaccpDocumentUrl,
  useDeleteHaccpDocument,
  useHaccpDocuments,
  useUpsertHaccpDocument,
} from "@/lib/queries/haccp-config-queries";

const CATS: { value: DocType; label: string }[] = [
  { value: "plan", label: "Plans" },
  { value: "procedure", label: "Procédures" },
  { value: "registre", label: "Registres" },
];
const catLabel = (t: string) => CATS.find((c) => c.value === t)?.label ?? t;

function DocModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: HaccpDocument | null;
  busy: boolean;
  onClose: () => void;
  onSave: (v: { title: string; doc_type: DocType; version: string; file: File | null }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [docType, setDocType] = useState<DocType>((initial?.doc_type ?? "procedure") as DocType);
  const [version, setVersion] = useState(initial?.version ?? "");
  const [file, setFile] = useState<File | null>(null);

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le document" : "Nouveau document"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Plan de Maîtrise Sanitaire"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="procedure">Procédure</SelectItem>
                  <SelectItem value="registre">Registre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Fichier <span className="text-muted-foreground text-xs font-normal">(PDF, image…)</span>
            </Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {initial?.url && !file && <p className="text-muted-foreground text-xs">Un fichier est déjà joint.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={() => onSave({ title: title.trim(), doc_type: docType, version, file })}
            disabled={busy || !title.trim()}
          >
            {busy ? "Enregistrement…" : initial ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocRow({
  doc,
  onEdit,
  onDelete,
  deleting,
}: {
  doc: HaccpDocument;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const open = async () => {
    if (!doc.url) return;
    const signed = await getHaccpDocumentUrl(doc.url);
    if (signed) window.open(signed, "_blank");
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="text-muted-foreground text-xs">{doc.version ? `Version ${doc.version}` : "—"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {doc.url && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={open} aria-label="Ouvrir le fichier">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        {doc.url && <Paperclip className="text-muted-foreground mr-1 h-3.5 w-3.5" />}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive h-7 w-7"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function HaccpDocumentsPage() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId();

  const { data: docs = [], isLoading } = useHaccpDocuments(establishmentId);
  const upsert = useUpsertHaccpDocument(establishmentId, organizationId ?? "");
  const del = useDeleteHaccpDocument(establishmentId);

  const [modal, setModal] = useState<{ open: boolean; editing: HaccpDocument | null }>({ open: false, editing: null });

  if (!organizationId) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  const handleSave = (v: { title: string; doc_type: DocType; version: string; file: File | null }) => {
    upsert.mutate({ id: modal.editing?.id, ...v }, { onSuccess: () => setModal({ open: false, editing: null }) });
  };

  const handleDelete = (d: HaccpDocument) => {
    if (!confirm(`Supprimer « ${d.title} » ?`)) return;
    del.mutate(d.id);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm">
            Bibliothèque documentaire de l&apos;établissement (plans, procédures, registres).
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucun document — ajoutez-en un.
        </p>
      ) : (
        <div className="space-y-6">
          {CATS.map((cat) => {
            const list = docs.filter((d) => d.doc_type === cat.value);
            if (list.length === 0) return null;
            return (
              <Card key={cat.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {catLabel(cat.value)}
                    <Badge variant="secondary" className="text-xs">
                      {list.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map((d) => (
                    <DocRow
                      key={d.id}
                      doc={d}
                      deleting={del.isPending}
                      onEdit={() => setModal({ open: true, editing: d })}
                      onDelete={() => handleDelete(d)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modal.open && (
        <DocModal
          initial={modal.editing}
          busy={upsert.isPending}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
