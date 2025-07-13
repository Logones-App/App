import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

interface AuthState {
  // État
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Multi-tenant
  currentOrganization: Organization | null;
  userRole: 'system_admin' | 'org_admin' | null;
  availableOrganizations: Organization[];

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentOrganization: (organization: Organization | null) => void;
  setUserRole: (role: 'system_admin' | 'org_admin' | null) => void;
  setAvailableOrganizations: (organizations: Organization[]) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // État initial
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      
      // Multi-tenant
      currentOrganization: null,
      userRole: null,
      availableOrganizations: [],

      // Actions
      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setSession: (session: Session | null) => set({ session }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setCurrentOrganization: (organization: Organization | null) => 
        set({ currentOrganization: organization }),

      setUserRole: (role: 'system_admin' | 'org_admin' | null) => 
        set({ userRole: role }),

      setAvailableOrganizations: (organizations: Organization[]) => 
        set({ availableOrganizations: organizations }),

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          currentOrganization: null,
          userRole: null,
          availableOrganizations: [],
        }),

      reset: () =>
        set({
          user: null,
          session: null,
          isLoading: true,
          isAuthenticated: false,
          currentOrganization: null,
          userRole: null,
          availableOrganizations: [],
        }),
    }),
    {
      name: 'auth-store',
    }
  )
); 