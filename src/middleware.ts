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
