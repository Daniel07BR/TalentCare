import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { isOwnerEmail } from '@/lib/nexus'

// Guard da área de Administração: além de sessão (garantida pela layout (app)),
// exige ser DONO do sistema (allowlist TALENTCARE_ADMIN_EMAILS). Diretoria é
// ADMIN e vê tudo, MENOS esta área.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!isOwnerEmail(session?.user?.email)) redirect('/dashboard')
  return <>{children}</>
}
