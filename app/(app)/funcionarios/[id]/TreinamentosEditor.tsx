'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, X } from 'lucide-react'
import type { TrainingItem } from '@/lib/mock/data'

/** Exibe e edita Cursos/treinamentos + Certificações (listas livres) na ficha. */
export default function TreinamentosEditor({ nexusUserId, cursos, certs }: {
  nexusUserId: string | null; cursos: TrainingItem[]; certs: TrainingItem[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [dCursos, setDCursos] = useState<TrainingItem[]>([])
  const [dCerts, setDCerts] = useState<TrainingItem[]>([])
  const [busy, setBusy] = useState(false)

  function start() {
    setDCursos(cursos.length ? cursos.map((c) => ({ ...c })) : [])
    setDCerts(certs.length ? certs.map((c) => ({ ...c })) : [])
    setEditing(true)
  }
  async function save() {
    setBusy(true)
    try {
      await fetch('/api/admin/training-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexusUserId, cursos: dCursos, certs: dCerts }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: '4px 0 12px' }
  const card: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px' }
  const field: React.CSSProperties = { height: 34, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }

  // ── Modo edição ──────────────────────────────────────────
  if (editing) {
    const rows = (list: TrainingItem[], set: (v: TrainingItem[]) => void, addLabel: string, ph: string) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {list.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder={ph} value={it.nome} onChange={(e) => set(list.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} style={{ ...field, flex: 1, minWidth: 220 }} />
            <input placeholder="Ano" value={it.ano} onChange={(e) => set(list.map((x, j) => j === i ? { ...x, ano: e.target.value } : x))} style={{ ...field, width: 110 }} />
            <button onClick={() => set(list.filter((_, j) => j !== i))} title="Remover" className="tc-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}><X size={15} /></button>
          </div>
        ))}
        <button onClick={() => set([...list, { nome: '', ano: '' }])} className="tc-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Plus size={14} /> {addLabel}</button>
      </div>
    )
    return (
      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, background: 'var(--surface-2)' }}>
        <div style={sectionTitle}>Cursos &amp; treinamentos</div>
        {rows(dCursos, setDCursos, 'Adicionar curso', 'Nome do curso / treinamento')}
        <div style={{ ...sectionTitle, marginTop: 16 }}>Certificações</div>
        {rows(dCerts, setDCerts, 'Adicionar certificação', 'Nome da certificação')}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={() => setEditing(false)} className="tc-btn" style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button disabled={busy} onClick={save} className="tc-btn" style={{ background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>Salvar</button>
        </div>
      </div>
    )
  }

  // ── Modo exibição ────────────────────────────────────────
  return (
    <div style={{ marginTop: 22 }}>
      <div style={sectionTitle}>Cursos &amp; treinamentos</div>
      {cursos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cursos.map((c, i) => (
            <div key={i} style={card}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
              {c.ano && <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{c.ano}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px' }}>Nenhum curso/treinamento cadastrado.</div>
      )}

      <div style={{ ...sectionTitle, marginTop: 18 }}>Certificações</div>
      {certs.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {certs.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 13px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.nome}</span>
              {c.ano && <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{c.ano}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px' }}>Nenhuma certificação cadastrada.</div>
      )}

      {nexusUserId && (
        <button onClick={start} className="tc-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 14, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Pencil size={14} /> Editar cursos e certificações
        </button>
      )}
    </div>
  )
}
