'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type PontoOption = { id: string; label: string }
export type PontoRow = { id: string; nome: string; depto: string | null; email: string | null; atrasos: number; advertencias: number; suggestionUserId: string }

export default function PontoLinker({ rows, options }: { rows: PontoRow[]; options: PontoOption[] }) {
  const router = useRouter()
  const [sel, setSel] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.suggestionUserId])))
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function act(row: PontoRow, action: 'link' | 'ignore') {
    setBusy(row.id); setMsg(null)
    try {
      const res = await fetch('/api/admin/ponto-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId: row.id, userId: sel[row.id] || '', action }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(d.error || 'Falha ao salvar'); setBusy(null); return }
      setMsg(action === 'link' ? `Vinculado: ${row.nome} → ${d.atrasos} atrasos / ${d.advertencias} advertências aplicados.` : `Ignorado: ${row.nome}.`)
      router.refresh()
    } catch {
      setMsg('Erro de rede.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Ponto · revisão de vínculos</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Casar pessoas do ponto</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5, maxWidth: 720 }}>
          Estas pessoas vieram do dump do ponto mas o nome não casou automaticamente com o diretório.
          Escolha o funcionário correspondente e clique <b>Vincular</b> — os atrasos e advertências delas
          entram para a pessoa certa. O vínculo é permanente (sobrevive a re-cargas).
        </p>
      </div>

      {msg && <div style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 14 }}>{msg}</div>}

      {rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 0', color: 'var(--text-dim)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(63,178,85,.13)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✓</div>
          <span style={{ fontSize: 13.5 }}>Tudo casado — nenhuma pessoa pendente.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{r.depto || 'sem setor'}{r.email ? ` · ${r.email}` : ''}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 3 }}>
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{r.atrasos}</span> atrasos · <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{r.advertencias}</span> advertências
                </div>
              </div>
              <select value={sel[r.id] ?? ''} onChange={(e) => setSel((s) => ({ ...s, [r.id]: e.target.value }))}
                style={{ flex: '1 1 240px', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', minWidth: 0 }}>
                <option value="">— escolher funcionário —</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                <button onClick={() => act(r, 'link')} disabled={busy === r.id || !sel[r.id]}
                  style={{ height: 38, padding: '0 16px', background: sel[r.id] ? 'var(--accent)' : 'var(--surface-3)', color: sel[r.id] ? '#1a1205' : 'var(--text-mute)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: sel[r.id] ? 'pointer' : 'not-allowed' }}>
                  {busy === r.id ? '...' : 'Vincular'}
                </button>
                <button onClick={() => act(r, 'ignore')} disabled={busy === r.id}
                  style={{ height: 38, padding: '0 12px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Ignorar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
