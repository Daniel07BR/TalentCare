import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { podeAdministrar } from '@/lib/nexus'

// Guard da área de Administração: além de sessão (garantida pela layout (app)),
// exige ser DONO do sistema (allowlist TALENTCARE_ADMIN_EMAILS) ou ser do SETOR
// DE T.I, que passou a dar manutenção no sistema (18/09/2026). A Diretoria é
// ADMIN e vê tudo, MENOS esta área — como sempre foi.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!(await podeAdministrar(session?.user?.email))) redirect('/dashboard')
  return <>{children}</>
}
