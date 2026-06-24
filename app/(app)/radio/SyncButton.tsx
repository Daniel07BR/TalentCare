'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function SyncRadioButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/sync-radio', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Falha na sincronização')
      setMsg(`${data.synced} ouvintes atualizados`)
      router.refresh()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {msg && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{msg}</span>}
      <button onClick={run} disabled={loading} className="tc-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
        <RefreshCw size={14} style={loading ? { animation: 'tcspin 1s linear infinite' } : undefined} /> {loading ? 'Sincronizando…' : 'Sincronizar'}
      </button>
      <style>{'@keyframes tcspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
