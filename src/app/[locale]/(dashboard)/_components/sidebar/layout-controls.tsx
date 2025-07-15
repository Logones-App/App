"use client";

import { Settings, Grid, List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function LayoutControls() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Layout controls</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <PanelLeftOpen className="mr-2 h-4 w-4" />
          <span>Paramètres de layout</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Grid className="mr-2 h-4 w-4" />
          <span>Vue grille</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <List className="mr-2 h-4 w-4" />
          <span>Vue liste</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
