import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import SyncButton from './SyncButton'

export const dynamic = 'force-dynamic'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') return <span className="badge admin">Administrador</span>
  if (role === 'USUARIO') return <span className="badge user">Usuário</span>
  return <span className="badge sem">Sem acesso</span>
}

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { department: { select: { name: true } } },
  })

  return (
    <div>
      <h2 className="page-title">Usuários</h2>
      <p className="page-sub">Todos os funcionários sincronizados do Nexus. O acesso ao TalentCare é restrito à Diretoria.</p>

      <div className="toolbar">
        <span className="count-pill">{users.length} usuário(s)</span>
        <SyncButton />
      </div>

      {users.length === 0 ? (
        <div className="empty">
          <p style={{ margin: 0 }}>Nenhum usuário ainda.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Clique em “Sincronizar com Nexus” para importar o diretório.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th>Setor</th>
                <th>Acesso</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/funcionarios/${u.id}`} style={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <span className="avatar">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : initials(u.name)}
                      </span>
                      {u.name}
                    </Link>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.jobTitle ?? '—'}</td>
                  <td>{u.department?.name ?? '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    {u.active ? <span className="badge user">Ativo</span> : <span className="badge inactive">Inativo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
