import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { realtimeService, type RealtimeMessage, type RealtimeSubscription } from '@/lib/services/realtimeService';

interface RealtimeState {
  // État de connexion
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Messages et notifications
  messages: RealtimeMessage[];
  notifications: RealtimeMessage[];
  unreadCount: number;
  
  // Abonnements actifs
  subscriptions: RealtimeSubscription[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  addMessage: (message: RealtimeMessage) => void;
  addNotification: (message: RealtimeMessage) => void;
  markAsRead: (messageId: string) => void;
  markAllAsRead: () => void;
  clearMessages: () => void;
  clearNotifications: () => void;
  addSubscription: (subscription: RealtimeSubscription) => void;
  removeSubscription: (subscriptionId: string) => void;
  setConnectionStatus: (status: RealtimeState['connectionStatus']) => void;
}

export const useRealtimeStore = create<RealtimeState>()(
  devtools(
    (set, get) => ({
      // État initial
      isConnected: false,
      connectionStatus: 'disconnected',
      messages: [],
      notifications: [],
      unreadCount: 0,
      subscriptions: [],

      // Actions
      connect: async () => {
        const state = get();
        if (state.isConnected || state.connectionStatus === 'connecting') {
          console.log("🔌 Déjà connecté ou en cours de connexion");
          return;
        }

        console.log("🔌 Tentative de connexion realtime...");
        set({ connectionStatus: 'connecting' });
        
        try {
          // Ajouter un gestionnaire de messages global
          realtimeService.addMessageHandler('global', (message) => {
            console.log("📨 Message realtime reçu:", message);
            get().addMessage(message);
            
            if (message.type === 'notification') {
              get().addNotification(message);
            }
          });

          console.log("✅ Connexion realtime établie");
          set({ 
            isConnected: true, 
            connectionStatus: 'connected' 
          });
        } catch (error) {
          console.error('❌ Erreur de connexion realtime:', error);
          set({ 
            isConnected: false, 
            connectionStatus: 'error' 
          });
        }
      },

      disconnect: () => {
        const state = get();
        if (!state.isConnected) {
          console.log("🔌 Déjà déconnecté");
          return;
        }

        console.log("🔌 Déconnexion realtime...");
        realtimeService.unsubscribeAll();
        realtimeService.removeMessageHandler('global');
        
        set({
          isConnected: false,
          connectionStatus: 'disconnected',
          subscriptions: []
        });
      },

      addMessage: (message: RealtimeMessage) => {
        set((state) => ({
          messages: [message, ...state.messages.slice(0, 99)] // Garder les 100 derniers messages
        }));
      },

      addNotification: (message: RealtimeMessage) => {
        set((state) => ({
          notifications: [message, ...state.notifications.slice(0, 49)], // Garder les 50 dernières notifications
          unreadCount: state.unreadCount + 1
        }));
      },

      markAsRead: (messageId: string) => {
        set((state) => ({
          notifications: state.notifications.map(notification => 
            notification.id === messageId 
              ? { ...notification, read: true }
              : notification
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            read: true
          })),
          unreadCount: 0
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      addSubscription: (subscription: RealtimeSubscription) => {
        set((state) => ({
          subscriptions: [...state.subscriptions, subscription]
        }));
      },

      removeSubscription: (subscriptionId: string) => {
        realtimeService.unsubscribe(subscriptionId);
        
        set((state) => ({
          subscriptions: state.subscriptions.filter(sub => sub.id !== subscriptionId)
        }));
      },

      setConnectionStatus: (status: RealtimeState['connectionStatus']) => {
        set({ connectionStatus: status });
      },
    }),
    {
      name: 'realtime-store',
    }
  )
); 