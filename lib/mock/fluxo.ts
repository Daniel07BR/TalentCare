/* ============================================================
   TalentCare — FLUXO (dados REAIS, 9ª fonte): os CHAMADOS entre setores.
   Puro em função de data. Aceita override por período (Map nexusUserId →
   FluxoStat); sem ele, usa o acumulado (e.fluxo).

   ⚠️⚠️ ISTO ERA DO CHAT INTERNO até 16/09/2026, quando os chamados mudaram de
   casa com todas as funções. Os 105 pedidos migraram com a DATA ORIGINAL, então
   o histórico não tem buraco — e o Chat parou de ser lido para esta pergunta no
   mesmo dia, porque duas fontes para o mesmo chamado é uma a mais.

   ⚠️⚠️ DUAS COISAS QUE NÃO SE SOMAM, e a tela precisa dizer qual está olhando:

     CHAMADO — pedido de um setor a OUTRO (inclusive pela porta "Melhoria em um
               sistema"). É o que a tabela por setor conta.
     TAREFA  — delegada DENTRO do próprio setor. Conta na pessoa (é trabalho
               dela) e fica fora da tabela por setor: somada ali, viraria
               "pedido a outro setor" um trabalho que nunca saiu de casa.

   ⚠️⚠️ E, no bloco por SETOR, "pediu" e "recebeu" são as duas faces do MESMO
   chamado (as colunas SOLICITANTE e RESPONSÁVEL da tela do Fluxo). Somar as
   duas contaria a casa inteira duas vezes.
   ============================================================ */
import type { TalentData, FluxoStat } from './data'
import { zeroFluxo } from './data'
import { deptName } from './employee'

export type FluxoUsage = Map<string, FluxoStat>

/** Uma linha do painel por setor — vem PRONTA da API (`/api/fluxo-metrics`),
 *  porque o setor do chamado é o que ficou GRAVADO nele, e não o setor em que a
 *  pessoa está hoje. Reconstruir isso a partir das pessoas daria outro número
 *  toda vez que alguém trocasse de área. */
export type FluxoSetor = {
  nexusDepartmentId: string
  id: string | null
  nome: string
  pedidosAbertos: number
  pedidosConcluidos: number
  recebidosAbertos: number
  recebidosConcluidos: number
  recebidosCancelados: number
  segundosResolucao: number
}

export type FluxoPerson = {
  id: string; nome: string; cargo: string; dept: string
  initials: string; color: string; hasAvatar: boolean
  stat: FluxoStat
  /** abertos + concluídos — a conta que entra no score. */
  chamados: number
  tarefas: number
  tempoMedio: string
}

export type FluxoDeptBar = { id: string; nome: string; color: string; valor: number; pct: string }

/** Segundos de EXPEDIENTE → texto. O "d" aqui significa DIA DE TRABALHO (10 h),
 *  não 24 h — é a régua do Fluxo, e a mesma que o Chat usava. */
export function fmtDurUtil(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h >= 10) { const d = Math.floor(h / 10); return `${d}d ${h % 10}h` }
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}

const soma = (a: FluxoStat, b: FluxoStat): FluxoStat => ({
  chamadosAbertos: a.chamadosAbertos + b.chamadosAbertos,
  chamadosAssumidos: a.chamadosAssumidos + b.chamadosAssumidos,
  chamadosConcluidos: a.chamadosConcluidos + b.chamadosConcluidos,
  segundosResolucao: a.segundosResolucao + b.segundosResolucao,
  tarefasAbertas: a.tarefasAbertas + b.tarefasAbertas,
  tarefasAssumidas: a.tarefasAssumidas + b.tarefasAssumidas,
  tarefasConcluidas: a.tarefasConcluidas + b.tarefasConcluidas,
})

export function fluxoVM(data: TalentData, period?: FluxoUsage, setores: FluxoSetor[] = []) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const statOf = (e: TalentData['employees'][number]): FluxoStat => {
    if (period) return (e.nexusUserId ? period.get(e.nexusUserId) : undefined) ?? zeroFluxo()
    return e.fluxo
  }

  const pessoas: FluxoPerson[] = data.employees.map((e) => {
    const stat = statOf(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, stat,
      chamados: stat.chamadosAbertos + stat.chamadosConcluidos,
      tarefas: stat.tarefasAbertas + stat.tarefasConcluidas,
      tempoMedio: fmtDurUtil(stat.chamadosConcluidos ? Math.round(stat.segundosResolucao / stat.chamadosConcluidos) : 0),
    }
  })

  const totais = pessoas.reduce((a, p) => soma(a, p.stat), zeroFluxo())

  const ativos = pessoas
    .filter((p) => p.chamados > 0 || p.stat.chamadosAssumidos > 0 || p.tarefas > 0 || p.stat.tarefasAssumidas > 0)
    .sort((a, b) => b.stat.chamadosConcluidos - a.stat.chamadosConcluidos || b.stat.chamadosAbertos - a.stat.chamadosAbertos)

  const bars = (pick: (s: FluxoStat) => number): FluxoDeptBar[] => {
    const m = new Map<string, { id: string; nome: string; color: string; valor: number }>()
    for (const e of data.employees) {
      const v = pick(statOf(e))
      if (v <= 0) continue
      const g = m.get(e.dept) ?? {
        id: e.dept, nome: deptName(data, e.dept),
        color: colorOf.get(e.dept) ?? 'var(--chart-3)', valor: 0,
      }
      g.valor += v
      m.set(e.dept, g)
    }
    const list = [...m.values()].sort((a, b) => b.valor - a.valor)
    const max = Math.max(1, ...list.map((d) => d.valor))
    return list.map((d) => ({ ...d, pct: Math.round((d.valor / max) * 100) + '%' }))
  }

  // Painel por setor: vem da API, e só ordena aqui.
  const porSetor = [...setores].sort(
    (a, b) => b.recebidosAbertos + b.recebidosConcluidos - (a.recebidosAbertos + a.recebidosConcluidos),
  )

  const totaisSetor = porSetor.reduce(
    (a, s) => ({
      pedidosAbertos: a.pedidosAbertos + s.pedidosAbertos,
      pedidosConcluidos: a.pedidosConcluidos + s.pedidosConcluidos,
      recebidosAbertos: a.recebidosAbertos + s.recebidosAbertos,
      recebidosConcluidos: a.recebidosConcluidos + s.recebidosConcluidos,
      recebidosCancelados: a.recebidosCancelados + s.recebidosCancelados,
      segundosResolucao: a.segundosResolucao + s.segundosResolucao,
    }),
    { pedidosAbertos: 0, pedidosConcluidos: 0, recebidosAbertos: 0, recebidosConcluidos: 0, recebidosCancelados: 0, segundosResolucao: 0 },
  )

  return {
    totais,
    pessoas,
    ativos,
    /** Quantas pessoas moveram algum chamado ou tarefa no período. */
    pessoasAtivas: ativos.length,
    tempoMedioGeral: fmtDurUtil(
      totais.chamadosConcluidos ? Math.round(totais.segundosResolucao / totais.chamadosConcluidos) : 0,
    ),
    chamadoBars: bars((s) => s.chamadosAbertos + s.chamadosConcluidos),
    porSetor,
    totaisSetor,
    /** ⚠️ Tempo médio só dos CONCLUÍDOS que o setor atendeu. Cancelado fica
     *  fora: média com cancelado dentro premia quem desiste. */
    tempoMedioSetor: fmtDurUtil(
      totaisSetor.recebidosConcluidos ? Math.round(totaisSetor.segundosResolucao / totaisSetor.recebidosConcluidos) : 0,
    ),
  }
}
