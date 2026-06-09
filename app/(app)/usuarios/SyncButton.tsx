'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/sync-nexus', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha na sincronização')
      setMsg(`+${data.created} novos · ${data.updated} atualizados · ${data.deactivated} inativados`)
      router.refresh()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {msg && <span className="count-pill">{msg}</span>}
      <button className="btn-sm" onClick={sync} disabled={loading}>
        <RefreshCw size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        {loading ? 'Sincronizando…' : 'Sincronizar com Nexus'}
      </button>
    </div>
  )
}
