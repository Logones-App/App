"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  type MenuProductPickerItem,
  type PublicMenuItemWithProduct,
  type PublicMenuSectionWithItems,
  useAddPublicMenuItem,
  useCreateSection,
  useDeleteSection,
  useMenuProductsPicker,
  useMovePublicMenuItem,
  useMoveSection,
  usePublicMenuSections,
  useRemovePublicMenuItem,
  useTogglePublicMenuItemVisibility,
  useUpdateItemNote,
  useUpdateSection,
} from "@/lib/queries/public-menu-queries";

import { AddProductCombobox } from "./public-menu-add-product-combobox";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// ─── Ligne item ───────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isFirst,
  isLast,
  isPending,
  onToggle,
  onRemove,
  onMove,
  onSaveNote,
}: {
  item: PublicMenuItemWithProduct;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  onSaveNote: (note: string | null) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note ?? "");

  const mp = item.menus_product;
  const productName = mp?.product?.name ?? "—";
  const price = mp?.price ?? null;

  const commitNote = () => {
    const trimmed = noteDraft.trim();
    onSaveNote(trimmed || null);
    setEditingNote(false);
  };

  return (
    <TableRow className={item.is_visible ? undefined : "opacity-50"}>
      <TableCell className="font-medium">
        <div className="space-y-0.5">
          <span>{productName}</span>
          {editingNote ? (
            <Input
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNote}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNote();
                if (e.key === "Escape") setEditingNote(false);
              }}
              placeholder="Note pour la carte…"
              className="h-6 text-xs"
            />
          ) : (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground block text-left text-xs"
              onClick={() => {
                setNoteDraft(item.note ?? "");
                setEditingNote(true);
              }}
            >
              {item.note ?? <span className="opacity-50">+ note</span>}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {price != null ? eur.format(price) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isFirst || isPending}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isLast || isPending}
            onClick={() => onMove("down")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isPending}
            onClick={() => onToggle(!item.is_visible)}
            title={item.is_visible ? "Masquer" : "Afficher"}
          >
            {item.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            disabled={isPending}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Carte section ─────────────────────────────────────────────────────────────

function SubSectionAdder({ onCreate, isPending }: { onCreate: (name: string) => void; isPending: boolean }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onCreate(n);
    setName("");
    setAdding(false);
  };
  if (!adding) {
    return (
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAdding(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une sous-section
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="Nom de la sous-section…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setAdding(false);
        }}
        className="h-8 flex-1"
      />
      <Button type="button" size="sm" onClick={submit} disabled={isPending || !name.trim()}>
        Créer
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
        Annuler
      </Button>
    </div>
  );
}

function SectionCard({
  section,
  isFirst,
  isLast,
  picker,
  establishmentId,
  organizationId,
  depth = 0,
  subsections = [],
}: {
  section: PublicMenuSectionWithItems;
  isFirst: boolean;
  isLast: boolean;
  picker: MenuProductPickerItem[];
  establishmentId: string;
  organizationId: string;
  depth?: number;
  subsections?: PublicMenuSectionWithItems[];
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(section.description ?? "");

  const createSection = useCreateSection(establishmentId, organizationId);
  const updateSection = useUpdateSection(establishmentId, organizationId);
  const deleteSection = useDeleteSection(establishmentId, organizationId);
  const moveSection = useMoveSection(establishmentId, organizationId);
  const addItem = useAddPublicMenuItem(establishmentId, organizationId);
  const removeItem = useRemovePublicMenuItem(establishmentId, organizationId);
  const toggleVisibility = useTogglePublicMenuItemVisibility(establishmentId, organizationId);
  const moveItem = useMovePublicMenuItem(establishmentId, organizationId);
  const updateItemNote = useUpdateItemNote(establishmentId, organizationId);

  const isPending =
    updateSection.isPending ||
    deleteSection.isPending ||
    moveSection.isPending ||
    addItem.isPending ||
    removeItem.isPending ||
    toggleVisibility.isPending ||
    moveItem.isPending ||
    updateItemNote.isPending;

  const alreadyInSection = new Set(section.items.map((i) => i.menus_product_id));

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== section.name) updateSection.mutate({ id: section.id, patch: { name: trimmed } });
    setEditingName(false);
  };

  const commitDesc = () => {
    const trimmed = descDraft.trim();
    const next = trimmed || null;
    if (next !== section.description) updateSection.mutate({ id: section.id, patch: { description: next } });
    setEditingDesc(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isFirst || isPending}
              onClick={() => moveSection.mutate({ id: section.id, direction: "up" })}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isLast || isPending}
              onClick={() => moveSection.mutate({ id: section.id, direction: "down" })}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="h-7 flex-1 text-base font-semibold"
            />
          ) : (
            <button
              type="button"
              className="flex-1 text-left text-base font-semibold hover:underline"
              onClick={() => {
                setNameDraft(section.name);
                setEditingName(true);
              }}
            >
              {section.name}
            </button>
          )}

          <Badge variant="secondary" className="shrink-0">
            {section.items.length} produit{section.items.length !== 1 ? "s" : ""}
          </Badge>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7 shrink-0"
            onClick={() => deleteSection.mutate(section.id)}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {editingDesc ? (
          <Textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={commitDesc}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingDesc(false);
            }}
            placeholder="Description de la section…"
            rows={2}
            className="mt-1 text-sm"
          />
        ) : (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-1 block w-full text-left text-sm"
            onClick={() => {
              setDescDraft(section.description ?? "");
              setEditingDesc(true);
            }}
          >
            {section.description ?? <span className="italic opacity-40">+ description de section</span>}
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {section.items.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isFirst={idx === 0}
                    isLast={idx === section.items.length - 1}
                    isPending={isPending}
                    onToggle={(v) => toggleVisibility.mutate({ id: item.id, is_visible: v })}
                    onRemove={() => removeItem.mutate(item.id)}
                    onMove={(dir) => moveItem.mutate({ id: item.id, section_id: section.id, direction: dir })}
                    onSaveNote={(note) => updateItemNote.mutate({ id: item.id, note })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <AddProductCombobox
          picker={picker}
          alreadyInSection={alreadyInSection}
          isPending={isPending}
          onAdd={(menusProductId) => addItem.mutate({ section_id: section.id, menus_product_id: menusProductId })}
        />

        {depth === 0 && (
          <div className="space-y-3 border-t pt-3">
            {subsections.map((sub, i) => (
              <SectionCard
                key={sub.id}
                section={sub}
                depth={1}
                isFirst={i === 0}
                isLast={i === subsections.length - 1}
                picker={picker}
                establishmentId={establishmentId}
                organizationId={organizationId}
              />
            ))}
            <SubSectionAdder
              isPending={createSection.isPending}
              onCreate={(name) => createSection.mutate({ name, parentId: section.id })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PublicMenuEditorShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const { data: sections = [], isLoading } = usePublicMenuSections(establishmentId, organizationId);
  const { data: picker = [] } = useMenuProductsPicker(establishmentId, organizationId);
  const createSection = useCreateSection(establishmentId, organizationId);

  const handleCreateSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    createSection.mutate(
      { name },
      {
        onSuccess: () => {
          setNewSectionName("");
          setAddingSection(false);
        },
      },
    );
  };

  const topSections = sections.filter((s) => s.parent_id == null);
  const childrenOf = (id: string) => sections.filter((s) => s.parent_id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Carte publique</h2>
          <p className="text-muted-foreground text-sm">
            Organisez les sections et produits affichés sur votre carte en ligne.
          </p>
        </div>
        {!addingSection && (
          <Button type="button" variant="outline" onClick={() => setAddingSection(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une section
          </Button>
        )}
      </div>

      {addingSection && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="Nom de la section…"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSection();
                  if (e.key === "Escape") setAddingSection(false);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleCreateSection}
                disabled={createSection.isPending || !newSectionName.trim()}
              >
                Créer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAddingSection(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 p-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      )}

      {!isLoading && sections.length === 0 && !addingSection && (
        <p className="text-muted-foreground text-sm">
          Aucune section. Cliquez sur &quot;Ajouter une section&quot; pour commencer.
        </p>
      )}

      {topSections.map((section, idx) => (
        <SectionCard
          key={section.id}
          section={section}
          depth={0}
          subsections={childrenOf(section.id)}
          isFirst={idx === 0}
          isLast={idx === topSections.length - 1}
          picker={picker}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}
