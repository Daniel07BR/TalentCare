'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Row = {
  id: string; nome: string; level: string | null; detail: string | null; sexo: string | null
  confidence: string; status: string; suggestionNexusId: string | null; matchedNexusId: string | null
}
type Opt = { id: string; label: string }

export default function EducationLinker({ rows, options, nameById }: { rows: Row[]; options: Opt[]; nameById: Record<string, string> }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [sel, setSel] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.id, r.matchedNexusId ?? r.suggestionNexusId ?? ''])),
  )

  async function link(id: string, nexusUserId: string | null) {
    setBusy(id)
    try {
      await fetch('/api/admin/education-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId: id, nexusUserId }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const applied = rows.filter((r) => r.status === 'applied')
  const review = rows.filter((r) => r.status !== 'applied' && r.confidence === 'review')
  const none = rows.filter((r) => r.status !== 'applied' && r.confidence !== 'review')

  const confChip = (c: string) => {
    const m: Record<string, [string, string, string]> = {
      review: ['Revisar', 'var(--warning)', 'rgba(245,166,35,.14)'],
      none: ['Sem palpite', 'var(--danger)', 'rgba(229,72,77,.13)'],
      strong: ['Forte', 'var(--success)', 'rgba(63,178,85,.13)'],
    }
    const [t, color, bg] = m[c] ?? m.none
    return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 9px', borderRadius: 20 }}>{t}</span>
  }

  const Select = ({ r }: { r: Row }) => (
    <select value={sel[r.id] ?? ''} onChange={(e) => setSel((s) => ({ ...s, [r.id]: e.target.value }))}
      style={{ height: 36, minWidth: 240, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
      <option value="">— escolher funcionário —</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  )

  const PendingRow = ({ r }: { r: Row }) => (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{r.nome}</span> {confChip(r.confidence)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
          {r.level}{r.detail ? ` · ${r.detail}` : ''}
        </div>
      </div>
      <Select r={r} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={busy === r.id || !sel[r.id]} onClick={() => link(r.id, sel[r.id])} className="tc-btn"
          style={{ background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy === r.id || !sel[r.id] ? 0.55 : 1 }}>Vincular</button>
        <button disabled={busy === r.id} onClick={() => link(r.id, '')} className="tc-btn"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 13px', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit' }}>Ignorar</button>
      </div>
    </div>
  )

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Importação · planilha de RH</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Escolaridade — vínculo</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Vinculados', value: applied.length, color: 'var(--success)' },
          { label: 'A revisar', value: review.length, color: 'var(--warning)' },
          { label: 'Sem correspondência', value: none.length, color: 'var(--danger)' },
        ].map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {review.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>A revisar <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· confirme o funcionário sugerido ou troque</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {review.map((r) => <PendingRow key={r.id} r={r} />)}
          </div>
        </>
      )}

      {none.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Sem correspondência <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· nenhum palpite — escolha manualmente ou ignore</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {none.map((r) => <PendingRow key={r.id} r={r} />)}
          </div>
        </>
      )}

      {applied.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Vinculados <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {applied.length} aplicados</span></div>
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {applied.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-mute)' }}> → {r.matchedNexusId ? nameById[r.matchedNexusId] ?? '—' : '—'}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 'none' }}>{r.level}</span>
                <button disabled={busy === r.id} onClick={() => link(r.id, '')} className="tc-btn"
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 11px', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit' }}>Desfazer</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
