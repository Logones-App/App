"use client";

import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implémenter la logique de recherche
    console.log("Recherche:", searchQuery);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
          <span className="sr-only">Rechercher</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recherche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher dans l'application..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Rechercher</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
