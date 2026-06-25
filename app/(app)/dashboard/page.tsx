'use client'
import { useRouter } from 'next/navigation'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import { buildDashboard } from '@/lib/mock/dashboard'
import { generationsVM, genderVM } from '@/lib/mock/demographics'
import Avatar from '../Avatar'
import WhatsappDeptCard from './WhatsappDeptCard'
import RadioDeptCard from './RadioDeptCard'
import ClassroomDeptCard from './ClassroomDeptCard'
import ConsultoriaDeptCard from './ConsultoriaDeptCard'

export default function DashboardPage() {
  const { period } = usePeriod()
  const router = useRouter()
  const data = useTalentData()
  const vm = buildDashboard(data, period)
  const gen = generationsVM(data).overall
  const gend = genderVM(data).overall

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

      {/* Atendimentos por departamento (WhatsApp) + Curva de turnover */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16 }}>
        <WhatsappDeptCard />

        <div className="tc-card" onClick={() => router.push('/turnover')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Curva de turnover</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Últimos 12 meses · ver relatório</div>
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
              <div key={r.id} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{r.rank}</span>
                <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.cargo}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.scoreColor, fontVariantNumeric: 'tabular-nums' }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" onClick={() => router.push('/formacao')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Distribuição por escolaridade</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{vm.headcountTotal} colaboradores</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>ver ›</span>
          </div>
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

        <div className="tc-card" onClick={() => router.push('/geracoes')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Gerações</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Idade média: <b style={{ color: 'var(--text)' }}>{gen.avg ?? '—'}</b> anos</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>ver ›</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', margin: '16px 0 14px' }}>
            {gen.segs.map((s) => <div key={s.key} title={`${s.label} · ${s.desc}`} style={{ width: `${s.pct}%`, background: s.color }} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {gen.segs.map((s) => (
              <div key={s.key} title={s.desc} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'help' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
                <span style={{ flex: 1, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.count}</span>
                <span style={{ color: 'var(--text-mute)', width: 34, textAlign: 'right' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparativo por gênero */}
      <div className="tc-card" onClick={() => router.push('/genero')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Comparativo por gênero</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Quadro ativo · {gend.m + gend.f} com gênero informado{gend.ni ? ` · ${gend.ni} sem informação` : ''}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>ver ›</span>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 16 }}>
          <div title={`Masculino: ${gend.m}`} style={{ width: `${gend.mPct}%`, background: 'var(--info)' }} />
          <div title={`Feminino: ${gend.f}`} style={{ width: `${gend.fPct}%`, background: 'var(--chart-5)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Masculino', color: 'var(--info)', count: gend.m, pct: gend.mPct, age: gend.avgM, score: gend.scoreM },
            { label: 'Feminino', color: 'var(--chart-5)', count: gend.f, pct: gend.fPct, age: gend.avgF, score: gend.scoreF },
          ].map((g) => (
            <div key={g.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: g.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: g.color, lineHeight: 1.1 }}>{g.count} <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>· {g.pct}%</span></div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Idade média</div><div style={{ fontSize: 15, fontWeight: 700 }}>{g.age ?? '—'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Score médio</div><div style={{ fontSize: 15, fontWeight: 700 }}>{g.score}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ClassRoom — cursos criados por departamento NO PERÍODO (dados reais, frente B) */}
      <ClassroomDeptCard />

      {/* Rádio Itamarathy — horas por departamento NO PERÍODO (dados reais, frente B) */}
      <RadioDeptCard />

      {/* Consultoria Plus — atividade por departamento NO PERÍODO (dados reais, frente B) */}
      <ConsultoriaDeptCard />
    </div>
  )
}
