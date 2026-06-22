'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { filterDirectory, deptOptions, DIR_COLS, type DirFilters, type SortKey, type SortDir } from '@/lib/mock/directory'

const STATUS_CHIPS = ['Todos', 'Ativo', 'Férias', 'Afastado', 'Desligado']
const FAIXA_CHIPS = ['Todos', '75–100', '50–74', '0–49']

export default function FuncionariosPage() {
  const router = useRouter()
  const [f, setF] = useState<DirFilters>({ search: '', dept: 'Todos', status: 'Todos', faixa: 'Todos' })
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { rows, total } = filterDirectory(f, sortKey, sortDir)
  const depts = deptOptions()
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(k); setSortDir('desc') }
  }
  const cols = '2.4fr 2fr 1.3fr 1.3fr 1.4fr 1.2fr'

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Diretório</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Funcionários</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex' }}><Search size={16} /></span>
          <input placeholder="Buscar por nome ou cargo…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} style={{ width: '100%', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 38px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <select value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} style={{ height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          {depts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {STATUS_CHIPS.map((c) => <button key={c} className={'seg' + (f.status === c ? ' on' : '')} onClick={() => setF({ ...f, status: c })} style={{ fontSize: 12, padding: '6px 11px' }}>{c}</button>)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {FAIXA_CHIPS.map((c) => <button key={c} className={'seg' + (f.faixa === c ? ' on' : '')} onClick={() => setF({ ...f, faixa: c })} style={{ fontSize: 12, padding: '6px 11px' }}>{c}</button>)}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{rows.length} de {total} colaboradores</span>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {DIR_COLS.map((h) => (
            <button key={h.key} className={'dh' + (sortKey === h.key ? ' on' : '')} onClick={() => toggleSort(h.key)} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              {h.label} {sortKey === h.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.id} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flex: 'none' }}>{r.initials}</div>
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.cargo}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r.dept}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r.tempo}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 44, height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: r.scorePct, background: r.scoreColor, borderRadius: 20 }} /></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.scoreColor, fontVariantNumeric: 'tabular-nums' }}>{r.score}</span>
            </div>
            <span style={{ justifySelf: 'start', fontSize: 11.5, fontWeight: 600, color: r.statusColor, background: r.statusBg, padding: '3px 10px', borderRadius: 20 }}>{r.status}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Nenhum funcionário encontrado com esses filtros.</div>
        )}
      </div>
    </div>
  )
}
