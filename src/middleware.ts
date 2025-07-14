import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPages = ['/test-auth', '/auth/v1/login', '/auth/v1/register'];
  const isPublicPage = publicPages.some(page => request.nextUrl.pathname.startsWith(page));
  
  // Si c'est une page publique, laisser passer
  if (isPublicPage) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set(name, '', options)
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("Middleware - User:", user?.email, "Path:", request.nextUrl.pathname);

  // If there's no user and the user is not on the auth pages, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/v1/login'
    return NextResponse.redirect(redirectUrl)
  }

  // If there's a user and the user is on the auth pages, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Gestion des rôles et URLs multi-tenant
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const pathname = request.nextUrl.pathname;
    console.log("Middleware - Checking roles for user:", user.email);
    
    // Vérifier si c'est un system_admin via les métadonnées
    const systemRole = user.app_metadata?.role || user.user_metadata?.role;
    
    if (systemRole === 'system_admin') {
      console.log("Middleware - User is system_admin (from metadata)");
      // System admin peut accéder à /dashboard et /dashboard/org/[id]
      if (pathname === '/dashboard' || pathname === '/dashboard/default') {
        // Vue globale pour system admin
        return supabaseResponse;
      } else if (pathname.startsWith('/dashboard/org/')) {
        // Vue d'une organisation spécifique pour system admin
        return supabaseResponse;
      }
    } else {
      console.log("Middleware - User is not system_admin, checking org_admin");
      // Vérifier si c'est un org_admin
      const { data: orgRole, error: orgError } = await supabase
        .from('users_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .single();

      console.log("Middleware - Org admin check:", { orgRole, orgError });

      if (orgRole) {
        console.log("Middleware - User is org_admin");
        // Org admin peut accéder à /dashboard et ses sous-routes
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
          return supabaseResponse;
        }
      } else {
        console.log("Middleware - User has no role, redirecting to unauthorized");
      }
    }

    // Si aucun rôle trouvé, rediriger vers unauthorized
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/unauthorized';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
