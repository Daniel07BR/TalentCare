import { prisma } from '@/lib/db/prisma'
import EquipeClient from './EquipeClient'

export const dynamic = 'force-dynamic'

// Cadastro de colaboradores STAFF (sem usuário no Nexus): motoboy, cozinha,
// limpeza etc. Admin-only (a área (app) já exige sessão; rotas checam ADMIN).
export default async function EquipePage() {
  const [staffRaw, depsRaw] = await Promise.all([
    prisma.user.findMany({
      where: { origin: 'staff' },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { department: { select: { id: true, name: true } } },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const staff = staffRaw.map((u) => ({
    id: u.id,
    name: u.name,
    cpf: u.cpf ?? '',
    jobTitle: u.jobTitle ?? '',
    deptId: u.departmentId ?? '',
    deptName: u.department?.name ?? '',
    entryDate: u.entryDate ? u.entryDate.toISOString().slice(0, 10) : '',
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : '',
    gender: u.gender ?? '',
    phone: u.phone ?? '',
    active: u.active,
    hasAvatar: !!u.avatarUrl,
  }))

  return <EquipeClient staff={staff} departments={depsRaw} />
}
