import { createClient } from '@/lib/supabase/server';

export interface ServerUser {
  id: string;
  email: string;
  role: string | null;
  user_metadata: any;
  app_metadata: any;
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const supabase = await createClient();
    
    // Récupère l'utilisateur depuis les cookies
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Récupère le rôle depuis les metadata
    const role = user.user_metadata?.role || user.app_metadata?.role || null;

    return {
      id: user.id,
      email: user.email || '',
      role,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur côté serveur:', error);
    return null;
  }
}

export async function getServerUserRole(): Promise<string | null> {
  const user = await getServerUser();
  return user?.role || null;
} 