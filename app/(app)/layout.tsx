import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { LayoutDashboard, Users } from 'lucide-react'
import LogoutButton from './LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role === 'SEM_PERMISSAO') redirect('/acesso-negado')

  const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'USUARIO' ? 'Usuário' : role ?? ''

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">TC</div>
          <h1>
            TalentCare
            <small>Itamarathy</small>
          </h1>
        </div>
        <a className="nav-link" href="/dashboard">
          <LayoutDashboard size={18} /> Início
        </a>
        <a className="nav-link" href="/usuarios">
          <Users size={18} /> Usuários
        </a>
        <div className="spacer" />
        <div className="user-chip">
          <div className="name">{session.user.name}</div>
          <div className="role">{roleLabel}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
