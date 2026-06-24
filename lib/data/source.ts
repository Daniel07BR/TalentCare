import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData } from '@/lib/mock/data'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
// Setores que NÃO entram na população avaliada do painel. Diretoria continua
// logando (ADMIN, via SSO) — só não aparece como funcionário avaliado/ranqueado.
// Sistemas é defensivo (contas de rede/admin; o Nexus já as omite do diretório).
const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const HIDDEN_DEPARTMENTS = ['diretoria', 'sistemas']
const isHiddenDept = (name: string | null | undefined) =>
  HIDDEN_DEPARTMENTS.some((d) => norm(name).includes(d))

export async function getTalentData(): Promise<TalentData> {
  const [usersRaw, stats, edu] = await Promise.all([
    prisma.user.findMany({
      where: { origin: 'nexus' },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.classroomStat.findMany(),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true } }),
  ])
  // Oculta Diretoria/Sistemas do painel (mantém o login deles intacto).
  const users = usersRaw.filter((u) => !isHiddenDept(u.department?.name))
  const statByNexus = new Map(stats.map((s) => [s.nexusUserId, s]))
  const eduByNexus = new Map(edu.map((e) => [e.nexusUserId, e.level]))
  const eduDetailByNexus = new Map(edu.map((e) => [e.nexusUserId, e.detail]))

  const identities: Identity[] = users.map((u) => {
    const cs = u.nexusUserId ? statByNexus.get(u.nexusUserId) : undefined
    return {
      id: u.id,
      nome: u.name,
      username: u.domainAccount ?? u.windowsUser ?? null,
      cargo: u.jobTitle,
      deptId: u.departmentId,
      deptName: u.department?.name ?? null,
      active: u.active,
      hasAvatar: !!u.avatarUrl,
      entryDate: u.entryDate,
      leftDate: u.leftAt,
      birthDate: u.birthDate ? u.birthDate.toISOString() : null,
      gender: u.gender ?? null,
      escolaridade: (u.nexusUserId ? eduByNexus.get(u.nexusUserId) : null) ?? null,
      eduDetail: (u.nexusUserId ? eduDetailByNexus.get(u.nexusUserId) : null) ?? null,
      classroom: {
        videosCompleted: cs?.videosCompleted ?? 0,
        coursesCompleted: cs?.coursesCompleted ?? 0,
        coursesCreated: cs?.coursesCreated ?? 0,
      },
    }
  })

  return assembleData(identities)
}
