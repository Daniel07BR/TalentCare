import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TalentCare — Itamarathy',
  description: 'Administração de usuários',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
