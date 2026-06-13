"use client";

import React, { useEffect, useState } from "react";

import { BookOpen, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type KnowledgeEntry = Omit<Tables<"support_knowledge_base">, "embedding">;

const CATEGORIES = [
  { value: "etablissements", label: "Établissements" },
  { value: "reservations", label: "Réservations" },
  { value: "creneaux", label: "Créneaux" },
  { value: "exceptions", label: "Exceptions" },
  { value: "planning", label: "Planning" },
  { value: "menus", label: "Menus & Produits" },
  { value: "organisation", label: "Organisation" },
  { value: "compte", label: "Compte" },
  { value: "autre", label: "Autre" },
];

function CategoryBadge({ category }: { category: string | null }) {
  const found = CATEGORIES.find((c) => c.value === category);
  return <Badge variant="secondary">{found ? found.label : (category ?? "—")}</Badge>;
}

interface NewEntryForm {
  title: string;
  content: string;
  category: string;
}

const DEFAULT_FORM: NewEntryForm = { title: "", content: "", category: "autre" };

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewEntryForm>(DEFAULT_FORM);

  async function loadEntries() {
    const supabase = createClient();
    const { data } = await supabase
      .from("support_knowledge_base")
      .select("id, title, content, category, created_at, updated_at")
      .order("created_at", { ascending: false });
    setEntries(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  async function handleAdd() {
    if (!form.title.trim() || !form.content.trim()) return;
    setIsAdding(true);
    try {
      const response = await fetch("/api/support/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        setModalOpen(false);
        setForm(DEFAULT_FORM);
        await loadEntries();
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("support_knowledge_base").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6" />
            Base de connaissances
          </h1>
          <p className="text-muted-foreground">Gérez le contenu utilisé par l&apos;assistant IA support</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle entrée
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filtres */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filtrées</span>
                  <span className="font-medium">{filtered.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste */}
        <div className="lg:col-span-3">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle>Entrées</CardTitle>
              <CardDescription>
                {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16 text-sm">
                  Aucune entrée trouvée
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-20rem)] px-6 pb-4">
                  <div className="space-y-3 pt-1">
                    {filtered.map((entry) => (
                      <div key={entry.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{entry.title}</p>
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{entry.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <CategoryBadge category={entry.category} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal ajout */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée</DialogTitle>
            <DialogDescription>
              L&apos;entrée sera automatiquement vectorisée et disponible pour l&apos;assistant IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                placeholder="Comment configurer les créneaux..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contenu</Label>
              <Textarea
                placeholder="Décrivez la procédure en détail..."
                rows={8}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={isAdding || !form.title.trim() || !form.content.trim()}>
              {isAdding ? "Génération de l'embedding..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
