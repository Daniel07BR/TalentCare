/* ============================================================
   TalentCare — CHAT INTERNO (dados REAIS, 8ª fonte). Puro em função de data.
   Aceita override por período (Map nexusUserId → ChatStat); sem ele, usa o
   acumulado (e.chat).

   ⚠️⚠️ A tela separa DUAS coisas que NÃO se somam:
     CONVERSA — mensagens em canal, em conversa direta e dentro de chamado.
                É vitrine: NÃO entra no score (ver `activityOf()`).
     CHAMADO  — pedido de um setor a outro: aberto, assumido, concluído. Esse
                entra no score, como o HelpDesk.

   ⚠️⚠️ E, no bloco por SETOR, "pediu" e "recebeu" são as duas faces do MESMO
   chamado (as colunas SOLICITANTE e RESPONSÁVEL da tela de chamados do chat).
   Somar as duas contaria a casa inteira duas vezes.
   ============================================================ */
import type { TalentData, ChatStat } from './data'
import { zeroChat } from './data'
import { deptName } from './employee'

export type ChatUsage = Map<string, ChatStat>

/** Uma linha do painel por setor — vem PRONTA da API (`/api/chat-metrics`),
 *  porque o setor do chamado é a FUNÇÃO gravada nele, e não o setor em que a
 *  pessoa está hoje. Reconstruir isso a partir das pessoas daria outro número
 *  toda vez que alguém trocasse de área. */
export type ChatSetor = {
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

export type ChatPerson = {
  id: string; nome: string; cargo: string; dept: string
  initials: string; color: string; hasAvatar: boolean
  stat: ChatStat
  mensagens: number
  chamados: number // abertos + concluídos (a conta que entra no score)
  tempoMedio: string
}

export type ChatDeptBar = { id: string; nome: string; color: string; valor: number; pct: string }

/** Segundos de EXPEDIENTE → texto. Mesma escada do HelpDesk, e o "d" aqui
 *  significa DIA DE TRABALHO (10 h), não 24 h — é a régua do chat. */
export function fmtDurUtil(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h >= 10) { const d = Math.floor(h / 10); return `${d}d ${h % 10}h` }
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}

const soma = (a: ChatStat, b: ChatStat): ChatStat => ({
  msgCanais: a.msgCanais + b.msgCanais,
  msgDiretas: a.msgDiretas + b.msgDiretas,
  msgChamados: a.msgChamados + b.msgChamados,
  chamadosAbertos: a.chamadosAbertos + b.chamadosAbertos,
  chamadosAssumidos: a.chamadosAssumidos + b.chamadosAssumidos,
  chamadosConcluidos: a.chamadosConcluidos + b.chamadosConcluidos,
  segundosResolucao: a.segundosResolucao + b.segundosResolucao,
})

export function chatVM(data: TalentData, period?: ChatUsage, setores: ChatSetor[] = []) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const statOf = (e: TalentData['employees'][number]): ChatStat => {
    if (period) return (e.nexusUserId ? period.get(e.nexusUserId) : undefined) ?? zeroChat()
    return e.chat
  }

  const pessoas: ChatPerson[] = data.employees.map((e) => {
    const stat = statOf(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, stat,
      mensagens: stat.msgCanais + stat.msgDiretas + stat.msgChamados,
      chamados: stat.chamadosAbertos + stat.chamadosConcluidos,
      tempoMedio: fmtDurUtil(stat.chamadosConcluidos ? Math.round(stat.segundosResolucao / stat.chamadosConcluidos) : 0),
    }
  })

  const totais = pessoas.reduce((a, p) => soma(a, p.stat), zeroChat())
  const totalMensagens = totais.msgCanais + totais.msgDiretas + totais.msgChamados

  const conversa = pessoas.filter((p) => p.mensagens > 0).sort((a, b) => b.mensagens - a.mensagens)
  const chamados = pessoas
    .filter((p) => p.chamados > 0 || p.stat.chamadosAssumidos > 0)
    .sort((a, b) => b.stat.chamadosConcluidos - a.stat.chamadosConcluidos || b.stat.chamadosAbertos - a.stat.chamadosAbertos)

  const bars = (pick: (s: ChatStat) => number): ChatDeptBar[] => {
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

  // Painel por setor: vem da API, e só ordena aqui. `escala` é o maior valor de
  // qualquer uma das quatro colunas — usar máximos diferentes por coluna faria
  // duas barras de tamanhos iguais representarem números diferentes.
  const porSetor = [...setores].sort(
    (a, b) => b.recebidosAbertos + b.recebidosConcluidos - (a.recebidosAbertos + a.recebidosConcluidos),
  )
  const escalaSetor = Math.max(1, ...porSetor.flatMap((s) => [
    s.pedidosAbertos, s.pedidosConcluidos, s.recebidosAbertos, s.recebidosConcluidos,
  ]))

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
    totalMensagens,
    pessoas,
    conversa,
    chamados,
    // Quem conversa e quem atende chamado são listas diferentes de gente.
    conversaPessoas: conversa.length,
    chamadoPessoas: chamados.length,
    tempoMedioGeral: fmtDurUtil(
      totais.chamadosConcluidos ? Math.round(totais.segundosResolucao / totais.chamadosConcluidos) : 0,
    ),
    msgBars: bars((s) => s.msgCanais + s.msgDiretas + s.msgChamados),
    chamadoBars: bars((s) => s.chamadosAbertos + s.chamadosConcluidos),
    porSetor,
    escalaSetor,
    totaisSetor,
    tempoMedioSetor: fmtDurUtil(
      totaisSetor.recebidosConcluidos ? Math.round(totaisSetor.segundosResolucao / totaisSetor.recebidosConcluidos) : 0,
    ),
  }
}
