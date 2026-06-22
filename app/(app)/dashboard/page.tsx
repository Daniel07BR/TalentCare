'use client'
import { useRouter } from 'next/navigation'
import { usePeriod } from '@/lib/ui/period'
import { buildDashboard } from '@/lib/mock/dashboard'

export default function DashboardPage() {
  const { period } = usePeriod()
  const router = useRouter()
  const vm = buildDashboard(period)

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Painel Executivo</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Visão da Diretoria</h1>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'right', lineHeight: 1.5 }}>
          <div>Período: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{vm.periodLabel}</span></div>
          <div>Atualizado há 12 min</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        {vm.kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 118 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px' }}>{k.value}</span>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>{k.unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: k.deltaColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>{k.deltaArrow} {k.delta}</span>
              <svg width="64" height="26" viewBox="0 0 64 26" style={{ overflow: 'visible' }}>
                <polyline points={k.spark} fill="none" stroke={k.sparkColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Performance por departamento + Curva de turnover */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Performance por departamento</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Score médio agregado (0–100)</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px' }}>{vm.deptCount} setores</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {vm.deptBars.map((d) => (
              <div key={d.id} className="tc-row" onClick={() => router.push('/departamentos')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 6, padding: '2px 4px', margin: '-2px -4px' }}>
                <div style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                  <div className="cbar" style={{ height: '100%', width: d.pct, background: d.color, borderRadius: 20 }} />
                </div>
                <div style={{ width: 34, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.score}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Curva de turnover</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Últimos 12 meses</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>{vm.turnoverNow}%</span>
          </div>
          <svg viewBox="0 0 320 150" preserveAspectRatio="none" style={{ width: '100%', height: 160, marginTop: 'auto' }}>
            <line x1="0" y1="37" x2="320" y2="37" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1="75" x2="320" y2="75" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1="113" x2="320" y2="113" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <path d={vm.turnoverArea} fill="url(#tgrad)" opacity="0.5" />
            <path d={vm.turnoverLine} fill="none" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-mute)', marginTop: 6 }}>
            <span>Jul</span><span>Out</span><span>Jan</span><span>Abr</span><span>Jun</span>
          </div>
        </div>
      </div>

      {/* Ranking + Escolaridade + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ranking de pessoas</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Top &amp; bottom por score</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {vm.rankList.map((r) => (
              <div key={r.id} className="tc-row" onClick={() => router.push('/funcionarios')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{r.rank}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#fff', flex: 'none' }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.cargo}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.scoreColor, fontVariantNumeric: 'tabular-nums' }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Distribuição por escolaridade</div>
          <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{vm.headcountTotal} colaboradores</div>
          <div style={{ position: 'relative', width: 150, height: 150 }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-2)" strokeWidth="13" />
              {vm.escSegments.map((s) => (
                <circle key={s.label} cx="60" cy="60" r="46" fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={s.dash} strokeDashoffset={s.offset} strokeLinecap="butt" />
              ))}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{vm.escTopPct}%</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{vm.escTopLabel}</span>
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
            {vm.escSegments.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
                <span style={{ flex: 1, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Alertas &amp; marcos</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Eventos do período</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {vm.alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, marginTop: 5, flex: 'none', boxShadow: `0 0 0 4px ${a.glow}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
