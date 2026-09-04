import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { assembleData, type Identity, type TalentData, type TrainingItem } from '@/lib/mock/data'
import { isHiddenDept } from '@/lib/hidden-depts'
import { coberturaDoPonto } from '@/lib/ponto-cobertura'

/**
 * Dataset do TalentCare: IDENTIDADE real (Nexus) + MÉTRICAS simuladas (até a frente B).
 * Lê os funcionários sincronizados (origin=nexus) e monta employees/departments.
 */
/**
 * ⚠️⚠️ O ALCANCE de quem está lendo. Sem ele, este dataset — que vai INTEIRO
 * para o navegador (`TalentDataProvider`) — carregava, em toda página, o
 * histórico disciplinar da empresa: em 03/09/2026 eram **732 advertências de 73
 * pessoas, todas com o motivo escrito**, mais 130 dias de atrasos por pessoa.
 *
 * As rotas da ficha checavam `podeVer` corretamente, e era por isso que ninguém
 * via o problema: a régua protegia a parte MENOS sensível (contagens do período)
 * e o histórico disciplinar viajava livre no `self.__next_f` de qualquer tela.
 *
 * É o que impedia ligar `TALENTCARE_ACESSO_ABERTO`: abrir o sistema entregaria
 * a ficha disciplinar de 73 pessoas a cada um dos 87 — e o que foi visto foi
 * visto.
 */
export type Alcance =
  | { tipo: 'tudo' }
  | { tipo: 'recorte'; departmentIds: string[]; meuId: string }

export async function getTalentData(alcance: Alcance = { tipo: 'tudo' }): Promise<TalentData> {
  // Janela do heatmap de ocorrências: últimas ~18 semanas (130 dias).
  const heatCutoff = new Date(Date.now() - 130 * 86400_000).toISOString().slice(0, 10)
  const [usersRaw, stats, radioStats, whatsappAtt, consultoriaStats, helpdeskStats, cideStats, gerenciaStats, chatStats, edu, train, assidTot, assidRecent, servTot, discAll] = await Promise.all([
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
    // GERÊNCIA ACUMULADA (todo o histórico) somada do espelho diário.
    prisma.gerenciaDaily.groupBy({
      by: ['nexusUserId'],
      _sum: {
        servicos: true, km: true, saidas: true, viagens: true, jornadaMin: true,
        protAbertos: true, protAprovados: true, servCriados: true,
        reagendados: true, cancelados: true, datasAlteradas: true,
      },
    }),
    // CHAT INTERNO ACUMULADO (todo o histórico) somado do espelho diário.
    // ⚠️ Inclui as mensagens importadas do Mattermost, que trazem a data
    // original — por isso o acumulado do chat é bem mais antigo que o dos
    // chamados (que só existem desde 21/08/2026).
    prisma.chatDaily.groupBy({
      by: ['nexusUserId'],
      _sum: {
        msgCanais: true, msgDiretas: true, msgChamados: true,
        chamadosAbertos: true, chamadosAssumidos: true, chamadosConcluidos: true,
        segundosResolucao: true,
      },
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
    /* Serviços CONCLUÍDOS por pessoa (11ª fonte). ⚠️ É o 6º consumidor da
       checklist do `docs/FONTES.md`: integrar a fonte não basta, e esquecer o
       acumulado deixa o score inconsistente entre a base e o filtro. */
    prisma.servicoDepto.groupBy({
      by: ['personKey'],
      where: { status: 'concluida', personKey: { not: null } },
      _count: { _all: true },
    }),
    // Eventos de disciplina (advertências) — lista real da ficha + contagem.
    prisma.disciplinaEvento.findMany({
      /* ⚠️ O `motivo` NÃO entra no dataset do cliente, nem para quem alcança a
         pessoa. Ele é o conteúdo da advertência, e quem precisa dele é a FICHA —
         que o pede a `/api/employee-metrics`, uma rota que confere `podeVer`.
         Contagem viaja; texto não. */
      select: { personKey: true, data: true, tipo: true, dias: true },
      orderBy: { data: 'desc' },
    }),
  ])
  /* Oculta Diretoria/Sistemas do painel (mantém o login deles intacto).
     ⚠️ E quem o Nexus tirou do diretório: `foraDoDiretorio` já é respeitado pela
     FILA de avaliação (foi o que tirou de lá a conta `Axis Certificados`), mas
     não era aqui — então uma conta que não é gente continuava no painel, no
     ranking e nas médias. A régua tem de ser a mesma nos dois lugares; do
     contrário o sistema diz "isto não é uma pessoa" numa tela e a classifica em
     primeiro lugar na outra. A marca tem VOLTA: some quando a pessoa reaparece
     no diretório. */
  const users = usersRaw.filter((u) => !isHiddenDept(u.department?.name) && !u.foraDoDiretorio)
  /* ⚠️⚠️ QUEM O PONTO MEDE. Sem isto, `atrasos: 0, advertencias: 0` — o que se lê
     de quem o ponto não cobre — virava assiduidade **100**, e as 31 pessoas sem
     registro apareciam empatadas no topo do `/ranking`. Ver
     `lib/ponto-cobertura.ts`. */
  const cobPonto = await coberturaDoPonto()
  const statByNexus = new Map(stats.map((s) => [s.nexusUserId, s]))
  const radioByNexus = new Map(radioStats.map((r) => [r.nexusUserId, r]))
  const consultoriaByNexus = new Map(consultoriaStats.map((c) => [c.nexusUserId, c]))
  const helpdeskByNexus = new Map(helpdeskStats.map((h) => [h.nexusUserId, h]))
  const cideByNexus = new Map(cideStats.map((c) => [c.nexusUserId, c]))
  const gerenciaByNexus = new Map(gerenciaStats.map((g) => [g.nexusUserId, g]))
  const chatByNexus = new Map(chatStats.map((c) => [c.nexusUserId, c]))
  // WhatsApp por nome normalizado (atendente → funcionário).
  const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const whatsappByName = new Map(whatsappAtt.map((w) => [normName(w.name), w]))
  const eduByNexus = new Map(edu.map((e) => [e.nexusUserId, e.level]))
  const eduDetailByNexus = new Map(edu.map((e) => [e.nexusUserId, e.detail]))
  const asItems = (v: unknown): TrainingItem[] => Array.isArray(v) ? (v as TrainingItem[]) : []
  const trainByNexus = new Map(train.map((t) => [t.nexusUserId, t]))
  // Assiduidade/disciplina por personKey (= nexusUserId ?? id, cobre STAFF).
  const assidTotByKey = new Map(assidTot.map((a) => [a.personKey, a._sum]))
  const servTotByKey = new Map(servTot.map((r) => [r.personKey, r._count._all]))
  const assidDaysByKey = new Map<string, { day: string; atrasos: number; minutos: number }[]>()
  for (const r of assidRecent) {
    const arr = assidDaysByKey.get(r.personKey) ?? []
    arr.push({ day: r.day, atrasos: r.atrasos, minutos: r.minutosAtraso })
    assidDaysByKey.set(r.personKey, arr)
  }
  const discByKey = new Map<string, { data: string; tipo: string; motivo: string | null; dias: number | null }[]>()
  for (const e of discAll) {
    const arr = discByKey.get(e.personKey) ?? []
    arr.push({ data: e.data, tipo: e.tipo, motivo: null, dias: e.dias })
    discByKey.set(e.personKey, arr)
  }

  /* Quem o leitor alcança. Fora disso, a pessoa continua aparecendo (nome,
     cargo, setor são diretório) — mas sem ocorrência de ponto e sem disciplina. */
  const alcanca = (deptId: string | null, id: string): boolean => {
    if (alcance.tipo === 'tudo') return true
    return id === alcance.meuId || (!!deptId && alcance.departmentIds.includes(deptId))
  }

  const identities: Identity[] = users.map((u) => {
    const cs = u.nexusUserId ? statByNexus.get(u.nexusUserId) : undefined
    const rs = u.nexusUserId ? radioByNexus.get(u.nexusUserId) : undefined
    const cps = u.nexusUserId ? consultoriaByNexus.get(u.nexusUserId) : undefined
    const hds = u.nexusUserId ? helpdeskByNexus.get(u.nexusUserId) : undefined
    const cds = u.nexusUserId ? cideByNexus.get(u.nexusUserId) : undefined
    const gds = u.nexusUserId ? gerenciaByNexus.get(u.nexusUserId) : undefined
    const chs = u.nexusUserId ? chatByNexus.get(u.nexusUserId) : undefined
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
      // GERÊNCIA: execução (serviços/km/viagens/jornada) + escritório
      // (protocolos abertos/aprovados/…). Uma pessoa pode ter as duas.
      gerencia: {
        servicos: gds?._sum.servicos ?? 0,
        km: gds?._sum.km ?? 0,
        saidas: gds?._sum.saidas ?? 0,
        viagens: gds?._sum.viagens ?? 0,
        jornadaMin: gds?._sum.jornadaMin ?? 0,
        protAbertos: gds?._sum.protAbertos ?? 0,
        protAprovados: gds?._sum.protAprovados ?? 0,
        servCriados: gds?._sum.servCriados ?? 0,
        reagendados: gds?._sum.reagendados ?? 0,
        cancelados: gds?._sum.cancelados ?? 0,
        datasAlteradas: gds?._sum.datasAlteradas ?? 0,
      },
      // CHAT INTERNO: conversa (canais/diretas/chamados) + os chamados que a
      // pessoa abriu, assumiu e concluiu. Só chamado entra no score.
      chat: {
        msgCanais: chs?._sum.msgCanais ?? 0,
        msgDiretas: chs?._sum.msgDiretas ?? 0,
        msgChamados: chs?._sum.msgChamados ?? 0,
        chamadosAbertos: chs?._sum.chamadosAbertos ?? 0,
        chamadosAssumidos: chs?._sum.chamadosAssumidos ?? 0,
        chamadosConcluidos: chs?._sum.chamadosConcluidos ?? 0,
        segundosResolucao: chs?._sum.segundosResolucao ?? 0,
      },
      // ASSIDUIDADE real (ponto). Sem dado de falta/suspensão na fonte → ficam
      // "sem fonte" na ficha (não zero fabricado). advertencias = nº de eventos.
      // ⚠️ Zero para quem o leitor não alcança — e não o número real escondido
      // na tela: o dado não sai do servidor.
      assid: !alcanca(u.departmentId, u.id) ? { atrasos: 0, atrasosAbon: 0, minutos: 0, advertencias: 0 } : {
        atrasos: at?.atrasos ?? 0,
        atrasosAbon: at?.atrasosAbon ?? 0,
        minutos: at?.minutosAtraso ?? 0,
        advertencias: disc.filter((d) => d.tipo === 'advertencia').length,
      },
      /* ⚠️⚠️ O RECORTE DE PRIVACIDADE FABRICAVA O 100. Quem o leitor não alcança
         sai daqui com atrasos e advertências zerados — que é o certo, o dado não
         pode viajar —, mas `100 − 0·2 − 0·5` é **100**, e o `/ranking` publicava
         a empresa inteira empatada em primeiro lugar acima do time do próprio
         gestor, que é a única gente de quem ele tem dado real. A régua que
         protege a privacidade não pode virar nota máxima: fora do alcance, a
         pessoa NÃO É MEDIDA para quem está lendo. */
      servicosConcluidos: servTotByKey.get(personKey) ?? 0,
      temPonto: alcanca(u.departmentId, u.id) && cobPonto.roster.has(personKey),
      assidDays: alcanca(u.departmentId, u.id) ? (assidDaysByKey.get(personKey) ?? []) : [],
      discEventos: alcanca(u.departmentId, u.id) ? disc : [],
    }
  })

  return assembleData(identities)
}
