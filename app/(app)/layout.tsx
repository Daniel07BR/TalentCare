import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getTalentData } from '@/lib/data/source'
import AppShell from './AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role === 'SEM_PERMISSAO') redirect('/acesso-negado')

  const roleLabel = role === 'ADMIN' ? '4ª geração · Admin' : role === 'USUARIO' ? 'Usuário' : role ?? ''
  const data = await getTalentData()

  return (
    <AppShell name={session.user.name ?? 'Diretoria'} roleLabel={roleLabel} data={data}>
      {children}
    </AppShell>
  )
}
