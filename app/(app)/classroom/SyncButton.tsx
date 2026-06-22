'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function SyncClassroomButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/sync-classroom', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Falha na sincronização')
      setMsg(`${data.synced} funcionários atualizados`)
      router.refresh()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {msg && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{msg}</span>}
      <button onClick={run} disabled={loading} className="tc-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 15px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
        <RefreshCw size={15} style={loading ? { animation: 'tcspin 1s linear infinite' } : undefined} /> {loading ? 'Sincronizando…' : 'Sincronizar ClassRoom'}
      </button>
      <style>{'@keyframes tcspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
