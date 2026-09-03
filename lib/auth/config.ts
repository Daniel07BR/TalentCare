import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { baseAuthConfig } from './base.config'

function verifySsoHmac(uid: string, ts: string, sig: string): boolean {
  const secret = process.env.AUTH_SECRET
  if (!secret) return false
  const age = Date.now() - parseInt(ts, 10)
  if (isNaN(age) || age < 0 || age > 60_000) return false
  const expected = crypto.createHmac('sha256', secret).update(`${uid}:${ts}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...baseAuthConfig,
  callbacks: {
    ...baseAuthConfig.callbacks,
    /**
     * ⚠️⚠️ O PAPEL SE RENOVA. Antes ele era gravado no token só no login
     * (`if (user)`) e ficava lá pelos 30 dias da sessão — o que quer dizer que
     * uma mudança de acesso **não valia até o próximo login**, nos dois sentidos:
     *
     *  - promover alguém não abria nada (foi o que aconteceu no ensaio de
     *    03/09/2026: a Joice virou `GESTOR` no banco e continuou levando
     *    "acesso negado", porque o cookie dela ainda dizia `SEM_PERMISSAO`);
     *  - e, pior, **revogar não fechava**. O comentário de `resolveRole` diz que
     *    `GESTOR` é recalculado a cada sync justamente para quem sai da chefia
     *    perder a porta — e o token desfazia isso por até um mês.
     *
     * ⚠️ Relê do banco no máximo a cada 5 minutos (`checadoEm`), não a cada
     * requisição: seriam duas consultas por página só para conferir um campo que
     * muda uma vez por semestre. Cinco minutos é o atraso máximo de uma
     * revogação — e a régua de CONTEÚDO (`lib/alcance.ts`) não depende do token,
     * ela lê o banco na hora.
     */
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.departmentName = (user as { departmentName?: string | null }).departmentName ?? null
        token.checadoEm = Date.now()
        return token
      }
      const idade = Date.now() - (Number(token.checadoEm) || 0)
      if (idade < 5 * 60_000) return token
      const atual = await prisma.user.findUnique({
        where: { id: token.sub! },
        select: { role: true, active: true, department: { select: { name: true } } },
      })
      // Sumiu do banco ou foi desligado → o token perde o papel na hora.
      token.role = atual && atual.active ? atual.role : 'SEM_PERMISSAO'
      token.departmentName = atual?.department?.name ?? null
      token.checadoEm = Date.now()
      return token
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const login = (credentials.email as string).trim()
        const password = credentials.password as string

        // SSO HMAC handoff: email = "__sso__", password = "uid:ts:sig"
        if (login === '__sso__') {
          const parts = password.split(':')
          if (parts.length < 3) return null
          const [uid, ts, ...rest] = parts
          const sig = rest.join(':')
          if (!verifySsoHmac(uid, ts, sig)) return null
          const user = await prisma.user.findUnique({
            where: { id: uid },
            include: { department: { select: { name: true } } },
          })
          if (!user || !user.active) return null
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentName: user.department?.name ?? null,
          }
        }

        // Login local: e-mail completo, prefixo do e-mail, nome, conta de domínio ou windows.
        const byEmail = await prisma.user.findUnique({
          where: { email: login.toLowerCase() },
          include: { department: { select: { name: true } } },
        })
        const user =
          byEmail ??
          (!login.includes('@')
            ? await prisma.user.findFirst({
                where: { email: { startsWith: login.toLowerCase() + '@' } },
                include: { department: { select: { name: true } } },
              })
            : null) ??
          (await prisma.user.findFirst({
            where: { name: login },
            include: { department: { select: { name: true } } },
          })) ??
          (await prisma.user.findFirst({
            where: { domainAccount: { equals: login, mode: 'insensitive' } },
            include: { department: { select: { name: true } } },
          })) ??
          (await prisma.user.findFirst({
            where: { windowsUser: { equals: login, mode: 'insensitive' } },
            include: { department: { select: { name: true } } },
          }))

        if (!user || !user.active) return null
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentName: user.department?.name ?? null,
        }
      },
    }),
  ],
})
