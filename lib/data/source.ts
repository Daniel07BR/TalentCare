import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData, type TrainingItem } from '@/lib/mock/data'
import { isHiddenDept } from '@/lib/hidden-depts'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
export async function getTalentData(): Promise<TalentData> {
  const [usersRaw, stats, radioStats, edu, train] = await Promise.all([
    prisma.user.findMany({
      where: { origin: 'nexus' },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.classroomStat.findMany(),
    // Rádio ACUMULADA (todo o histórico) somada do espelho diário radio_daily.
    prisma.radioDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { seconds: true, sessions: true },
      _max: { day: true },
    }),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true } }),
    prisma.employeeTraining.findMany({ select: { nexusUserId: true, cursos: true, certs: true } }),
  ])
  // Oculta Diretoria/Sistemas do painel (mantém o login deles intacto).
  const users = usersRaw.filter((u) => !isHiddenDept(u.department?.name))
  const statByNexus = new Map(stats.map((s) => [s.nexusUserId, s]))
  const radioByNexus = new Map(radioStats.map((r) => [r.nexusUserId, r]))
  const eduByNexus = new Map(edu.map((e) => [e.nexusUserId, e.level]))
  const eduDetailByNexus = new Map(edu.map((e) => [e.nexusUserId, e.detail]))
  const asItems = (v: unknown): TrainingItem[] => Array.isArray(v) ? (v as TrainingItem[]) : []
  const trainByNexus = new Map(train.map((t) => [t.nexusUserId, t]))

  const identities: Identity[] = users.map((u) => {
    const cs = u.nexusUserId ? statByNexus.get(u.nexusUserId) : undefined
    const rs = u.nexusUserId ? radioByNexus.get(u.nexusUserId) : undefined
    return {
      id: u.id,
      nexusUserId: u.nexusUserId,
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
      treinoCursos: asItems(u.nexusUserId ? trainByNexus.get(u.nexusUserId)?.cursos : null),
      treinoCerts: asItems(u.nexusUserId ? trainByNexus.get(u.nexusUserId)?.certs : null),
      classroom: {
        videosCompleted: cs?.videosCompleted ?? 0,
        coursesCompleted: cs?.coursesCompleted ?? 0,
        coursesCreated: cs?.coursesCreated ?? 0,
      },
      radio: {
        totalSeconds: rs?._sum.seconds ?? 0,
        sessions: rs?._sum.sessions ?? 0,
        // última escuta = dia mais recente com uso (granularidade diária)
        lastListenedAt: rs?._max.day ? `${rs._max.day}T12:00:00Z` : null,
      },
    }
  })

  return assembleData(identities)
}
