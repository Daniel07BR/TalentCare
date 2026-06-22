'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { ESC_RANK, ESC_COLOR } from '@/lib/mock/education'

export type ManualPerson = { id: string; name: string; username: string | null; dept: string; level: string; detail: string }

const LEVELS = ESC_RANK.filter((l) => l !== 'Não informado')

export default function EducationManual({ people }: { people: ManualPerson[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { level: string; detail: string }>>(
    Object.fromEntries(people.map((p) => [p.id, { level: p.level, detail: p.detail }])),
  )

  async function save(id: string) {
    setBusy(id)
    try {
      const e = edits[id]
      await fetch('/api/admin/education-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexusUserId: id, level: e.level, detail: e.detail }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const ql = q.trim().toLowerCase()
  const list = people
    .filter((p) => !ql || p.name.toLowerCase().includes(ql) || (p.username ?? '').toLowerCase().includes(ql) || p.dept.toLowerCase().includes(ql))
    .sort((a, b) => (a.level ? 1 : 0) - (b.level ? 1 : 0) || a.name.localeCompare(b.name))
  const semInfo = people.filter((p) => !p.level).length

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '32px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Editar escolaridade</h2>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Preencha ou ajuste o nível de cada funcionário ({semInfo} sem informação)</div>
        </div>
        <div style={{ position: 'relative', minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex' }}><Search size={16} /></span>
          <input placeholder="Buscar funcionário…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 38px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {list.map((p) => {
          const e = edits[p.id]
          const changed = e.level !== p.level || e.detail !== p.detail
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  {!p.level && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9aa1ac', flex: 'none' }} title="sem escolaridade" />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{p.username ? `${p.username} · ` : ''}{p.dept}</div>
              </div>
              <select value={e.level} onChange={(ev) => setEdits((s) => ({ ...s, [p.id]: { ...s[p.id], level: ev.target.value } }))}
                style={{ height: 36, minWidth: 190, background: 'var(--surface-2)', border: `1px solid ${e.level ? ESC_COLOR[e.level] ?? 'var(--border)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                <option value="">— sem informação —</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input placeholder="curso / detalhe (opcional)" value={e.detail} onChange={(ev) => setEdits((s) => ({ ...s, [p.id]: { ...s[p.id], detail: ev.target.value } }))}
                style={{ flex: 1, minWidth: 200, height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              <button disabled={!changed || busy === p.id} onClick={() => save(p.id)} className="tc-btn"
                style={{ background: changed ? 'var(--accent)' : 'var(--surface-2)', color: changed ? '#1a1205' : 'var(--text-dim)', border: changed ? 'none' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: changed ? 'pointer' : 'default', fontFamily: 'inherit', opacity: busy === p.id ? 0.6 : 1 }}>Salvar</button>
            </div>
          )
        })}
        {list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Nenhum funcionário encontrado.</div>}
      </div>
    </div>
  )
}
