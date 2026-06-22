/* ============================================================
   TalentCare — diretório de funcionários (filtro/ordenação)
   Porte do dirVM; estado (filtros/sort) vive na página cliente.
   ============================================================ */
import { buildData, scoreColor, statusMeta, fmtTempo } from './data'
import { deptName } from './employee'

export type DirFilters = {
  search: string
  dept: string      // 'Todos' | dept id
  status: string    // 'Todos' | 'Ativo' | 'Férias' | 'Afastado' | 'Desligado'
  faixa: string     // 'Todos' | '75–100' | '50–74' | '0–49'
}
export type SortKey = 'nome' | 'cargo' | 'dept' | 'tempoMeses' | 'score' | 'status'
export type SortDir = 'asc' | 'desc'

export type DirRow = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string
  score: number; scoreColor: string; scorePct: string; status: string; statusColor: string; statusBg: string; tempo: string
}

export const DIR_COLS: { key: SortKey; label: string }[] = [
  { key: 'nome', label: 'Funcionário' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'dept', label: 'Depto' },
  { key: 'tempoMeses', label: 'Tempo' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
]

export function deptOptions() {
  const D = buildData()
  return [{ value: 'Todos', label: 'Todos os setores' }, ...D.departments.map((d) => ({ value: d.id, label: d.nome }))]
}

export function filterDirectory(f: DirFilters, sortKey: SortKey, sortDir: SortDir): { rows: DirRow[]; total: number } {
  const D = buildData()
  const q = (f.search || '').toLowerCase()
  let rows = D.employees.filter((e) => {
    if (f.dept !== 'Todos' && e.dept !== f.dept) return false
    if (f.status !== 'Todos' && e.status !== f.status) return false
    if (f.faixa === '75–100' && e.score < 75) return false
    if (f.faixa === '50–74' && (e.score < 50 || e.score > 74)) return false
    if (f.faixa === '0–49' && e.score >= 50) return false
    if (q && !(e.nome.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q) || deptName(e.dept).toLowerCase().includes(q))) return false
    return true
  })
  const dir = sortDir === 'asc' ? 1 : -1
  rows = rows.slice().sort((a, b) => {
    let va: string | number, vb: string | number
    if (sortKey === 'nome') { va = a.nome; vb = b.nome }
    else if (sortKey === 'cargo') { va = a.cargo; vb = b.cargo }
    else if (sortKey === 'dept') { va = deptName(a.dept); vb = deptName(b.dept) }
    else if (sortKey === 'status') { va = a.status; vb = b.status }
    else { va = a[sortKey] as number; vb = b[sortKey] as number }
    if (typeof va === 'string') return va.localeCompare(vb as string) * dir
    return (va - (vb as number)) * dir
  })
  const out: DirRow[] = rows.map((e) => {
    const sm = statusMeta(e.status)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(e.dept), initials: e.initials, color: e.color,
      score: e.score, scoreColor: scoreColor(e.score), scorePct: e.score + '%',
      status: e.status, statusColor: sm.color, statusBg: sm.bg, tempo: fmtTempo(e.tempoMeses),
    }
  })
  return { rows: out, total: D.employees.length }
}
