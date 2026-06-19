import NextAuth from 'next-auth'
import { baseAuthConfig } from '@/lib/auth/base.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(baseAuthConfig)

// /api/integrations/* é server-to-server (auth por chave própria, não por sessão).
const PUBLIC_ROUTES = ['/login', '/acesso-negado', '/sso', '/api/auth', '/api/integrations']

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as { role?: string } | undefined)?.role

  if (isPublic(pathname)) return NextResponse.next()

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sem papel de acesso → barrado (existe só p/ aparecer na lista).
  if (role === 'SEM_PERMISSAO') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/acesso-negado', req.url))
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
