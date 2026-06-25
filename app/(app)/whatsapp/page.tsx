'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import Avatar from '../Avatar'

type Overview = {
  kpis: { pendingNow: number; openNow: number; abertos: number; finalizados: number; avgHandleSeconds: number }
  series: { day: string; abertos: number }[]
  attendants: { name: string; abertos: number }[]
}

const WppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1.1 1.4 1.7 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.2Z" />
  </svg>
)

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
function fmtDur(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return `${m}min`
}
const dayLabel = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)

export default function WhatsappPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const [ov, setOv] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/whatsapp-overview?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: Overview) => { if (alive) setOv(d) })
      .catch(() => alive && setOv(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [period])

  // Casa o nome do atendente com um funcionário (p/ foto), por nome normalizado.
  const empByName = useMemo(() => {
    const m = new Map<string, { id: string; hasAvatar: boolean; color: string }>()
    for (const e of data.employees) m.set(norm(e.nome), { id: e.id, hasAvatar: e.hasAvatar, color: e.color })
    return m
  }, [data])

  const kpis = ov?.kpis
  const maxBar = Math.max(1, ...(ov?.series ?? []).map((s) => s.abertos))
  const maxAtt = Math.max(1, ...(ov?.attendants ?? []).map((a) => a.abertos))

  const KPI = ({ label, value, accent }: { label: string; value: string | number; accent: string }) => (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 'var(--radius)', padding: '16px 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <WppIcon /> Atendimentos · WhatsApp
        </h1>
      </div>

      {loading && !ov ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '24px 0' }}>Carregando…</div>
      ) : !ov ? (
        <div style={{ fontSize: 13, color: 'var(--danger)', padding: '24px 0' }}>Não foi possível carregar.</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 16 }}>
            <KPI label="Sem atendimento (agora)" value={kpis!.pendingNow} accent="var(--danger)" />
            <KPI label="Em andamento (agora)" value={kpis!.openNow} accent="var(--warning)" />
            <KPI label="Abertos no período" value={kpis!.abertos.toLocaleString('pt-BR')} accent="var(--accent)" />
            <KPI label="Finalizados no período" value={kpis!.finalizados.toLocaleString('pt-BR')} accent="var(--success)" />
            <KPI label="Tempo médio" value={fmtDur(kpis!.avgHandleSeconds)} accent="var(--info)" />
          </div>

          {/* Série diária de abertos */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Atendimentos abertos no período</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>{kpis!.abertos.toLocaleString('pt-BR')} no total</div>
            {ov.series.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum atendimento no período.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
                {ov.series.map((s) => (
                  <div key={s.day} title={`${dayLabel(s.day)}: ${s.abertos}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div className="cbar" style={{ width: '100%', height: `${(s.abertos / maxBar) * 100}%`, minHeight: 2, background: 'var(--accent)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
            )}
            {ov.series.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--text-mute)' }}>
                <span>{dayLabel(ov.series[0].day)}</span>
                <span>{dayLabel(ov.series[ov.series.length - 1].day)}</span>
              </div>
            )}
          </div>

          {/* Top atendentes */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top atendentes</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Atendimentos abertos no período</div>
            {ov.attendants.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sem dados no período.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ov.attendants.map((a, i) => {
                  const emp = empByName.get(norm(a.name))
                  return (
                    <div
                      key={a.name}
                      className={emp ? 'tc-row' : undefined}
                      onClick={emp ? () => router.push(`/funcionarios/${emp.id}`) : undefined}
                      title={emp ? 'Ver perfil' : 'Atendente sem ficha no TalentCare'}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: emp ? 'pointer' : 'default', borderRadius: 8, padding: '3px 6px', margin: '-3px -6px' }}
                    >
                      <span style={{ width: 16, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
                      {emp ? (
                        <Avatar id={emp.id} hasAvatar={emp.hasAvatar} initials={initialsOf(a.name)} color={emp.color} size={26} />
                      ) : (
                        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(a.name)}</span>
                      )}
                      <div style={{ width: 150, flex: 'none', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ flex: 1, height: 10, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                        <div className="cbar" style={{ height: '100%', width: `${(a.abertos / maxAtt) * 100}%`, background: 'var(--accent)', borderRadius: 20 }} />
                      </div>
                      <div style={{ width: 44, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{a.abertos}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
