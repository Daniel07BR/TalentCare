/* ============================================================
   TalentCare — CHAT INTERNO (dados REAIS). Puro em função de data.
   Aceita override por período (Map nexusUserId → ChatStat); sem ele, usa o
   acumulado (e.chat).

   ⚠️⚠️ SÓ MENSAGEM MORA AQUI desde 17/09/2026. Os CHAMADOS eram do Chat e
   mudaram de casa em 16/09/2026 (foram para o Fluxo, `lib/mock/fluxo.ts`) — e
   aqui não ficou nem uma cópia: duas telas somando o mesmo pedido, uma parada
   no dia da migração, é o defeito que ninguém percebe até o número divergir.

   ⚠️ Mensagem é VITRINE: NÃO entra no score (ver `activityOf()`). É a métrica
   mais fácil de subir e a que menos diz sobre entrega.
   ============================================================ */
import type { TalentData, ChatStat } from './data'
import { zeroChat } from './data'
import { deptName } from './employee'

export type ChatUsage = Map<string, ChatStat>

export type ChatPerson = {
  id: string; nome: string; cargo: string; dept: string
  initials: string; color: string; hasAvatar: boolean
  stat: ChatStat
  mensagens: number
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
})

export function chatVM(data: TalentData, period?: ChatUsage) {
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
    }
  })

  const totais = pessoas.reduce((a, p) => soma(a, p.stat), zeroChat())
  const totalMensagens = totais.msgCanais + totais.msgDiretas + totais.msgChamados

  const conversa = pessoas.filter((p) => p.mensagens > 0).sort((a, b) => b.mensagens - a.mensagens)

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

  return {
    totais,
    totalMensagens,
    pessoas,
    conversa,
    conversaPessoas: conversa.length,
    msgBars: bars((s) => s.msgCanais + s.msgDiretas + s.msgChamados),
  }
}
