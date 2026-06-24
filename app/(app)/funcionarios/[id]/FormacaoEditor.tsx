'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { ESC_COLOR } from '@/lib/mock/education'
import { EDU_TIPOS, loadItems, deriveLevelAndDetail, type EduItem } from '@/lib/education-edit'

/** Editor de formação embutido na ficha (uma pessoa). Some/abre via "Editar formação". */
export default function FormacaoEditor({ nexusUserId, level, detail }: {
  nexusUserId: string | null; level: string; detail: string | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EduItem[]>([])
  const [busy, setBusy] = useState(false)

  // Sem vínculo Nexus não há chave p/ salvar (contas locais).
  if (!nexusUserId) return null

  const has = (t: string) => draft.some((d) => d.tipo === t)
  const item = (t: string) => draft.find((d) => d.tipo === t)
  const toggle = (t: string) => setDraft((d) => has(t) ? d.filter((x) => x.tipo !== t) : [...d, { tipo: t, curso: '', cursando: false }])
  const patch = (t: string, p: Partial<EduItem>) => setDraft((d) => d.map((x) => x.tipo === t ? { ...x, ...p } : x))

  function start() {
    setDraft(loadItems({ level: level === 'Não informado' ? '' : level, detail }))
    setEditing(true)
  }
  async function save() {
    setBusy(true)
    try {
      await fetch('/api/admin/education-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nexusUserId, items: draft }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={start} className="tc-btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 4, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Pencil size={14} /> Editar formação
      </button>
    )
  }

  const preview = deriveLevelAndDetail(draft)
  const inputStyle: React.CSSProperties = {
    height: 34, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', padding: '0 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12, color: 'var(--text-dim)' }}>Marque os níveis e digite os cursos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
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
                  <input placeholder="Qual curso?" value={it?.curso ?? ''} onChange={(e) => patch(t.tipo, { curso: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={!!it?.cursando} onChange={(e) => patch(t.tipo, { cursando: e.target.checked })} style={{ width: 15, height: 15, accentColor: 'var(--info)', cursor: 'pointer' }} />
                    cursando
                  </label>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, fontSize: 11.5, color: 'var(--text-mute)' }}>
          Escolaridade: <b style={{ color: preview.level ? (ESC_COLOR[preview.level] ?? 'var(--text-dim)') : 'var(--text-mute)' }}>{preview.level ?? '— nenhuma —'}</b>
        </div>
        <button onClick={() => setEditing(false)} className="tc-btn" style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button disabled={busy} onClick={save} className="tc-btn" style={{ background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>Salvar</button>
      </div>
    </div>
  )
}
