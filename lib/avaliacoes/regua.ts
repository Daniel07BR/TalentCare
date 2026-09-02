import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { isHiddenDept } from '@/lib/hidden-depts'
import { limitesDaCompetencia } from './criterios'

/* ============================================================
   A RÉGUA DA AVALIAÇÃO — UMA, aqui, e em nenhum outro lugar.

   ⚠️⚠️ Toda rota e toda tela perguntam a este arquivo. A auditoria do Nexus
   custou caro justamente por isso: a mesma régua de permissão estava escrita em
   doze lugares e as doze discordavam em algum caso. Aqui a pergunta "o que esta
   pessoa pode ver e o que pode fazer" tem UMA resposta.

   ⚠️⚠️ E a régua é por VÍNCULO GRAVADO (`setor_avaliador`), nunca pelo cargo
   lido na hora. Cargo sugere; gente confirma. Poder de avaliar é poder sobre a
   carreira de alguém — no dia em que um setor tiver dois "Gestor", uma régua
   derivada do texto mudaria sozinha e ninguém saberia.
   ============================================================ */

export type Escopo =
  /** Diretoria e administradores: a empresa toda. */
  | { tipo: 'tudo'; avaliaDepartmentIds: string[] }
  /** Gestor / Sub-encarregado: os setores em que ele é avaliador. */
  | { tipo: 'setor'; avaliaDepartmentIds: string[] }
  /** Colaborador: só a própria página. A lista fica vazia, mas o tipo é
   *  `string[]` e não a tupla `[]` — senão `.includes(string)` estreita para
   *  `never` e o TypeScript recusa a régua inteira. */
  | { tipo: 'so-eu'; avaliaDepartmentIds: string[] }

export type Quem = {
  id: string
  nome: string
  role: string
  departmentId: string | null
  departmentName: string | null
  escopo: Escopo
}

/** Quem é a pessoa logada, e o que ela alcança. Chamada única por requisição. */
export async function quemEh(userId: string): Promise<Quem | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, role: true, departmentId: true,
      department: { select: { name: true } },
    },
  })
  if (!u) return null

  // Setores em que ESTA pessoa é avaliadora (linha gravada, nunca cargo).
  const vinculos = await prisma.setorAvaliador.findMany({
    where: { userId },
    select: { departmentId: true },
  })
  const avalia = vinculos.map((v) => v.departmentId)

  let escopo: Escopo
  if (u.role === 'ADMIN') {
    // ⚠️ ADMIN vê tudo, mas só AVALIA onde tem vínculo. Ver e avaliar são duas
    // coisas: sem isso, todo diretor apareceria como responsável pela fila de
    // todo setor e o alerta de "quem falta" perderia o dono.
    escopo = { tipo: 'tudo', avaliaDepartmentIds: avalia }
  } else if (avalia.length > 0) {
    escopo = { tipo: 'setor', avaliaDepartmentIds: avalia }
  } else {
    escopo = { tipo: 'so-eu', avaliaDepartmentIds: [] }
  }

  return {
    id: u.id, nome: u.name, role: u.role,
    departmentId: u.departmentId,
    departmentName: u.department?.name ?? null,
    escopo,
  }
}

/** Pode ABRIR a ficha/avaliação desta pessoa? */
export function podeVer(quem: Quem, alvo: { id: string; departmentId: string | null }): boolean {
  if (alvo.id === quem.id) return true // a própria página, sempre
  if (quem.escopo.tipo === 'tudo') return true
  if (quem.escopo.tipo === 'so-eu') return false
  return !!alvo.departmentId && quem.escopo.avaliaDepartmentIds.includes(alvo.departmentId)
}

/**
 * Pode AVALIAR esta pessoa?
 *
 * ⚠️⚠️ `alvo.id !== quem.id` é a regra que não pode faltar: ninguém se avalia.
 * Sem ela, o Gestor do setor apareceria na própria fila e poderia se dar 10 —
 * e o número entraria no gráfico de performance como qualquer outro.
 *
 * ⚠️⚠️ E avaliador NÃO avalia avaliador do mesmo setor: quem tem vínculo ali
 * é avaliado pela Diretoria. Senão o Fiscal teria a Sub-encarregada avaliando a
 * Gestora, que é quem avalia ela — e a nota de uma pesaria sobre a outra.
 */
export function podeAvaliar(
  quem: Quem,
  alvo: { id: string; departmentId: string | null },
  avaliadoresDoSetor: Set<string>,
): boolean {
  if (alvo.id === quem.id) return false
  if (!alvo.departmentId) return false
  if (!quem.escopo.avaliaDepartmentIds.includes(alvo.departmentId)) return false
  if (avaliadoresDoSetor.has(alvo.id)) return false
  return true
}

/** Só quem administra o painel mexe em QUEM AVALIA. */
export const podeGerirAvaliadores = (quem: Quem) => quem.role === 'ADMIN'

/**
 * A FILA de uma competência: quem devia ter sido avaliado e quem já foi.
 *
 * ⚠️⚠️ "Quem falta" é DERIVADO — a lista de avaliáveis MENOS quem tem avaliação
 * publicada. Não existe (e não pode existir) um campo `avaliado = true`: um
 * campo desses só é escrito por um caminho, e o dia em que alguém trocar de
 * setor, for admitido no meio do mês ou tiver a avaliação corrigida, o alerta
 * fica aceso para sempre. A primeira reação de quem recebe alerta eterno é
 * parar de olhar o alerta.
 *
 * Duas regras que evitam fila suja:
 *  - só entra quem estava ATIVO no último dia da competência (quem saiu não é
 *    "não avaliado", é "não estava mais aqui");
 *  - quem foi admitido DEPOIS do dia 15 daquele mês não entra (quem chegou dia
 *    28 não teve mês para ser avaliado — e cobrar isso do gestor é cobrar o
 *    impossível).
 */
export async function filaDaCompetencia(quem: Quem, competencia: string) {
  const { fim } = limitesDaCompetencia(competencia)
  // Corte da admissão: dia 15 da competência.
  const corteAdmissao = new Date(fim.getFullYear(), fim.getMonth(), 16)

  const alcance =
    quem.escopo.tipo === 'tudo'
      ? {}
      : quem.escopo.tipo === 'setor'
        ? { departmentId: { in: quem.escopo.avaliaDepartmentIds } }
        : { id: quem.id }

  const [pessoas, avaliacoes, avaliadores] = await Promise.all([
    prisma.user.findMany({
      where: {
        origin: { in: ['nexus', 'staff'] },
        ...alcance,
        // Ativo no fim da competência: ou nunca saiu, ou saiu depois dela.
        OR: [{ leftAt: null }, { leftAt: { gt: fim } }],
        entryDate: { lt: corteAdmissao },
      },
      select: {
        id: true, name: true, jobTitle: true, avatarUrl: true,
        departmentId: true, department: { select: { name: true } },
        nexusUserId: true, entryDate: true, leftAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.avaliacao.findMany({
      where: { competencia },
      select: {
        id: true, avaliadoId: true, avaliadorId: true, status: true,
        media: true, versao: true, publishedAt: true,
        ciencia: { select: { cienteEm: true, comentario: true, versaoCiente: true } },
      },
    }),
    prisma.setorAvaliador.findMany({ select: { departmentId: true, userId: true } }),
  ])

  const porAvaliado = new Map(avaliacoes.map((a) => [a.avaliadoId, a]))
  const avaliadoresPorSetor = new Map<string, Set<string>>()
  for (const v of avaliadores) {
    const s = avaliadoresPorSetor.get(v.departmentId) ?? new Set<string>()
    s.add(v.userId)
    avaliadoresPorSetor.set(v.departmentId, s)
  }

  const linhas = pessoas
    // Diretoria e Sistemas continuam fora da população avaliada, como no resto
    // do painel — a Diretoria usa o sistema, não é avaliada nele.
    .filter((p) => !isHiddenDept(p.department?.name))
    .map((p) => {
      const av = porAvaliado.get(p.id)
      const doSetor = avaliadoresPorSetor.get(p.departmentId ?? '') ?? new Set<string>()
      // ⚠️ Avaliador do setor é avaliado pela Diretoria, e não pelo par dele.
      const ehAvaliador = doSetor.has(p.id)
      return {
        id: p.id,
        nome: p.name,
        cargo: p.jobTitle ?? 'Colaborador',
        hasAvatar: !!p.avatarUrl,
        departmentId: p.departmentId,
        setor: p.department?.name ?? 'Sem setor',
        ehAvaliador,
        // O setor tem QUEM avaliar? Zero avaliadores = ninguém responde por esta
        // fila, e a tela precisa dizer isso em vez de mostrar "falta avaliar".
        setorSemAvaliador: doSetor.size === 0,
        avaliacaoId: av?.id ?? null,
        status: av?.status ?? 'pendente',
        media: av?.media ?? null,
        versao: av?.versao ?? null,
        avaliadorId: av?.avaliadorId ?? null,
        publishedAt: av?.publishedAt ?? null,
        ciente: !!av?.ciencia?.cienteEm,
        comentarioDoAvaliado: av?.ciencia?.comentario ?? null,
        // Pode EU avaliar esta pessoa agora?
        posso: podeAvaliar(quem, p, doSetor),
      }
    })

  const publicadas = linhas.filter((l) => l.status === 'publicada').length
  // ⚠️ "Falta" só conta quem TEM avaliador. Setor órfão aparece à parte, senão o
  // contador acusa um gestor que não existe.
  const faltam = linhas.filter((l) => l.status !== 'publicada' && !l.setorSemAvaliador && !l.ehAvaliador).length
  const orfaos = linhas.filter((l) => l.setorSemAvaliador).length

  return { competencia, linhas, total: linhas.length, publicadas, faltam, orfaos }
}
