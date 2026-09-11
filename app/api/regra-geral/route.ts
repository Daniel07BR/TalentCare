import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh } from '@/lib/avaliacoes/regua'
import { competenciaAtual, competenciaValida } from '@/lib/servicos/pontuacao'
import { PARAMETROS_DE_09_09, LIMITES, competenciaAnterior, type ParametrosGerais } from '@/lib/servicos/regra-geral'
import { previa, gravarRegraGeral, ReferenciaRecusada } from '@/lib/servicos/regra-geral-servidor'

/* ============================================================
   A RÉGUA GERAL DE PONTUAÇÃO (11/09/2026, decisão do dono) — Configurações.

   GET  → as versões e os parâmetros que valem hoje.
   POST → { ensaio: true, ...parâmetros } mostra o que a regra daria em cada setor
          (nada é gravado); sem `ensaio`, grava a versão e a régua de cada setor.

   ⚠️⚠️ Só ADMIN — o dono e a Diretoria (pedido do dono: "só eu e a Diretoria
   podemos fazer alterações aqui"). O gestor deixou de editar a régua do setor.

   ⚠️⚠️ NUNCA SE REESCREVE O PASSADO: a vigência não pode ser anterior ao mês
   corrente, e os meses já gravados ficam como foram — mesma trava da régua do
   setor, pelo mesmo motivo (a pessoa já leu a nota e conversou sobre ela).
   ============================================================ */

async function adminOuNada() {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return { erro: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  if (quem.role !== 'ADMIN') return { erro: NextResponse.json({ error: 'Só o dono do sistema e a Diretoria alteram a régua geral.' }, { status: 403 }) }
  return { quem }
}

/** A referência da mediana: o último mês FECHADO — sempre o anterior ao corrente. */
const referenciaAgora = () => competenciaAnterior(competenciaAtual())

export async function GET() {
  const a = await adminOuNada()
  if ('erro' in a) return a.erro
  const versoes = await prisma.pontuacaoRegraGeral.findMany({ orderBy: { vigenteDesde: 'desc' } })
  const autores = await prisma.user.findMany({ where: { id: { in: [...new Set(versoes.map((v) => v.criadoPor))] } }, select: { id: true, name: true } })
  const nome = new Map(autores.map((x) => [x.id, x.name]))
  const hoje = competenciaAtual()
  const vigente = versoes.find((v) => v.vigenteDesde <= hoje) ?? null
  return NextResponse.json({
    competenciaAtual: hoje,
    referencia: referenciaAgora(),
    parametros: vigente ?? PARAMETROS_DE_09_09,
    versoes: versoes.map((v) => ({ ...v, criadoPor: nome.get(v.criadoPor) ?? '—' })),
  })
}

function lerParametros(b: Record<string, unknown>): ParametrosGerais | string {
  const num = (k: string) => Number(b[k])
  const dentro = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi
  const g: ParametrosGerais = {
    base: Math.round(num('base')), fatorPorMinuto: num('fatorPorMinuto'), fracaoAtraso: num('fracaoAtraso'),
    multAdvertencia: num('multAdvertencia'), multMesLimpo: num('multMesLimpo'), multSuspensao: num('multSuspensao'),
    multLgpdAdvertencia: num('multLgpdAdvertencia'), multLgpdSuspensao: num('multLgpdSuspensao'),
    pontosAbonado: Math.round(num('pontosAbonado')), pontosServico: Math.round(num('pontosServico')),
  }
  if (!dentro(g.base, LIMITES.base)) return 'A base tem de ficar entre 0 e 1000.'
  if (!dentro(g.fatorPorMinuto, LIMITES.fatorPorMinuto)) return 'O ponto por minuto tem de ficar entre 0 e 10.'
  if (!dentro(g.fracaoAtraso, LIMITES.fracaoAtraso)) return 'O peso do atraso tem de ficar entre 0,1% e 100% do mês típico do setor.'
  for (const k of ['multAdvertencia', 'multMesLimpo', 'multSuspensao', 'multLgpdAdvertencia', 'multLgpdSuspensao'] as const) {
    if (!dentro(g[k], LIMITES.mult)) return 'Os multiplicadores têm de ficar entre 0 e 50.'
  }
  if (!dentro(g.pontosAbonado, LIMITES.pontos) || !dentro(g.pontosServico, LIMITES.pontos)) return 'Os pontos fixos têm de ficar entre −1000 e 1000.'
  return g
}

export async function POST(req: NextRequest) {
  const a = await adminOuNada()
  if ('erro' in a) return a.erro
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  const g = lerParametros(b)
  if (typeof g === 'string') return NextResponse.json({ error: g }, { status: 422 })
  const referencia = referenciaAgora()

  try {
    if (b.ensaio) {
      const p = await previa(g, referencia)
      return NextResponse.json({ ensaio: true, referencia, ...p })
    }
    return await gravar(b, g, referencia, a.quem.id)
  } catch (e) {
    // A referência recusada é resposta, não pane: diz o motivo e não grava nada.
    if (e instanceof ReferenciaRecusada) return NextResponse.json({ error: e.message }, { status: 422 })
    throw e
  }
}

async function gravar(b: Record<string, unknown>, g: ParametrosGerais, referencia: string, autorId: string) {

  const vigencia = String(b.vigenteDesde ?? '').trim()
  if (!competenciaValida(vigencia)) return NextResponse.json({ error: 'A vigência tem de ser uma competência AAAA-MM.' }, { status: 422 })
  if (vigencia < competenciaAtual()) {
    return NextResponse.json({ error: `A vigência não pode ser anterior ao mês corrente (${competenciaAtual()}). A régua nova vale daqui para a frente — o que já foi pontuado fica como foi.` }, { status: 422 })
  }
  const motivo = typeof b.motivo === 'string' && b.motivo.trim() ? b.motivo.trim().slice(0, 500) : null
  const linhas = await gravarRegraGeral(g, vigencia, referencia, autorId, motivo)
  return NextResponse.json({ ok: true, vigencia, referencia, setores: linhas.length })
}
