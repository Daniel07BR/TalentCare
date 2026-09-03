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

/** O que se sabe sobre UM setor: o nível de cada avaliador, e se ele responde
 *  à Diretoria. É o contexto de que `podeAvaliar` precisa. */
export type Setor = {
  /** userId → 'gestor' | 'sub'. Só quem tem vínculo naquele setor aparece. */
  niveis: Map<string, string>
  pelaDiretoria: boolean
}

/**
 * Pode AVALIAR esta pessoa?
 *
 * A HIERARQUIA, fixada pelo dono em 02/09/2026:
 *   - **gestor do setor** → avaliado pela **Diretoria**, sempre;
 *   - **sub-encarregado** → avaliado pelo **gestor** daquele setor;
 *   - **todos os outros** → pelo gestor **ou** pelo sub-encarregado.
 *
 * ⚠️⚠️ `alvo.id !== quem.id` é a regra que não pode faltar: ninguém se avalia.
 * Sem ela, o gestor apareceria na própria fila e poderia se dar 10 — e o número
 * entraria no gráfico de performance como qualquer outro.
 *
 * ⚠️⚠️ O caminho da Diretoria é EXCLUSIVO, e não somado: quem é gestor do setor
 * sai do alcance do sub-encarregado. Senão o Fiscal teria a Bianca avaliando a
 * Adriana, que é justamente quem avalia a Bianca — e a nota de uma pesaria
 * sobre a outra.
 *
 * ⚠️ Os níveis vêm do VÍNCULO gravado, nunca do cargo lido na hora. A Rosemeire
 * tem cargo `Colaborador` e é o topo de dois setores; a régua tem de saber
 * disso, e o cargo não sabe.
 */
export function podeAvaliar(
  quem: Quem,
  alvo: { id: string; departmentId: string | null },
  setor: Setor,
): boolean {
  if (alvo.id === quem.id) return false
  if (!alvo.departmentId) return false

  const nivelDoAlvo = setor.niveis.get(alvo.id)
  // Gestor do setor, ou setor inteiro marcado: cabe à Diretoria e a mais ninguém.
  if (nivelDoAlvo === 'gestor' || setor.pelaDiretoria) return quem.role === 'ADMIN'

  const meuNivel = setor.niveis.get(quem.id)
  if (!meuNivel) return false
  // Sub-encarregado é avaliado pelo GESTOR do setor, não por outro sub.
  if (nivelDoAlvo === 'sub') return meuNivel === 'gestor'
  // Colaborador: gestor ou sub-encarregado.
  return true
}

/** Quem, por NOME, avalia esta pessoa — a coluna que a tela mostra. */
export function quemAvaliaEssa(
  alvo: { id: string; departmentId: string | null },
  setor: Setor,
  nomeDe: Map<string, string>,
): string[] {
  const nivelDoAlvo = setor.niveis.get(alvo.id)
  if (nivelDoAlvo === 'gestor' || setor.pelaDiretoria) return ['Diretoria']
  const podem = [...setor.niveis.entries()]
    .filter(([id, nivel]) => id !== alvo.id && (nivelDoAlvo === 'sub' ? nivel === 'gestor' : true))
    .map(([id]) => nomeDe.get(id) ?? '—')
  return podem
}

/** Só quem administra o painel mexe em QUEM AVALIA. */
export const podeGerirAvaliadores = (quem: Quem) => quem.role === 'ADMIN'

/**
 * QUEM devia ser avaliado numa competência — a população, e só ela.
 *
 * ⚠️⚠️ Exportada porque o relatório de setor tinha a SUA PRÓPRIA conta
 * (`ativos.length`, "quem está ativo hoje") e as duas divergiam: medido em
 * 03/09/2026, o Fiscal contava 22 aqui e 21 na fila, o Financeiro 5 e 4. O selo
 * do menu diria 4 e a faixa vermelha do setor diria 5, sobre a mesma coisa.
 *
 * As três regras que a fila aplica e a outra conta não aplicava: ativo no FIM da
 * competência (quem trabalhou agosto e saiu em setembro ainda merece a nota),
 * admitido antes do dia 16 (cobrar do gestor quem chegou dia 28 é cobrar o
 * impossível) e fora do `foraDoDiretorio` (conta de sistema não é gente).
 */
export function filtroDeAvaliaveis(competencia: string) {
  const { fim } = limitesDaCompetencia(competencia)
  const corteAdmissao = new Date(fim.getFullYear(), fim.getMonth(), 16)
  return {
    origin: { in: ['nexus', 'staff'] },
    foraDoDiretorio: false,
    OR: [{ leftAt: null }, { leftAt: { gt: fim } }],
    entryDate: { lt: corteAdmissao },
  }
}

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
  const alcance =
    quem.escopo.tipo === 'tudo'
      ? {}
      : quem.escopo.tipo === 'setor'
        ? { departmentId: { in: quem.escopo.avaliaDepartmentIds } }
        : { id: quem.id }

  const [pessoas, avaliacoes, avaliadores, deptsDiretoria, todosNomes] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...filtroDeAvaliaveis(competencia),
        ...alcance,
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
    prisma.setorAvaliador.findMany({ select: { departmentId: true, userId: true, nivel: true } }),
    prisma.department.findMany({ where: { avaliadoPelaDiretoria: true }, select: { id: true } }),
    // Nome de quem avalia — a coluna que faltava na tela. Sem ela, a lista
    // respondia "o quê" e nunca "quem", e o leitor não tinha como agir.
    prisma.user.findMany({ select: { id: true, name: true } }),
  ])

  const porAvaliado = new Map(avaliacoes.map((a) => [a.avaliadoId, a]))
  const nomeDe = new Map(todosNomes.map((u) => [u.id, u.name]))
  // Contexto por setor: quem avalia ali e em que nível.
  const porSetor = new Map<string, Setor>()
  for (const v of avaliadores) {
    const s = porSetor.get(v.departmentId) ?? { niveis: new Map<string, string>(), pelaDiretoria: false }
    s.niveis.set(v.userId, v.nivel)
    porSetor.set(v.departmentId, s)
  }
  for (const d of deptsDiretoria) {
    const s = porSetor.get(d.id) ?? { niveis: new Map<string, string>(), pelaDiretoria: false }
    s.pelaDiretoria = true
    porSetor.set(d.id, s)
  }
  const setorVazio: Setor = { niveis: new Map(), pelaDiretoria: false }

  const linhas = pessoas
    // Diretoria e Sistemas continuam fora da população avaliada, como no resto
    // do painel — a Diretoria usa o sistema, não é avaliada nele.
    .filter((p) => !isHiddenDept(p.department?.name))
    .map((p) => {
      const av = porAvaliado.get(p.id)
      const setor = porSetor.get(p.departmentId ?? '') ?? setorVazio
      const meuNivel = setor.niveis.get(p.id)
      // ⚠️ Gestor do setor é avaliado pela Diretoria, e não pelo par de chefia.
      const ehAvaliador = !!meuNivel
      const cabeADiretoria = meuNivel === 'gestor' || setor.pelaDiretoria
      /*
       * QUEM avalia esta pessoa, por nome.
       *
       * ⚠️ A tela mostrava só a SITUAÇÃO ("pendente", "setor sem avaliador") e
       * nunca o responsável — e "pendente" sem dono não diz a ninguém o que
       * fazer. Pior: "Setor sem avaliador" foi lido como "esta pessoa não tem
       * setor", que é outra coisa e assustava. O nome resolve as duas.
       */
      const quemAvalia = quemAvaliaEssa(p, setor, nomeDe)
      return {
        id: p.id,
        nome: p.name,
        cargo: p.jobTitle ?? 'Colaborador',
        hasAvatar: !!p.avatarUrl,
        departmentId: p.departmentId,
        setor: p.department?.name ?? 'Sem setor',
        ehAvaliador,
        cabeADiretoria,
        quemAvalia,
        /*
         * O setor tem QUEM avaliar? Zero avaliadores E não cabe à Diretoria =
         * ninguém responde por esta fila, e a tela diz isso em vez de mostrar
         * "falta avaliar" para um gestor que não existe.
         *
         * ⚠️ Setor marcado `avaliadoPelaDiretoria` NÃO é órfão: ele tem dono, o
         * dono é a Diretoria. Contá-lo como órfão deixaria um alerta vermelho
         * permanente sobre uma situação legítima — e alerta que não se resolve
         * é alerta que se aprende a ignorar.
         */
        setorSemAvaliador: quemAvalia.length === 0,
        avaliacaoId: av?.id ?? null,
        status: av?.status ?? 'pendente',
        media: av?.media ?? null,
        versao: av?.versao ?? null,
        avaliadorId: av?.avaliadorId ?? null,
        publishedAt: av?.publishedAt ?? null,
        ciente: !!av?.ciencia?.cienteEm,
        comentarioDoAvaliado: av?.ciencia?.comentario ?? null,
        // Pode EU avaliar esta pessoa agora?
        posso: podeAvaliar(quem, p, setor),
      }
    })

  const publicadas = linhas.filter((l) => l.status === 'publicada').length
  /*
   * ⚠️ "Falta" é o que EU posso fazer e ainda não fiz — e não a pendência do
   * mundo. Um gestor do Fiscal não pode ser cobrado do Contábil, e o selo do
   * menu perderia o sentido no primeiro mês se contasse a casa inteira.
   *
   * ⚠️ Órfão fica de fora: contar quem ninguém pode avaliar transforma o número
   * numa dívida que não se paga.
   */
  const faltam = linhas.filter((l) => l.status !== 'publicada' && l.posso).length
  const orfaos = linhas.filter((l) => l.setorSemAvaliador).length

  return { competencia, linhas, total: linhas.length, publicadas, faltam, orfaos }
}
