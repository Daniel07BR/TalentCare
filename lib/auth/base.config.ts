import type { NextAuthConfig } from 'next-auth'

// Config edge-safe (sem bcrypt/Prisma): usada pelo proxy/middleware só p/ ler o JWT.
export const baseAuthConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.departmentName = (user as { departmentName?: string | null }).departmentName ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        ;(session.user as { role?: unknown }).role = token.role
        ;(session.user as { departmentName?: unknown }).departmentName = token.departmentName ?? null
      }
      return session
    },
  },
}
