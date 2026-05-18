import { create } from "zustand";

// Store sans persist pour éviter les problèmes d'hydratation Next.js
// La persistance est gérée manuellement via localStorage dans AppSidebar

type CurrentEstablishmentStore = {
  establishmentId: string | null;
  establishmentName: string | null;
  setEstablishment: (id: string, name: string) => void;
  clearEstablishment: () => void;
};

export const useCurrentEstablishmentStore = create<CurrentEstablishmentStore>()((set) => ({
  establishmentId: null,
  establishmentName: null,
  setEstablishment: (id, name) => set({ establishmentId: id, establishmentName: name }),
  clearEstablishment: () => set({ establishmentId: null, establishmentName: null }),
}));
