import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData, type TrainingItem } from '@/lib/mock/data'
import { isHiddenDept } from '@/lib/hidden-depts'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
export async function getTalentData(): Promise<TalentData> {
  const [usersRaw, stats, radioStats, whatsappAtt, consultoriaStats, helpdeskStats, edu, train] = await Promise.all([
    prisma.user.findMany({
      where: { origin: 'nexus' },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    // ClassRoom ACUMULADO somado do espelho diário classroom_daily.
    prisma.classroomDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { videos: true, courses: true, created: true },
    }),
    // Rádio ACUMULADA (todo o histórico) somada do espelho diário radio_daily.
    prisma.radioDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { seconds: true, sessions: true },
      _max: { day: true },
    }),
    // WhatsApp ACUMULADO por atendente (nome) — casado ao funcionário por nome.
    prisma.whatsappAttendantDaily.groupBy({
      by: ['name'],
      _sum: { abertos: true, finalizados: true, handleSum: true },
    }),
    // Consultoria Plus ACUMULADO (todo o histórico) somado do espelho diário.
    prisma.consultoriaDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { studies: true, tickets: true, messages: true, comments: true },
    }),
    // HelpDesk ACUMULADO (todo o histórico) somado do espelho diário.
    prisma.helpdeskDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { opened: true, resolved: true, resolvedSeconds: true },
    }),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true } }),
    prisma.employeeTraining.findMany({ select: { nexusUserId: true, cursos: true, certs: true } }),
  ])
  // Oculta Diretoria/Sistemas do painel (mantém o login deles intacto).
  const users = usersRaw.filter((u) => !isHiddenDept(u.department?.name))
  const statByNexus = new Map(stats.map((s) => [s.nexusUserId, s]))
  const radioByNexus = new Map(radioStats.map((r) => [r.nexusUserId, r]))
  const consultoriaByNexus = new Map(consultoriaStats.map((c) => [c.nexusUserId, c]))
  const helpdeskByNexus = new Map(helpdeskStats.map((h) => [h.nexusUserId, h]))
  // WhatsApp por nome normalizado (atendente → funcionário).
  const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const whatsappByName = new Map(whatsappAtt.map((w) => [normName(w.name), w]))
  const eduByNexus = new Map(edu.map((e) => [e.nexusUserId, e.level]))
  const eduDetailByNexus = new Map(edu.map((e) => [e.nexusUserId, e.detail]))
  const asItems = (v: unknown): TrainingItem[] => Array.isArray(v) ? (v as TrainingItem[]) : []
  const trainByNexus = new Map(train.map((t) => [t.nexusUserId, t]))

  const identities: Identity[] = users.map((u) => {
    const cs = u.nexusUserId ? statByNexus.get(u.nexusUserId) : undefined
    const rs = u.nexusUserId ? radioByNexus.get(u.nexusUserId) : undefined
    const cps = u.nexusUserId ? consultoriaByNexus.get(u.nexusUserId) : undefined
    const hds = u.nexusUserId ? helpdeskByNexus.get(u.nexusUserId) : undefined
    const ws = whatsappByName.get(normName(u.name))
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
        videosCompleted: cs?._sum.videos ?? 0,
        coursesCompleted: cs?._sum.courses ?? 0,
        coursesCreated: cs?._sum.created ?? 0,
      },
      radio: {
        totalSeconds: rs?._sum.seconds ?? 0,
        sessions: rs?._sum.sessions ?? 0,
        // última escuta = dia mais recente com uso (granularidade diária)
        lastListenedAt: rs?._max.day ? `${rs._max.day}T12:00:00Z` : null,
      },
      whatsapp: {
        abertos: ws?._sum.abertos ?? 0,
        finalizados: ws?._sum.finalizados ?? 0,
        handleSum: ws?._sum.handleSum ?? 0,
      },
      consultoria: {
        studies: cps?._sum.studies ?? 0,
        tickets: cps?._sum.tickets ?? 0,
        messages: cps?._sum.messages ?? 0,
        comments: cps?._sum.comments ?? 0,
      },
      helpdesk: {
        opened: hds?._sum.opened ?? 0,
        resolved: hds?._sum.resolved ?? 0,
        resolvedSeconds: hds?._sum.resolvedSeconds ?? 0,
      },
    }
  })

  return assembleData(identities)
}
