import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Vérifier si c'est un system_admin
    const { data: systemAdminRole, error: systemError } = await supabase
      .from('users_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'system_admin')
      .single();

    if (systemAdminRole) {
      return NextResponse.json({ 
        role: 'system_admin', 
        organizationId: null 
      });
    }

    // Vérifier si c'est un org_admin
    const { data: orgRole, error: orgError } = await supabase
      .from('users_organizations')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('user_id', user.id)
      .eq('deleted', false)
      .single();

    if (orgRole) {
      return NextResponse.json({ 
        role: 'org_admin', 
        organizationId: orgRole.organization_id,
        organization: orgRole.organizations
      });
    }
    return NextResponse.json({ role: null });

  } catch (error) {
    console.error("API Roles - Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 