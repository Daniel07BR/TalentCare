/* ============================================================
   TalentCare — Assiduidade (ponto, dados REAIS). Puro em função de data.
   Aceita um override por período (Map personKey → {atrasos,abonados,minutos,
   advertencias}); sem ele, usa o acumulado (Employee.atrasos/atrasosAbon/
   minutosAtraso/advertencias). Mesmos cálculos servem a página com filtro de
   dias e a visão acumulada — espelha o padrão de radioVM.
   ============================================================ */
import type { TalentData } from './data'
import { deptName } from './employee'

export type PeriodAssid = Map<string, { atrasos: number; abonados: number; minutos: number; advertencias: number }>

export type AssidPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean
  atrasos: number; abonados: number; minutos: number; advertencias: number; assid: number
}
export type AssidDeptBar = { id: string; nome: string; color: string; atrasos: number; advertencias: number; minutos: number; pct: string }
export type AssidDeptGroup = { id: string; nome: string; color: string; atrasos: number; advertencias: number; users: AssidPerson[] }

export const personKeyOf = (e: TalentData['employees'][number]) => e.nexusUserId ?? e.id
export const assidPct = (atrasos: number, advert: number) => Math.max(0, 100 - atrasos * 2 - advert * 5)

export function assiduidadeVM(data: TalentData, period?: PeriodAssid) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const stat = (e: TalentData['employees'][number]) => {
    // Advertência = registro disciplinar CUMULATIVO → sempre acumulado (não filtra
    // por período; senão o histórico — que praticamente parou em abr/2026 — some).
    const advertencias = e.advertencias
    if (period) {
      const p = period.get(personKeyOf(e))
      return { atrasos: p?.atrasos ?? 0, abonados: p?.abonados ?? 0, minutos: p?.minutos ?? 0, advertencias }
    }
    return { atrasos: e.atrasos, abonados: e.atrasosAbon, minutos: e.minutosAtraso, advertencias }
  }

  // Só o quadro ATIVO (desligado não entra no painel de assiduidade).
  const ativos = data.employees.filter((e) => e.status !== 'Desligado')

  const person = (e: TalentData['employees'][number]): AssidPerson => {
    const s = stat(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
      atrasos: s.atrasos, abonados: s.abonados, minutos: s.minutos, advertencias: s.advertencias,
      assid: assidPct(s.atrasos, s.advertencias),
    }
  }

  const all = ativos.map(person)
  const comOcorrencia = all.filter((p) => p.atrasos > 0 || p.advertencias > 0 || p.abonados > 0)

  const totalAtrasos = all.reduce((a, p) => a + p.atrasos, 0)
  const totalAbonados = all.reduce((a, p) => a + p.abonados, 0)
  const totalMinutos = all.reduce((a, p) => a + p.minutos, 0)
  const totalAdvert = all.reduce((a, p) => a + p.advertencias, 0)
  const pessoas = comOcorrencia.length
  // Assiduidade média sobre quem TEM registro de ponto (evita inflar com 100% de
  // quem não é controlado por ponto). Sem ninguém com ocorrência → 100%.
  const assidMedio = comOcorrencia.length
    ? Math.round(comOcorrencia.reduce((a, p) => a + p.assid, 0) / comOcorrencia.length)
    : 100

  const topAtrasos = [...comOcorrencia].filter((p) => p.atrasos > 0).sort((a, b) => b.atrasos - a.atrasos || b.minutos - a.minutos).slice(0, 5)
  const topAdvert = [...comOcorrencia].filter((p) => p.advertencias > 0).sort((a, b) => b.advertencias - a.advertencias).slice(0, 5)
  const byUser = [...comOcorrencia].sort((a, b) => b.atrasos - a.atrasos || b.advertencias - a.advertencias || b.minutos - a.minutos)

  // Por departamento (a partir dos ativos, p/ ter o deptId).
  const byDeptMap = new Map<string, AssidDeptGroup>()
  for (const e of ativos) {
    const p = person(e)
    if (p.atrasos <= 0 && p.advertencias <= 0 && p.abonados <= 0) continue
    let g = byDeptMap.get(e.dept)
    if (!g) {
      g = { id: e.dept, nome: deptName(data, e.dept), color: colorOf.get(e.dept) ?? 'var(--chart-1)', atrasos: 0, advertencias: 0, users: [] }
      byDeptMap.set(e.dept, g)
    }
    g.atrasos += p.atrasos
    g.advertencias += p.advertencias
    g.users.push(p)
  }
  const byDept: AssidDeptGroup[] = [...byDeptMap.values()]
    .map((g) => ({ ...g, users: g.users.sort((a, b) => b.atrasos - a.atrasos || b.advertencias - a.advertencias) }))
    .sort((a, b) => b.atrasos - a.atrasos)

  const maxA = Math.max(1, ...byDept.map((d) => d.atrasos))
  const deptBars: AssidDeptBar[] = byDept.map((d) => ({
    id: d.id, nome: d.nome, color: d.color, atrasos: d.atrasos, advertencias: d.advertencias,
    minutos: d.users.reduce((a, p) => a + p.minutos, 0),
    pct: Math.round((d.atrasos / maxA) * 100) + '%',
  }))

  return {
    totalAtrasos, totalAbonados, totalMinutos, totalAdvert, pessoas, assidMedio,
    deptBars, deptCount: deptBars.length, byUser, byDept, topAtrasos, topAdvert,
  }
}

// Formata minutos → "Xh Ymin" / "Ymin".
export function fmtMin(min: number): string {
  if (!min) return '0min'
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}
