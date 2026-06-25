'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useConsultoriaPeriod } from '@/lib/ui/consultoria-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { consultoriaVM, type ConsultoriaPerson } from '@/lib/mock/consultoria'
import Avatar from '../Avatar'

const CPIcon = ({ size = 17, color = 'var(--chart-3)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />
    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
  </svg>
)

// As quatro métricas, sempre apresentadas SEPARADAS (não somadas num total bruto).
type MetricKey = 'studies' | 'tickets' | 'messages' | 'comments'
const METRICS: { key: MetricKey; label: string; short: string; color: string; desc: string }[] = [
  { key: 'studies', label: 'Estudos postados', short: 'Estudos', color: 'var(--accent)', desc: 'Estudos publicados no feed' },
  { key: 'tickets', label: 'Chamados abertos', short: 'Chamados', color: 'var(--info)', desc: 'Chamados abertos' },
  { key: 'messages', label: 'Mensagens em chamados', short: 'Mensagens', color: 'var(--chart-2)', desc: 'Respostas/mensagens em chamados' },
  { key: 'comments', label: 'Comentários em estudos', short: 'Comentários', color: 'var(--chart-5)', desc: 'Comentários nas postagens de estudos' },
]

export default function ConsultoriaPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useConsultoriaPeriod()
  const vm = consultoriaVM(data, map ?? undefined)

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CPIcon size={24} /> Consultoria Plus
          </h1>
        </div>
      </div>

      {/* KPIs — uma métrica por card (separadas) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {METRICS.map((mt) => (
          <div key={mt.key} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: mt.color, flex: 'none' }} />{mt.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', color: mt.color }}>{vm.totals[mt.key].toLocaleString('pt-BR')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>{mt.desc}</div>
          </div>
        ))}
      </div>

      {/* Leaderboards por tipo — quem mais faz cada coisa (separado) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16, alignItems: 'start' }}>
        {METRICS.map((mt) => {
          const rows = vm.byUser.filter((p) => p[mt.key] > 0).sort((a, b) => b[mt.key] - a[mt.key]).slice(0, 5)
          return (
            <div key={mt.key} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: mt.color, flex: 'none' }} />{mt.short}
              </div>
              {rows.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-mute)', padding: '4px 0' }}>Sem registros no período.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rows.map((p) => (
                    <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', borderRadius: 8, padding: 4, margin: '-1px -4px' }}>
                      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: mt.color, fontVariantNumeric: 'tabular-nums' }}>{p[mt.key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Por departamento — tabela com uma coluna por tipo */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Cada tipo de atividade detalhado por setor</div>
        {vm.deptBars.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <MetricTable
            rows={vm.deptBars.map((d) => ({ id: d.id, nome: d.nome, color: d.color, studies: d.studies, tickets: d.tickets, messages: d.messages, comments: d.comments }))}
            totals={vm.totals}
            onRow={(id) => router.push(`/departamentos/${id}`)}
            firstColLabel="Departamento"
          />
        )}
      </div>

      {/* Por usuário — tabela com uma coluna por tipo */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por usuário</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.ativos} pessoas com atividade no período</div>
        {vm.byUser.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <UserMetricTable rows={vm.byUser} totals={vm.totals} onRow={(id) => router.push(`/funcionarios/${id}`)} />
        )}
      </div>
    </div>
  )
}

const COLS: { key: MetricKey; label: string; color: string }[] = METRICS.map((m) => ({ key: m.key, label: m.short, color: m.color }))

function HeaderRow({ firstColLabel, grid }: { firstColLabel: string; grid: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>{firstColLabel}</div>
      {COLS.map((c) => (
        <div key={c.key} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flex: 'none' }} />{c.label}
        </div>
      ))}
    </div>
  )
}

function TotalsRow({ totals, grid }: { totals: Record<MetricKey, number>; grid: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 6px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
      {COLS.map((c) => (
        <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: c.color }}>{totals[c.key].toLocaleString('pt-BR')}</div>
      ))}
    </div>
  )
}

type MetricRow = { id: string; nome: string; color: string } & Record<MetricKey, number>

function MetricTable({ rows, totals, onRow, firstColLabel }: {
  rows: MetricRow[]
  totals: Record<MetricKey, number>; onRow: (id: string) => void; firstColLabel: string
}) {
  const grid = '1fr repeat(4, 96px)'
  return (
    <div>
      <HeaderRow firstColLabel={firstColLabel} grid={grid} />
      {rows.map((d) => (
        <div key={d.id} className="tc-row" onClick={() => onRow(d.id)} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '9px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flex: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
          </div>
          {COLS.map((c) => (
            <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
              {d[c.key].toLocaleString('pt-BR')}
            </div>
          ))}
        </div>
      ))}
      <TotalsRow totals={totals} grid={grid} />
    </div>
  )
}

function UserMetricTable({ rows, totals, onRow }: { rows: ConsultoriaPerson[]; totals: Record<MetricKey, number>; onRow: (id: string) => void }) {
  const grid = '1fr repeat(4, 96px)'
  return (
    <div>
      <HeaderRow firstColLabel="Funcionário" grid={grid} />
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
            {COLS.map((c) => (
              <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: p[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                {p[c.key].toLocaleString('pt-BR')}
              </div>
            ))}
          </div>
        ))}
      </div>
      <TotalsRow totals={totals} grid={grid} />
    </div>
  )
}
