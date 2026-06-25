import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData, type TrainingItem } from '@/lib/mock/data'
import { isHiddenDept } from '@/lib/hidden-depts'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
export async function getTalentData(): Promise<TalentData> {
  // Janela do heatmap de ocorrências: últimas ~18 semanas (130 dias).
  const heatCutoff = new Date(Date.now() - 130 * 86400_000).toISOString().slice(0, 10)
  const [usersRaw, stats, radioStats, whatsappAtt, consultoriaStats, helpdeskStats, cideStats, edu, train, assidTot, assidRecent, discAll] = await Promise.all([
    prisma.user.findMany({
      // Nexus (sincronizados) + STAFF (cadastro manual local, sem usuário no Nexus:
      // motoboy/cozinha/limpeza etc.). Exclui contas locais técnicas (admin/break-glass).
      where: { origin: { in: ['nexus', 'staff'] } },
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
      _sum: { opened: true, resolved: true, formalized: true, resolvedSeconds: true },
    }),
    // CIDE ACUMULADO (todo o histórico) somado do espelho diário.
    prisma.cideDaily.groupBy({
      by: ['nexusUserId'],
      _sum: { atividades: true },
    }),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true } }),
    prisma.employeeTraining.findMany({ select: { nexusUserId: true, cursos: true, certs: true } }),
    // ASSIDUIDADE (ponto) ACUMULADA por pessoa — espelho do dump do Nexo.
    prisma.assiduidadeDaily.groupBy({
      by: ['personKey'],
      _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true },
    }),
    // Dias com ocorrência nas últimas ~18 semanas — alimenta o heatmap.
    prisma.assiduidadeDaily.findMany({
      where: { day: { gte: heatCutoff } },
      select: { personKey: true, day: true, atrasos: true, minutosAtraso: true },
    }),
    // Eventos de disciplina (advertências) — lista real da ficha + contagem.
    prisma.disciplinaEvento.findMany({
      select: { personKey: true, data: true, tipo: true, motivo: true, dias: true },
      orderBy: { data: 'desc' },
    }),
  ])
  // Oculta Diretoria/Sistemas do painel (mantém o login deles intacto).
  const users = usersRaw.filter((u) => !isHiddenDept(u.department?.name))
  const statByNexus = new Map(stats.map((s) => [s.nexusUserId, s]))
  const radioByNexus = new Map(radioStats.map((r) => [r.nexusUserId, r]))
  const consultoriaByNexus = new Map(consultoriaStats.map((c) => [c.nexusUserId, c]))
  const helpdeskByNexus = new Map(helpdeskStats.map((h) => [h.nexusUserId, h]))
  const cideByNexus = new Map(cideStats.map((c) => [c.nexusUserId, c]))
  // WhatsApp por nome normalizado (atendente → funcionário).
  const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const whatsappByName = new Map(whatsappAtt.map((w) => [normName(w.name), w]))
  const eduByNexus = new Map(edu.map((e) => [e.nexusUserId, e.level]))
  const eduDetailByNexus = new Map(edu.map((e) => [e.nexusUserId, e.detail]))
  const asItems = (v: unknown): TrainingItem[] => Array.isArray(v) ? (v as TrainingItem[]) : []
  const trainByNexus = new Map(train.map((t) => [t.nexusUserId, t]))
  // Assiduidade/disciplina por personKey (= nexusUserId ?? id, cobre STAFF).
  const assidTotByKey = new Map(assidTot.map((a) => [a.personKey, a._sum]))
  const assidDaysByKey = new Map<string, { day: string; atrasos: number; minutos: number }[]>()
  for (const r of assidRecent) {
    const arr = assidDaysByKey.get(r.personKey) ?? []
    arr.push({ day: r.day, atrasos: r.atrasos, minutos: r.minutosAtraso })
    assidDaysByKey.set(r.personKey, arr)
  }
  const discByKey = new Map<string, { data: string; tipo: string; motivo: string | null; dias: number | null }[]>()
  for (const e of discAll) {
    const arr = discByKey.get(e.personKey) ?? []
    arr.push({ data: e.data, tipo: e.tipo, motivo: e.motivo, dias: e.dias })
    discByKey.set(e.personKey, arr)
  }

  const identities: Identity[] = users.map((u) => {
    const cs = u.nexusUserId ? statByNexus.get(u.nexusUserId) : undefined
    const rs = u.nexusUserId ? radioByNexus.get(u.nexusUserId) : undefined
    const cps = u.nexusUserId ? consultoriaByNexus.get(u.nexusUserId) : undefined
    const hds = u.nexusUserId ? helpdeskByNexus.get(u.nexusUserId) : undefined
    const cds = u.nexusUserId ? cideByNexus.get(u.nexusUserId) : undefined
    const ws = whatsappByName.get(normName(u.name))
    // Escolaridade/cursos/certificados são preenchíveis MANUALMENTE p/ todos
    // (inclusive STAFF sem Nexus): a chave é nexus_user_id quando existe, senão o id.
    const personKey = u.nexusUserId ?? u.id
    const at = assidTotByKey.get(personKey)
    const disc = discByKey.get(personKey) ?? []
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
      escolaridade: eduByNexus.get(personKey) ?? null,
      eduDetail: eduDetailByNexus.get(personKey) ?? null,
      treinoCursos: asItems(trainByNexus.get(personKey)?.cursos),
      treinoCerts: asItems(trainByNexus.get(personKey)?.certs),
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
        formalized: hds?._sum.formalized ?? 0,
        resolvedSeconds: hds?._sum.resolvedSeconds ?? 0,
      },
      cide: {
        atividades: cds?._sum.atividades ?? 0,
      },
      // ASSIDUIDADE real (ponto). Sem dado de falta/suspensão na fonte → ficam
      // "sem fonte" na ficha (não zero fabricado). advertencias = nº de eventos.
      assid: {
        atrasos: at?.atrasos ?? 0,
        atrasosAbon: at?.atrasosAbon ?? 0,
        minutos: at?.minutosAtraso ?? 0,
        advertencias: disc.filter((d) => d.tipo === 'advertencia').length,
      },
      assidDays: assidDaysByKey.get(personKey) ?? [],
      discEventos: disc,
    }
  })

  return assembleData(identities)
}
