/* ============================================================
   TalentCare — HelpDesk (dados REAIS, frente B). Puro em função de data.
   Aceita override por período (Map nexusUserId → {opened,resolved,resolvedSeconds});
   sem ele, usa o acumulado (e.helpdesk). Mesmo padrão dos demais VMs.
   Métricas SEMPRE separadas: chamados abertos (solicitante) e resolvidos (responsável).
   ============================================================ */
import type { TalentData, HelpdeskStat } from './data'
import { deptName } from './employee'

export type HelpdeskUsage = Map<string, HelpdeskStat>

// resolved = total exibido (normais + formalizados). resolvedNormal = só fluxo
// normal (base do tempo médio). formalized = serviços formalizados.
export type HelpdeskTotals = { opened: number; resolved: number; formalized: number; resolvedNormal: number; resolvedSeconds: number }
export type HelpdeskDeptBar = {
  id: string; nome: string; color: string; opened: number; resolved: number
}
export type HelpdeskPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean
  opened: number; resolved: number; formalized: number; resolvedNormal: number; resolvedSeconds: number; tempoMedio: string
}
export type HelpdeskDeptGroup = {
  id: string; nome: string; color: string; opened: number; resolved: number; users: HelpdeskPerson[]
}

export function fmtDur(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h` }
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}

export function helpdeskVM(data: TalentData, period?: HelpdeskUsage) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const stat = (e: TalentData['employees'][number]): HelpdeskStat => {
    if (period) {
      const p = e.nexusUserId ? period.get(e.nexusUserId) : undefined
      return { opened: p?.opened ?? 0, resolved: p?.resolved ?? 0, formalized: p?.formalized ?? 0, resolvedSeconds: p?.resolvedSeconds ?? 0 }
    }
    return e.helpdesk
  }

  const person = (e: TalentData['employees'][number]): HelpdeskPerson => {
    const s = stat(e)
    const resolvedNormal = s.resolved
    const resolvedTotal = s.resolved + s.formalized // formalizado conta como resolvido
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
      opened: s.opened, resolved: resolvedTotal, formalized: s.formalized, resolvedNormal, resolvedSeconds: s.resolvedSeconds,
      // tempo médio só sobre os resolvidos NORMAIS (formalizado é retroativo, ~0).
      tempoMedio: fmtDur(resolvedNormal ? Math.round(s.resolvedSeconds / resolvedNormal) : 0),
    }
  }

  const byUser: HelpdeskPerson[] = data.employees
    .map(person)
    .filter((p) => p.opened > 0 || p.resolved > 0)
    .sort((a, b) => b.resolved - a.resolved || b.opened - a.opened)
  const ativos = byUser.length

  const totals: HelpdeskTotals = byUser.reduce(
    (a, p) => ({
      opened: a.opened + p.opened,
      resolved: a.resolved + p.resolved,
      formalized: a.formalized + p.formalized,
      resolvedNormal: a.resolvedNormal + p.resolvedNormal,
      resolvedSeconds: a.resolvedSeconds + p.resolvedSeconds,
    }),
    { opened: 0, resolved: 0, formalized: 0, resolvedNormal: 0, resolvedSeconds: 0 },
  )
  const tempoMedioGeral = fmtDur(totals.resolvedNormal ? Math.round(totals.resolvedSeconds / totals.resolvedNormal) : 0)

  // Leaderboards separados: quem mais abre chamado e quem mais resolve.
  const maisAbriu = [...byUser].filter((p) => p.opened > 0).sort((a, b) => b.opened - a.opened).slice(0, 5)
  const maisResolveu = [...byUser].filter((p) => p.resolved > 0).sort((a, b) => b.resolved - a.resolved).slice(0, 5)

  // Agrega por departamento.
  const byDeptMap = new Map<string, HelpdeskDeptGroup>()
  for (const e of data.employees) {
    const s = stat(e)
    if (s.opened <= 0 && s.resolved <= 0 && s.formalized <= 0) continue
    let g = byDeptMap.get(e.dept)
    if (!g) {
      g = { id: e.dept, nome: deptName(data, e.dept), color: colorOf.get(e.dept) ?? 'var(--chart-4)', opened: 0, resolved: 0, users: [] }
      byDeptMap.set(e.dept, g)
    }
    g.opened += s.opened
    g.resolved += s.resolved + s.formalized // formalizado conta como resolvido
    g.users.push(person(e))
  }
  const groups = [...byDeptMap.values()]
    .map((g) => ({ ...g, users: g.users.sort((a, b) => b.resolved - a.resolved || b.opened - a.opened) }))
    .sort((a, b) => b.opened + b.resolved - (a.opened + a.resolved))

  const deptBars: HelpdeskDeptBar[] = groups.map((d) => ({ id: d.id, nome: d.nome, color: d.color, opened: d.opened, resolved: d.resolved }))
  const byDept: HelpdeskDeptGroup[] = groups

  return { totals, tempoMedioGeral, ativos, deptBars, deptCount: deptBars.length, byUser, byDept, maisAbriu, maisResolveu }
}
