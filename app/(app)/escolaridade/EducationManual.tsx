'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { ESC_COLOR } from '@/lib/mock/education'
import { EDU_TIPOS, loadItems, deriveLevelAndDetail, type EduItem } from '@/lib/education-edit'

export type ManualPerson = {
  id: string; name: string; username: string | null; dept: string
  level: string; detail: string; raw: unknown
}

export default function EducationManual({ people }: { people: ManualPerson[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EduItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  function open(p: ManualPerson) {
    if (openId === p.id) { setOpenId(null); return }
    setOpenId(p.id)
    setDraft(loadItems({ level: p.level, detail: p.detail, raw: p.raw }))
  }

  const has = (tipo: string) => draft.some((d) => d.tipo === tipo)
  const item = (tipo: string) => draft.find((d) => d.tipo === tipo)

  function toggle(tipo: string) {
    setDraft((d) => has(tipo) ? d.filter((x) => x.tipo !== tipo) : [...d, { tipo, curso: '', cursando: false }])
  }
  function patch(tipo: string, p: Partial<EduItem>) {
    setDraft((d) => d.map((x) => x.tipo === tipo ? { ...x, ...p } : x))
  }

  async function save(id: string) {
    setBusy(id)
    try {
      await fetch('/api/admin/education-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexusUserId: id, items: draft }),
      })
      setOpenId(null)
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
  const preview = openId ? deriveLevelAndDetail(draft) : null

  const inputStyle: React.CSSProperties = {
    height: 34, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', padding: '0 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '32px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Editar formação</h2>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Marque os níveis e digite os cursos de cada funcionário ({semInfo} sem informação)</div>
        </div>
        <div style={{ position: 'relative', minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex' }}><Search size={16} /></span>
          <input placeholder="Buscar funcionário…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 38px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {list.map((p) => {
          const isOpen = openId === p.id
          return (
            <div key={p.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    {!p.level && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9aa1ac', flex: 'none' }} title="sem escolaridade" />}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{p.username ? `${p.username} · ` : ''}{p.dept}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1.4, minWidth: 200, flexWrap: 'wrap' }}>
                  {p.level
                    ? <span style={{ fontSize: 11.5, fontWeight: 600, color: ESC_COLOR[p.level] ?? 'var(--text-dim)', background: 'var(--surface-2)', borderRadius: 20, padding: '3px 10px' }}>{p.level}</span>
                    : <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>— sem informação —</span>}
                  {p.detail && <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{p.detail}</span>}
                </div>
                <button onClick={() => open(p)} className="tc-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Editar
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '4px 16px 18px', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 14 }}>
                    {EDU_TIPOS.map((t) => {
                      const on = has(t.tipo)
                      const it = item(t.tipo)
                      return (
                        <div key={t.tipo} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 168, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={on} onChange={() => toggle(t.tipo)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                            <span style={{ fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-dim)' }}>{t.tipo}</span>
                          </label>
                          {on && t.hasCourse && (
                            <>
                              <input placeholder="Qual curso?" value={it?.curso ?? ''} onChange={(e) => patch(t.tipo, { curso: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={!!it?.cursando} onChange={(e) => patch(t.tipo, { cursando: e.target.checked })} style={{ width: 15, height: 15, accentColor: 'var(--info)', cursor: 'pointer' }} />
                                cursando (não concluído)
                              </label>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200, fontSize: 11.5, color: 'var(--text-mute)' }}>
                      Escolaridade: <b style={{ color: preview?.level ? (ESC_COLOR[preview.level] ?? 'var(--text-dim)') : 'var(--text-mute)' }}>{preview?.level ?? '— nenhuma —'}</b>
                    </div>
                    <button onClick={() => setOpenId(null)} className="tc-btn" style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                    <button disabled={busy === p.id} onClick={() => save(p.id)} className="tc-btn" style={{ background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy === p.id ? 0.6 : 1 }}>Salvar</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Nenhum funcionário encontrado.</div>}
      </div>
    </div>
  )
}
