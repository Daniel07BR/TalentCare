'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

type DeptRow = { name: string; color: string | null; abertos: number }

export default function WhatsappDeptCard() {
  const { period } = usePeriod()
  const [rows, setRows] = useState<DeptRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    fetch(`/api/whatsapp-by-dept?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Não foi possível carregar')
        return r.json()
      })
      .then((d: { departments: DeptRow[]; totalAbertos: number }) => {
        if (!alive) return
        setRows([...d.departments].filter((x) => x.abertos > 0).sort((a, b) => b.abertos - a.abertos))
        setTotal(d.totalAbertos)
      })
      .catch((e) => alive && setErr((e as Error).message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  const max = Math.max(1, ...(rows ?? []).map((d) => d.abertos))

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1.1 1.4 1.7 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.2Z" />
            </svg>
            Atendimentos por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>WhatsApp · chamados abertos no período</div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px' }}>
          {loading ? '…' : `${total.toLocaleString('pt-BR')} chamados`}
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : err ? (
        <div style={{ fontSize: 13, color: 'var(--danger)', padding: '12px 0' }}>{err}</div>
      ) : !rows || rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhum chamado no período.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {rows.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="cbar" style={{ height: '100%', width: `${(d.abertos / max) * 100}%`, background: d.color ?? 'var(--accent)', borderRadius: 20 }} />
              </div>
              <div style={{ width: 48, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.abertos.toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
