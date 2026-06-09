'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <span className="logout" onClick={() => signOut({ callbackUrl: '/login' })}>
      Sair
    </span>
  )
}
