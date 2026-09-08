import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { TIPOS_ATIVIDADE } from './atividades'

/* ============================================================
   A CONTA DAS ATIVIDADES, num lugar só.

   Soma cada fonte do Nexus por pessoa numa janela e devolve, por TIPO de
   atividade, quanto cada pessoa fez. É usada pela régua (totais do setor) e
   pelo cálculo do mês (por pessoa) — a mesma conta nos dois, senão o número que
   o gestor pondera na tela diverge do que entra na nota.

   ⚠️ `normNome` casa o WhatsApp, que não tem `nexusUserId` (a fonte é o nome do
   atendente). É a mesma normalização de `dept-metrics`.
   ============================================================ */

export const normNome = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Chave de identidade de uma pessoa nas fontes: `nexusUserId` e o nome norm. */
export type IdentidadePessoa = { personKey: string; nexusUserId: string | null; nome: string }

/**
 * Devolve `Map<personKey, Map<chaveAtividade, total>>` na janela [de, ate].
 *
 * ⚠️ `personKey` é o do TalentCare (`nexusUserId ?? id`) — a mesma chave que a
 * pontuação e a assiduidade usam, para os três casarem na hora de somar.
 */
export async function agregarAtividades(
  pessoas: IdentidadePessoa[],
  de: string,
  ate: string,
): Promise<Map<string, Map<string, number>>> {
  const nxIds = pessoas.map((p) => p.nexusUserId).filter((v): v is string => !!v)
  const nomes = [...new Set(pessoas.map((p) => normNome(p.nome)))]
  // personKey por nexusUserId e por nome — para reatribuir o que cada fonte soma.
  const keyPorNx = new Map(pessoas.filter((p) => p.nexusUserId).map((p) => [p.nexusUserId as string, p.personKey]))
  /* ⚠️⚠️ O WHATSAPP CASA POR NOME, e nome não é identidade. Se dois do setor
     normalizam igual ("Lucas Souza" atendente × "Lucas Souza" pessoa), creditar
     por nome mandaria os atendimentos de um para o outro — sem erro, sem aviso.
     Nome ambíguo NÃO credita ninguém: é melhor não contar do que contar errado
     na nota de alguém. Hoje não há colisão no Legal, mas o mecanismo é cego a
     ela; esta trava fecha o buraco (achado do crítico, 08/09/2026). */
  const contaNome = new Map<string, number>()
  for (const p of pessoas) contaNome.set(normNome(p.nome), (contaNome.get(normNome(p.nome)) ?? 0) + 1)
  const keyPorNome = new Map(
    pessoas.filter((p) => contaNome.get(normNome(p.nome)) === 1).map((p) => [normNome(p.nome), p.personKey]),
  )

  const range = { day: { gte: de, lte: ate } }
  const somaCampos = (r: Record<string, unknown>, campos: string[]) =>
    campos.reduce((a, c) => a + Number((r as Record<string, number | null>)[c] ?? 0), 0)

  const [cls, hd, cide, cons, ger, chat, wpp] = await Promise.all([
    prisma.classroomDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { courses: true, videos: true, created: true } }),
    prisma.helpdeskDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { opened: true, resolved: true } }),
    prisma.cideDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { atividades: true } }),
    prisma.consultoriaDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { studies: true, tickets: true, messages: true, comments: true } }),
    prisma.gerenciaDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { servicos: true, protAbertos: true, protAprovados: true, servCriados: true, datasAlteradas: true } }),
    prisma.chatDaily.groupBy({ by: ['nexusUserId'], where: { nexusUserId: { in: nxIds }, ...range }, _sum: { chamadosAbertos: true, chamadosConcluidos: true } }),
    prisma.whatsappAttendantDaily.groupBy({ by: ['name'], where: { name: { in: nomes }, ...range }, _sum: { finalizados: true } }),
  ])

  // fonte-modelo → linhas agregadas, indexadas pela identidade certa
  const porModelo: Record<string, Map<string, Record<string, number | null>>> = {
    classroomDaily: new Map(cls.map((r) => [r.nexusUserId, r._sum])),
    helpdeskDaily: new Map(hd.map((r) => [r.nexusUserId, r._sum])),
    cideDaily: new Map(cide.map((r) => [r.nexusUserId, r._sum])),
    consultoriaDaily: new Map(cons.map((r) => [r.nexusUserId, r._sum])),
    gerenciaDaily: new Map(ger.map((r) => [r.nexusUserId, r._sum])),
    chatDaily: new Map(chat.map((r) => [r.nexusUserId, r._sum])),
    whatsappAttendantDaily: new Map(wpp.map((r) => [normNome(r.name), r._sum])),
  }

  const out = new Map<string, Map<string, number>>()
  const add = (personKey: string, chave: string, v: number) => {
    if (!v) return
    let m = out.get(personKey)
    if (!m) { m = new Map(); out.set(personKey, m) }
    m.set(chave, (m.get(chave) ?? 0) + v)
  }

  for (const t of TIPOS_ATIVIDADE) {
    const linhas = porModelo[t.fonte.modelo]
    if (!linhas) continue
    for (const [ident, row] of linhas) {
      const personKey = t.fonte.modelo === 'whatsappAttendantDaily' ? keyPorNome.get(ident) : keyPorNx.get(ident)
      if (!personKey) continue
      add(personKey, t.chave, somaCampos(row, t.fonte.campos as string[]))
    }
  }
  return out
}
