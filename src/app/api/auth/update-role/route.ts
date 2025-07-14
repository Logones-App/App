import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Vérifier si c'est un system_admin (seuls les system_admin peuvent modifier les rôles)
    const systemRole = user.app_metadata?.role || user.user_metadata?.role;
    
    if (systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Mettre à jour les métadonnées utilisateur
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { 
        role: role,
        provider: 'email',
        providers: ['email']
      },
      user_metadata: { 
        role: role,
        email_verified: true
      }
    });

    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Si c'est un system_admin, supprimer l'organisation
    if (role === 'system_admin') {
      await supabase
        .from('users_organizations')
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('deleted', false);
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        app_metadata: data.user.app_metadata,
        user_metadata: data.user.user_metadata
      }
    });

  } catch (error) {
    console.error("API Update Role - Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 