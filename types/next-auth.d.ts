import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: string
      departmentName?: string | null
    } & DefaultSession['user']
  }
  interface User {
    role?: string
    departmentName?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    departmentName?: string | null
  }
}
