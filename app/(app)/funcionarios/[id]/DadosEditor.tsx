'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'

/** Edita nascimento e admissão no cabeçalho da ficha (uma pessoa). */
export default function DadosEditor({ nexusUserId, birthISO, hireISO }: {
  nexusUserId: string | null; birthISO: string; hireISO: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [birth, setBirth] = useState(birthISO)
  const [entry, setEntry] = useState(hireISO)
  const [busy, setBusy] = useState(false)

  if (!nexusUserId) return null

  function start() { setBirth(birthISO); setEntry(hireISO); setEditing(true) }
  async function save() {
    setBusy(true)
    try {
      await fetch('/api/admin/personal-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexusUserId, birthDate: birth, entryDate: entry }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={start} title="Editar nascimento e admissão" className="tc-btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Pencil size={13} /> Editar datas
      </button>
    )
  }

  const field: React.CSSProperties = {
    height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', padding: '0 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-mute)', marginBottom: 3, display: 'block' }

  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
      <div>
        <label style={lbl}>Nascimento</label>
        <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} style={field} />
      </div>
      <div>
        <label style={lbl}>Admissão</label>
        <input type="date" value={entry} onChange={(e) => setEntry(e.target.value)} style={field} />
      </div>
      <button onClick={() => setEditing(false)} className="tc-btn" style={{ height: 34, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
      <button disabled={busy} onClick={save} className="tc-btn" style={{ height: 34, background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>Salvar</button>
    </div>
  )
}
