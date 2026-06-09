import { auth } from '@/lib/auth/config'

export default async function Dashboard() {
  const session = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? ''

  return (
    <div>
      <h2 className="page-title">Olá, {firstName} 👋</h2>
      <p className="page-sub">Bem-vindo ao TalentCare.</p>
      <div className="empty">
        <p style={{ margin: 0, fontSize: 15 }}>Página inicial em branco.</p>
        <p style={{ margin: '6px 0 0', fontSize: 13 }}>
          Os módulos do TalentCare aparecerão aqui. Por enquanto, veja a aba <b>Usuários</b>.
        </p>
      </div>
    </div>
  )
}
