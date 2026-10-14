import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

/* ============================================================
   ATRASOS, ADVERTÊNCIAS E SUSPENSÕES VINDOS DO FLUXO, EM TEMPO REAL (14/10/2026).

   Pedido do Daniel: "faça o fluxo enviar para o talent os dados de atrasos,
   faltas, advertências e suspensões em tempo real". Até aqui a assiduidade
   vinha de um DUMP do Axis importado à mão (`run-ponto-import.mjs`) — parado
   em 01/10/2026 enquanto o DP já lançava tudo no Fluxo.

   O Fluxo (`plane/fluxo/nexo/talentcare.py`) chama aqui a cada gravação, com o
   MÊS INTEIRO: atrasos somados por pessoa × dia e as medidas que contam. Este
   lado TROCA o mês pelo que chegou — o grau é ordinal no mês ("3º atraso"), e
   abonar um atraso muda o grau dos outros; mandar só a linha mexida deixaria
   os demais com o grau velho. A rede de segurança é o próprio Fluxo, que
   reenvia o mês corrente e o anterior de hora em hora.

   ⚠️⚠️ A RÉGUA É A DO FLUXO. O que é advertência e o que é suspensão vem
   decidido (suspensão só a que o DP APLICOU); aqui só se grava. Refazer a conta
   deste lado daria dois números para a mesma pessoa no mesmo mês.

   ⚠️⚠️ SÓ DE OUTUBRO/2026 EM DIANTE (`FLUXO_DESDE`). Antes fica o import do
   Axis, com o qual as avaliações já fechadas foram calculadas. O
   `run-ponto-import.mjs` passou a recusar dia daqui para a frente — senão um
   dump novo e o Fluxo brigariam pela mesma linha, e o último a gravar ganharia.

   ⚠️ O que se apaga ao trocar o mês: TODA a `assiduidade_daily` do mês (do
   corte em diante só o Fluxo escreve nela) e só o `source: 'fluxo'` da
   `disciplina_evento` — LGPD (`lgpd`) e a planilha do DP (`disciplina`) ficam.
   FALTAS (14/10/2026): o DP lança no Fluxo e elas vêm no mesmo envio, para
   `fluxo_falta`. Só APARECEM (decisão do Daniel): não entram na nota de
   assiduidade. `faltasNoPeriodo` é a única conta delas — as três rotas leem dali.
   ============================================================ */

export const FLUXO_DESDE = '2026-10-01'

const DIA = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type DiaDoFluxo = {
  pessoa: string; dia: string; atrasos: number; abonados: number
  minutos: number; ate5: number; ate30: number; mais30: number
}
type FaltaDoFluxo = { ref: string; pessoa: string; dia: string; tipo: 'injustificada' | 'justificada'; periodo: 'dia' | 'manha' | 'tarde' }
type MedidaDoFluxo = {
  ref: string; pessoa: string; dia: string; tipo: 'advertencia' | 'suspensao'
  motivo?: string | null; dias?: number | null
}
export type EnvioDoFluxo = {
  versao: number; mes: string; de: string; ate: string; medidoAte: string
  pessoas: string[]; dias: DiaDoFluxo[]; medidas: MedidaDoFluxo[]
  /** desde 14/10/2026; envio sem o campo (Fluxo antigo) não apaga as faltas do mês */
  faltas?: FaltaDoFluxo[]
}

const inteiro = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null)

/** Confere o envio inteiro antes de apagar qualquer coisa. Devolve o motivo da recusa, ou null. */
function recusa(b: EnvioDoFluxo): string | null {
  if (!b || b.versao !== 1) return 'versao_desconhecida'
  if (!/^\d{4}-\d{2}$/.test(b.mes ?? '') || !DIA.test(b.de ?? '') || !DIA.test(b.ate ?? '') || !DIA.test(b.medidoAte ?? '')) {
    return 'datas_invalidas'
  }
  if (!b.de.startsWith(b.mes) || !b.ate.startsWith(b.mes)) return 'janela_fora_do_mes'
  if (!Array.isArray(b.pessoas) || !Array.isArray(b.dias) || !Array.isArray(b.medidas)) return 'listas_ausentes'
  if (b.pessoas.some((p) => !UUID.test(p))) return 'pessoa_invalida'
  for (const d of b.dias) {
    if (!UUID.test(d.pessoa) || !DIA.test(d.dia) || d.dia < b.de || d.dia > b.ate) return 'dia_invalido'
    if ([d.atrasos, d.abonados, d.minutos, d.ate5, d.ate30, d.mais30].some((v) => inteiro(v) === null)) return 'contagem_invalida'
  }
  for (const m of b.medidas) {
    if (!m.ref || !UUID.test(m.pessoa) || !DIA.test(m.dia) || m.dia < b.de || m.dia > b.ate) return 'medida_invalida'
    if (m.tipo !== 'advertencia' && m.tipo !== 'suspensao') return 'tipo_invalido'
  }
  if (b.faltas !== undefined && !Array.isArray(b.faltas)) return 'faltas_invalidas'
  for (const f of b.faltas ?? []) {
    if (!f.ref || !UUID.test(f.pessoa) || !DIA.test(f.dia) || f.dia < b.de || f.dia > b.ate) return 'falta_invalida'
    if (f.tipo !== 'injustificada' && f.tipo !== 'justificada') return 'tipo_de_falta_invalido'
    if (!['dia', 'manha', 'tarde'].includes(f.periodo)) return 'periodo_de_falta_invalido'
  }
  return null
}

export async function gravarDisciplinaDoFluxo(prisma: PrismaClient, b: EnvioDoFluxo) {
  const motivo = recusa(b)
  if (motivo) return { ok: false as const, erro: motivo }
  // o mês que começou antes do corte é gravado só do corte em diante (o resto é do import do Axis)
  const de = b.de < FLUXO_DESDE ? FLUXO_DESDE : b.de
  if (b.ate < FLUXO_DESDE) return { ok: false as const, erro: 'antes_do_corte', corte: FLUXO_DESDE }

  const dias = b.dias.filter((d) => d.dia >= de && (d.atrasos > 0 || d.abonados > 0))
  const medidas = b.medidas.filter((m) => m.dia >= de)
  const faltas = b.faltas === undefined ? null : b.faltas.filter((f) => f.dia >= de)
  const contagens = {
    atrasos: dias.reduce((s, d) => s + d.atrasos, 0),
    abonados: dias.reduce((s, d) => s + d.abonados, 0),
    advertencias: medidas.filter((m) => m.tipo === 'advertencia').length,
    suspensoes: medidas.filter((m) => m.tipo === 'suspensao').length,
    faltas: faltas?.length ?? null,
  }
  /* O hash é do CONTEÚDO (sem `medidoAte`): o reenvio da hora cheia com nada
     mudado não regrava as linhas — só avança até onde o mês está medido. */
  const hash = createHash('sha256').update(JSON.stringify({ de, ate: b.ate, pessoas: [...b.pessoas].sort(), dias, medidas, faltas })).digest('hex')
  const anterior = await prisma.fluxoDisciplinaEnvio.findUnique({ where: { mes: b.mes } })
  const envio = { medidoAte: b.medidoAte, pessoas: b.pessoas, hash, contagens }
  if (anterior?.hash === hash) {
    await prisma.fluxoDisciplinaEnvio.update({ where: { mes: b.mes }, data: { medidoAte: b.medidoAte, recebidoEm: new Date() } })
    return { ok: true as const, mes: b.mes, mudou: false, ...contagens }
  }

  await prisma.$transaction([
    prisma.assiduidadeDaily.deleteMany({ where: { day: { gte: de, lte: b.ate } } }),
    prisma.disciplinaEvento.deleteMany({ where: { source: 'fluxo', data: { gte: de, lte: b.ate } } }),
    prisma.assiduidadeDaily.createMany({
      data: dias.map((d) => ({
        personKey: d.pessoa, day: d.dia, atrasos: d.atrasos, atrasosAbon: d.abonados, minutosAtraso: d.minutos,
        atrasosAte5: d.ate5, atrasosAte30: d.ate30, atrasosMais30: d.mais30,
      })),
    }),
    prisma.disciplinaEvento.createMany({
      data: medidas.map((m) => ({
        personKey: m.pessoa, source: 'fluxo', sourceId: `${m.tipo}:${m.ref}`, data: m.dia, tipo: m.tipo,
        motivo: m.motivo ?? null, dias: m.tipo === 'suspensao' ? (m.dias ?? 1) : null,
      })),
    }),
    ...(faltas === null ? [] : [
      prisma.faltaDoFluxo.deleteMany({ where: { dia: { gte: de, lte: b.ate } } }),
      prisma.faltaDoFluxo.createMany({
        data: faltas.map((f) => ({ ref: f.ref, personKey: f.pessoa, dia: f.dia, tipo: f.tipo, periodo: f.periodo })),
      }),
    ]),
    prisma.fluxoDisciplinaEnvio.upsert({
      where: { mes: b.mes },
      create: { mes: b.mes, ...envio },
      update: { ...envio, recebidoEm: new Date() },
    }),
  ])
  return { ok: true as const, mes: b.mes, mudou: true, ...contagens }
}

/**
 * As FALTAS do período — `null` quando a janela não toca o que o Fluxo cobre
 * (antes de `FLUXO_DESDE`, ou nenhum envio ainda): aí a tela diz "sem fonte",
 * nunca zero. Zero falta é elogio, e só se diz de janela medida.
 * `personKeys` = só estas pessoas (o setor, a ficha); `null` = todas no alcance.
 */
export async function faltasNoPeriodo(
  prisma: PrismaClient, fromDay: string, toDay: string, personKeys: string[] | null,
): Promise<{ total: number; injustificadas: number; justificadas: number } | null> {
  const ultimo = (await prisma.fluxoDisciplinaEnvio.aggregate({ _max: { medidoAte: true } }))._max.medidoAte
  if (!ultimo || toDay < FLUXO_DESDE || fromDay > ultimo) return null
  const porTipo = await prisma.faltaDoFluxo.groupBy({
    by: ['tipo'],
    where: { dia: { gte: fromDay, lte: toDay }, ...(personKeys ? { personKey: { in: personKeys } } : {}) },
    _count: { _all: true },
  })
  const n = (t: string) => porTipo.find((r) => r.tipo === t)?._count._all ?? 0
  return { total: n('injustificada') + n('justificada'), injustificadas: n('injustificada'), justificadas: n('justificada') }
}
