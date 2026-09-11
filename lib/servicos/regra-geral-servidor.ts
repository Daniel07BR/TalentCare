import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { montar } from '@/lib/servicos/calcular-mes'
import { competenciaAtual, regraDaCompetencia } from '@/lib/servicos/pontuacao'
import { pesosDoSetor, mediana, type ParametrosGerais } from '@/lib/servicos/regra-geral'

/* ============================================================
   A RÉGUA GERAL — o lado do banco (11/09/2026).

   Medir a mediana de cada setor, mostrar o que a regra daria (prévia) e gravar:
   a versão geral + a régua de CADA setor com a mesma vigência. O cálculo do mês
   (`calcular-mes.ts`) segue lendo a régua do setor — que passa a ser só o que a
   regra geral produziu.
   ============================================================ */

export type LinhaSetor = {
  id: string; nome: string
  /** Quantas pessoas recebem nota no mês de referência. */
  n: number
  /** A mediana de crédito, já na escala do ponto por minuto novo. */
  mediana: number
  /** O setor não tinha ninguém com nota: usou a mediana da CASA. */
  usouCasa: boolean
  pesos: Record<string, number>
  /** Os pontos da régua que vale hoje no setor — para mostrar o que muda. */
  atual: Record<string, number> | null
}

/** O crédito (serviço + atividade, sem a metade disciplinar) de quem recebe nota. */
async function creditoDoSetor(id: string, referencia: string, fatorNovo: number) {
  const r = await montar(id, referencia)
  if ('erro' in r) return null
  /* ⚠️ O crédito é MINUTOS × fator. Se o fator muda, a mediana muda na mesma
     proporção — e a falta tem de acompanhar, senão dobrar o ponto por minuto
     faria a disciplina valer metade sem ninguém ter decidido isso. */
  const escala = r.fatorPorMinuto > 0 ? fatorNovo / r.fatorPorMinuto : 1
  return r.linhas.filter((l) => !l.semNota).map((l) => Math.round((l.pontosDeServico + l.pontosDeAtividade) * escala))
}

/** O que a regra daria em cada setor, medido no mês de referência. Não grava nada. */
export async function previa(g: ParametrosGerais, referencia: string): Promise<{ linhas: LinhaSetor[]; medianaCasa: number }> {
  const [setores, regras] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.pontuacaoRegra.findMany({ select: { departmentId: true, vigenteDesde: true, itens: { select: { evento: true, pontos: true } } } }),
  ])
  const creditos = new Map<string, number[] | null>()
  for (const s of setores) creditos.set(s.id, await creditoDoSetor(s.id, referencia, g.fatorPorMinuto))
  /* ⚠️⚠️ SETOR SEM NINGUÉM COM NOTA usa a mediana da CASA (todas as pessoas com
     nota, de todos os setores). Antes eles ficavam com os pesos copiados do
     Legal — "errados para eles, e inertes só enquanto ninguém ali receber nota"
     (`propor-pesos.ts`). A casa é o meio-termo que não pertence a setor nenhum. */
  const medianaCasa = mediana([...creditos.values()].flatMap((c) => c ?? []))
  const hoje = competenciaAtual()
  const linhas = setores.map((s) => {
    const c = creditos.get(s.id) ?? []
    const usouCasa = !c || c.length === 0
    const m = usouCasa ? medianaCasa : mediana(c)
    const vigente = regraDaCompetencia(regras.filter((r) => r.departmentId === s.id), hoje)
    return {
      id: s.id, nome: s.name, n: c?.length ?? 0, mediana: m, usouCasa,
      pesos: pesosDoSetor(g, m),
      atual: vigente ? Object.fromEntries(vigente.itens.map((i) => [i.evento, i.pontos])) : null,
    }
  })
  return { linhas, medianaCasa }
}

/**
 * Grava a versão geral e a régua de cada setor, com a mesma vigência, numa
 * transação só — ou tudo, ou nada: metade dos setores numa regra e metade na
 * outra seria a régua em dois lugares de novo.
 */
export async function gravarRegraGeral(g: ParametrosGerais, vigencia: string, referencia: string, autorId: string, motivo: string | null) {
  const { linhas } = await previa(g, referencia)
  const medianas = Object.fromEntries(linhas.map((l) => [l.id, l.mediana]))
  const texto = (l: LinhaSetor) =>
    `Gerada pela régua geral (vale a partir de ${vigencia}) · mediana de ${referencia}: ${l.mediana} pontos` +
    (l.usouCasa ? ' (a da casa — ninguém do setor recebeu nota)' : ` (${l.n} pessoas)`) +
    (motivo ? ` · ${motivo}` : '')

  await prisma.$transaction(async (tx) => {
    const dados = { ...g, competenciaReferencia: referencia, medianas, criadoPor: autorId, motivo }
    await tx.pontuacaoRegraGeral.upsert({ where: { vigenteDesde: vigencia }, create: { vigenteDesde: vigencia, ...dados }, update: dados })
    for (const l of linhas) {
      const itens = Object.entries(l.pesos).map(([evento, pontos]) => ({ evento, pontos }))
      await tx.pontuacaoRegra.upsert({
        where: { departmentId_vigenteDesde: { departmentId: l.id, vigenteDesde: vigencia } },
        create: { departmentId: l.id, vigenteDesde: vigencia, base: g.base, fatorPorMinuto: g.fatorPorMinuto, criadoPor: autorId, motivo: texto(l), itens: { create: itens } },
        update: { base: g.base, fatorPorMinuto: g.fatorPorMinuto, criadoPor: autorId, motivo: texto(l), itens: { deleteMany: {}, create: itens } },
      })
    }
  }, { timeout: 60_000 })
  return linhas
}
