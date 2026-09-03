import NextAuth from 'next-auth'
import { baseAuthConfig } from '@/lib/auth/base.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(baseAuthConfig)

// /api/integrations/* é server-to-server (auth por chave própria, não por sessão).
const PUBLIC_ROUTES = ['/login', '/acesso-negado', '/sso', '/api/auth', '/api/integrations']

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/**
 * Tudo o que um COLABORADOR alcança. Lista FECHADA (o que não está aqui é
 * negado), e não uma lista de proibições: lista de proibições esquece a rota
 * nova, e a rota nova nasce aberta.
 */
const COLABORADOR_OK = [
  '/meu-setor', // resolve e redireciona; para o colaborador vai à página dele
  '/minha-avaliacao',
  '/api/minha-avaliacao',
  '/acesso-negado',
  '/api/avatar',
]

function alcanceDoColaborador(pathname: string): boolean {
  if (COLABORADOR_OK.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  // A ciência da PRÓPRIA avaliação — a rota confere no servidor que o id é o
  // dele. Sem isto o botão "Li e estou ciente" responderia 403.
  if (/^\/api\/avaliacoes\/[^/]+\/ciencia$/.test(pathname)) return true
  return false
}

/** Áreas de administração do sistema. */
const SO_ADMIN = [
  '/avaliadores', '/api/avaliadores',
  '/usuarios', '/equipe', '/escolaridade', '/ponto', '/configuracoes',
  '/api/admin',
]

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

  /*
   * ⚠️⚠️ A PORTA GROSSA. Aqui se decide QUE CAMINHOS a pessoa alcança, e só isso.
   * O middleware roda sem banco (é edge), então ele só conhece o papel que veio
   * no token — não sabe quem avalia quem. Quem decide QUE DADOS aparecem é a
   * régua fina de `lib/avaliacoes/regua.ts`, consultada nas rotas.
   *
   * ⚠️ São duas réguas de propósito, e as duas precisam existir: confiar só na
   * porta deixaria um gestor puxar a ficha de qualquer um por URL; confiar só na
   * régua deixaria um colaborador abrir o painel da empresa e ver os agregados.
   *
   * O `matcher` cobre `/api/*` também, então esta lista protege página E rota.
   */
  if (role === 'COLABORADOR' && !alcanceDoColaborador(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/minha-avaliacao', req.url))
  }

  // Administração é só de quem administra. GESTOR entra no painel e na fila do
  // setor dele, mas não define quem avalia nem mexe em usuário.
  if (role !== 'ADMIN' && SO_ADMIN.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/avaliacoes', req.url))
  }

  /*
   * ⚠️⚠️ O DASHBOARD É DA DIRETORIA. Ele mostra a empresa inteira — score médio,
   * ranking, turnover, atividade de todos os setores. Gestor e sub-encarregado
   * caem no setor DELES (decisão do dono, 03/09/2026); `/meu-setor` resolve qual
   * é, porque aqui não há banco para perguntar.
   */
  if (role !== 'ADMIN' && (pathname === '/' || pathname === '/dashboard' || pathname === '/login')) {
    return NextResponse.redirect(new URL(role === 'COLABORADOR' ? '/minha-avaliacao' : '/meu-setor', req.url))
  }
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
