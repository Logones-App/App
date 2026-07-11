"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { LocalizedContent } from "@/lib/i18n/localized";
import { useEstablishmentMenus } from "@/lib/queries/establishments-menu-queries";
import {
  type MenuProductPickerItem,
  type PublicMenuSectionWithItems,
  useAddPublicMenuItem,
  useCardLocales,
  useCreateSection,
  useDeleteSection,
  useMenuProductsPicker,
  useMovePublicMenuItem,
  useMoveSection,
  useMoveSectionToCard,
  usePublicMenuSections,
  useRemovePublicMenuItem,
  useTogglePublicMenuItemVisibility,
  useUpdateItemNote,
  useUpdateItemTranslations,
  useUpdateProductTranslations,
  useUpdateSection,
} from "@/lib/queries/public-menu-queries";

import { AddProductCombobox } from "./public-menu-add-product-combobox";
import { ItemRow } from "./public-menu-item-row";
import { CardLocalesControl } from "./public-menu-locales-control";
import { TranslationsButton } from "./public-menu-translations-dialog";

/** Valeur du sélecteur de carte pour les sections communes (menu_id NULL). */
const COMMON = "__common__";

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
  locales,
  menus,
  depth = 0,
  subsections = [],
}: {
  section: PublicMenuSectionWithItems;
  isFirst: boolean;
  isLast: boolean;
  picker: MenuProductPickerItem[];
  establishmentId: string;
  organizationId: string;
  locales: string[];
  menus: { id: string; name: string | null }[];
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
  const moveSectionToCard = useMoveSectionToCard(establishmentId, organizationId);
  const addItem = useAddPublicMenuItem(establishmentId, organizationId);
  const removeItem = useRemovePublicMenuItem(establishmentId, organizationId);
  const toggleVisibility = useTogglePublicMenuItemVisibility(establishmentId, organizationId);
  const moveItem = useMovePublicMenuItem(establishmentId, organizationId);
  const updateItemNote = useUpdateItemNote(establishmentId, organizationId);
  const updateItemTranslations = useUpdateItemTranslations(establishmentId, organizationId);
  const updateProductTranslations = useUpdateProductTranslations(establishmentId, organizationId);

  const isPending = [
    updateSection,
    deleteSection,
    moveSection,
    moveSectionToCard,
    addItem,
    removeItem,
    toggleVisibility,
    moveItem,
    updateItemNote,
    updateItemTranslations,
    updateProductTranslations,
  ].some((m) => m.isPending);

  const saveSectionTranslations = (next: LocalizedContent) =>
    updateSection.mutate({ id: section.id, patch: { translations: next } });

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

          <TranslationsButton
            title={section.name}
            triggerTitle="Traduire la section"
            locales={locales}
            groups={[
              {
                translations: section.translations,
                onSave: saveSectionTranslations,
                fields: [
                  { key: "name", label: "Nom de la section", base: section.name },
                  { key: "description", label: "Description", base: section.description, multiline: true },
                ],
              },
            ]}
            isPending={isPending}
          />

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

        {depth === 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Carte :</span>
            <Select
              value={section.menu_id ?? COMMON}
              onValueChange={(v) =>
                moveSectionToCard.mutate({ sectionId: section.id, menuId: v === COMMON ? null : v })
              }
            >
              <SelectTrigger className="h-7 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMMON}>Communes (toutes les cartes)</SelectItem>
                {menus.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? "Menu"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    locales={locales}
                    sectionMenuId={section.menu_id}
                    onToggle={(v) => toggleVisibility.mutate({ id: item.id, is_visible: v })}
                    onRemove={() => removeItem.mutate(item.id)}
                    onMove={(dir) => moveItem.mutate({ id: item.id, section_id: section.id, direction: dir })}
                    onSaveNote={(note) => updateItemNote.mutate({ id: item.id, note })}
                    onSaveTranslations={(t) => updateItemTranslations.mutate({ id: item.id, translations: t })}
                    onSaveProductTranslations={(t) => {
                      const pid = item.menus_product?.product?.id;
                      if (pid) updateProductTranslations.mutate({ productId: pid, translations: t });
                    }}
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
                locales={locales}
                menus={menus}
              />
            ))}
            <SubSectionAdder
              isPending={createSection.isPending}
              onCreate={(name) => createSection.mutate({ name, parentId: section.id, menuId: section.menu_id })}
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
  const { data: locales = ["fr"] } = useCardLocales(establishmentId);
  const { data: menus = [] } = useEstablishmentMenus(establishmentId, organizationId);
  const createSection = useCreateSection(establishmentId, organizationId);

  const [scope, setScope] = useState<string>(COMMON);
  const scopeMenuId = scope === COMMON ? null : scope;
  const scopedPicker = scopeMenuId ? picker.filter((p) => p.menuId === scopeMenuId) : picker;

  const handleCreateSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    createSection.mutate(
      { name, menuId: scopeMenuId },
      {
        onSuccess: () => {
          setNewSectionName("");
          setAddingSection(false);
        },
      },
    );
  };

  const topSections = sections.filter((s) => s.parent_id == null && (s.menu_id ?? null) === scopeMenuId);
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

      <CardLocalesControl establishmentId={establishmentId} locales={locales} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Carte :</span>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={COMMON}>Communes (toutes les cartes)</SelectItem>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ?? "Menu"}
                {m.is_public ? "" : " · privé"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">
          {scopeMenuId ? "Sections propres à cette carte." : "Sections affichées sur toutes les cartes."}
        </span>
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

      {!isLoading && topSections.length === 0 && !addingSection && (
        <p className="text-muted-foreground text-sm">
          {scopeMenuId ? "Aucune section pour cette carte." : "Aucune section commune."} Cliquez sur « Ajouter une
          section » pour commencer.
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
          picker={scopedPicker}
          establishmentId={establishmentId}
          organizationId={organizationId}
          locales={locales}
          menus={menus}
        />
      ))}
    </div>
  );
}
