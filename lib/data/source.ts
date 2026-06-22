import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData } from '@/lib/mock/data'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
export async function getTalentData(): Promise<TalentData> {
  const users = await prisma.user.findMany({
    where: { origin: 'nexus' },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })

  const identities: Identity[] = users.map((u) => ({
    id: u.id,
    nome: u.name,
    cargo: u.jobTitle,
    deptId: u.departmentId,
    deptName: u.department?.name ?? null,
    active: u.active,
    hasAvatar: !!u.avatarUrl,
    entryDate: u.entryDate,
  }))

  return assembleData(identities)
}
