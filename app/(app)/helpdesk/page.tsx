'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useHelpdeskPeriod } from '@/lib/ui/helpdesk-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { helpdeskVM, type HelpdeskPerson } from '@/lib/mock/helpdesk'
import Avatar from '../Avatar'

const HdIcon = ({ size = 17, color = 'var(--chart-4)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 18 0" /><path d="M21 12v3a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3Z" /><path d="M3 12v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H3Z" />
  </svg>
)

export default function HelpdeskPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useHelpdeskPeriod()
  const vm = helpdeskVM(data, map ?? undefined)

  const kpis = [
    { label: 'Chamados abertos', value: vm.totals.opened.toLocaleString('pt-BR'), color: 'var(--info)', desc: 'Abertos pelos solicitantes' },
    { label: 'Chamados resolvidos', value: vm.totals.resolved.toLocaleString('pt-BR'), color: 'var(--success)', desc: 'Resolvidos pelos responsáveis' },
    { label: 'Tempo médio de resolução', value: vm.tempoMedioGeral, color: 'var(--chart-4)', desc: 'Da abertura ao fechamento' },
    { label: 'Pessoas com atividade', value: vm.ativos.toLocaleString('pt-BR'), color: 'var(--text)', desc: 'Solicitantes + responsáveis' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <HdIcon size={24} /> HelpDesk
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>{k.desc}</div>
          </div>
        ))}
      </div>

      {/* Dois leaderboards separados: quem mais abre e quem mais resolve */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        <Leaderboard title="Quem mais abre chamados" sub="Solicitantes" color="var(--info)" rows={vm.maisAbriu} metric="opened" router={router} />
        <Leaderboard title="Quem mais resolve" sub="Responsáveis (técnicos)" color="var(--success)" rows={vm.maisResolveu} metric="resolved" router={router} />
      </div>

      {/* Por departamento — abertos vs resolvidos */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chamados por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Abertos (solicitante) e resolvidos (responsável) por setor</div>
        {vm.deptBars.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem chamados no período.</div>
        ) : (
          <DeptTable rows={vm.deptBars} totals={vm.totals} onRow={(id) => router.push(`/departamentos/${id}`)} />
        )}
      </div>

      {/* Por usuário */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chamados por usuário</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.ativos} pessoas · abertos, resolvidos e tempo médio de resolução</div>
        {vm.byUser.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem chamados no período.</div>
        ) : (
          <UserTable rows={vm.byUser} totals={vm.totals} onRow={(id) => router.push(`/funcionarios/${id}`)} />
        )}
      </div>
    </div>
  )
}

function Leaderboard({ title, sub, color, rows, metric, router }: {
  title: string; sub: string; color: string; rows: HelpdeskPerson[]; metric: 'opened' | 'resolved'; router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />{title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{sub}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '4px 0' }}>Sem registros no período.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((p, i) => (
            <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
              <span style={{ width: 16, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{p[metric]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const HEAD = [
  { key: 'opened' as const, label: 'Abertos', color: 'var(--info)' },
  { key: 'resolved' as const, label: 'Resolvidos', color: 'var(--success)' },
]

function DeptTable({ rows, totals, onRow }: { rows: { id: string; nome: string; color: string; opened: number; resolved: number }[]; totals: { opened: number; resolved: number }; onRow: (id: string) => void }) {
  const grid = '1fr 110px 110px'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Departamento</div>
        {HEAD.map((c) => (
          <div key={c.key} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />{c.label}</div>
        ))}
      </div>
      {rows.map((d) => (
        <div key={d.id} className="tc-row" onClick={() => onRow(d.id)} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '9px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flex: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
          </div>
          {HEAD.map((c) => (
            <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>{d[c.key].toLocaleString('pt-BR')}</div>
          ))}
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        {HEAD.map((c) => (<div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: c.color }}>{totals[c.key].toLocaleString('pt-BR')}</div>))}
      </div>
    </div>
  )
}

function UserTable({ rows, totals, onRow }: { rows: HelpdeskPerson[]; totals: { opened: number; resolved: number }; onRow: (id: string) => void }) {
  const grid = '1fr 90px 90px 130px'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Funcionário</div>
        <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Abertos</div>
        <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Resolvidos</div>
        <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>Tempo médio</div>
      </div>
      <div style={{ maxHeight: 560, overflowY: 'auto' }}>
        {rows.map((p) => (
          <div key={p.id} className="tc-row" onClick={() => onRow(p.id)} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '8px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: p.opened > 0 ? 'var(--text)' : 'var(--text-mute)' }}>{p.opened.toLocaleString('pt-BR')}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: p.resolved > 0 ? 'var(--text)' : 'var(--text-mute)' }}>{p.resolved.toLocaleString('pt-BR')}</div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: p.resolved > 0 ? 'var(--text-dim)' : 'var(--text-mute)' }}>{p.resolved > 0 ? p.tempoMedio : '—'}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
        <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--info)' }}>{totals.opened.toLocaleString('pt-BR')}</div>
        <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>{totals.resolved.toLocaleString('pt-BR')}</div>
        <div />
      </div>
    </div>
  )
}
