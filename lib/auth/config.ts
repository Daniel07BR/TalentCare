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
