import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeStore } from '@/lib/stores/realtime-store';

const supabase = createClient();

export interface Establishment {
  id: string;
  name: string;
  organization_id: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export class EstablishmentsRealtimeService {
  private channel: RealtimeChannel | null = null;
  private organizationId: string | null = null;

  constructor() {
    this.setupRealtimeConnection();
  }

  private setupRealtimeConnection() {
    const { isConnected } = useRealtimeStore.getState();
    
    if (!isConnected) {
      console.log('🔌 Realtime non connecté, établissements realtime en attente...');
      return;
    }
  }

  public subscribeToOrganizationEstablishments(
    organizationId: string,
    onUpdate: (establishments: Establishment[]) => void
  ) {
    this.organizationId = organizationId;
    
    const { isConnected } = useRealtimeStore.getState();
    
    if (!isConnected) {
      console.log('🔌 Realtime non connecté, établissements realtime en attente...');
      return;
    }

    // Se désabonner du canal précédent s'il existe
    if (this.channel) {
      this.unsubscribe();
    }

    console.log(`🔌 Abonnement realtime aux établissements de l'organisation: ${organizationId}`);

    // S'abonner aux changements sur la table establishments
    this.channel = supabase
      .channel(`establishments-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'establishments',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Établissement realtime reçu:', payload);
          
          try {
            // Récupérer la liste mise à jour des établissements
            const { data: establishments, error } = await supabase
              .from('establishments')
              .select('*')
              .eq('organization_id', organizationId)
              .eq('deleted', false)
              .order('created_at', { ascending: false });

            if (error) {
              console.error('❌ Erreur lors de la récupération des établissements:', error);
              return;
            }

            console.log('✅ Établissements mis à jour en temps réel:', establishments);
            onUpdate(establishments || []);
          } catch (error) {
            console.error('❌ Erreur lors du traitement realtime:', error);
          }
        }
      )
      .subscribe((status: any) => {
        console.log(`🔌 Statut abonnement établissements: ${status}`);
      });
  }

  public unsubscribe() {
    if (this.channel) {
      console.log('🔌 Désabonnement des établissements realtime');
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.organizationId = null;
    }
  }

  public getCurrentOrganizationId(): string | null {
    return this.organizationId;
  }

  public isSubscribed(): boolean {
    return this.channel !== null;
  }
}

// Instance singleton
export const establishmentsRealtimeService = new EstablishmentsRealtimeService(); 