import { create } from 'zustand';
import { Tables } from '@/lib/supabase/database.types';

type Organization = Tables<'organizations'>;

interface WorkspaceState {
  selectedOrganization: Organization | null;
  setSelectedOrganization: (org: Organization | null) => void;
  clearSelectedOrganization: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedOrganization: null,
  setSelectedOrganization: (org) => set({ selectedOrganization: org }),
  clearSelectedOrganization: () => set({ selectedOrganization: null }),
})); 