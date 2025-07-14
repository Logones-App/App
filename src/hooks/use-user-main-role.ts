import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type UserMainRole = 'system_admin' | 'org_admin' | null;

interface RoleData {
  role: UserMainRole;
  organizationId?: string | null;
  organization?: any;
}

export function useUserMainRole() {
  const [role, setRole] = useState<UserMainRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        
        // Récupérer l'utilisateur actuel
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // TEST: Essayer de lire directement côté client sans .single()
        console.log('TEST: Tentative de lecture directe côté client...');
        
        // Test 1: Lecture des rôles system_admin
        const { data: systemRoles, error: systemError } = await supabase
          .from('users_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'system_admin');

        console.log('TEST - System roles:', { systemRoles, systemError });

        if (systemRoles && systemRoles.length > 0) {
          console.log('TEST: System admin trouvé côté client!');
          setRole('system_admin');
          setLoading(false);
          return;
        }

        // Test 2: Lecture des organisations
        const { data: orgRoles, error: orgError } = await supabase
          .from('users_organizations')
          .select(`
            organization_id,
            organizations (*)
          `)
          .eq('user_id', user.id)
          .eq('deleted', false);

        console.log('TEST - Org roles:', { orgRoles, orgError });

        if (orgRoles && orgRoles.length > 0) {
          console.log('TEST: Org admin trouvé côté client!');
          setRole('org_admin');
          setLoading(false);
          return;
        }

        // Si rien trouvé côté client, utiliser l'API comme fallback
        console.log('TEST: Rien trouvé côté client, utilisation de l\'API...');
        
        const response = await fetch('/api/auth/roles');
        if (response.ok) {
          const data: RoleData = await response.json();
          setRole(data.role);
        } else {
          setError('Failed to fetch role');
        }

      } catch (err) {
        console.error('TEST - Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { role, loading, error };
} 