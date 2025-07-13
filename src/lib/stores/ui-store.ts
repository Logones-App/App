import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Modals
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>;

  // Actions
  setLoginModalOpen: (open: boolean) => void;
  setRegisterModalOpen: (open: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // État initial
      isLoginModalOpen: false,
      isRegisterModalOpen: false,
      isLoading: false,
      loadingMessage: '',
      notifications: [],

      // Actions
      setLoginModalOpen: (open: boolean) => set({ isLoginModalOpen: open }),
      setRegisterModalOpen: (open: boolean) => set({ isRegisterModalOpen: open }),
      
      setLoading: (loading: boolean, message = '') => 
        set({ isLoading: loading, loadingMessage: message }),
      
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id }]
        }));
      },
      
      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-store',
    }
  )
); 