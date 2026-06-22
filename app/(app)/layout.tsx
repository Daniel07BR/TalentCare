import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getTalentData } from '@/lib/data/source'
import AppShell from './AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role === 'SEM_PERMISSAO') redirect('/acesso-negado')

  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'USUARIO' ? 'Usuário' : role ?? ''
  const uid = (session.user as { id?: string }).id
  const me = uid
    ? await prisma.user.findUnique({ where: { id: uid }, select: { id: true, jobTitle: true, avatarUrl: true } })
    : null
  const data = await getTalentData()

  return (
    <AppShell
      name={session.user.name ?? 'Diretoria'}
      roleLabel={roleLabel}
      me={{ id: me?.id ?? uid ?? '', cargo: me?.jobTitle ?? null, hasAvatar: !!me?.avatarUrl }}
      data={data}
    >
      {children}
    </AppShell>
  )
}
