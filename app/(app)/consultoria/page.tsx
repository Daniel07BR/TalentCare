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

export default function ConsultoriaPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useConsultoriaPeriod()
  const vm = consultoriaVM(data, map ?? undefined)
  const max = Math.max(1, ...vm.deptBars.map((d) => d.total))

  const kpis = [
    { label: 'Atividade total', value: vm.totals.total, color: 'var(--chart-3)' },
    { label: 'Estudos publicados', value: vm.totals.studies, color: 'var(--accent)' },
    { label: 'Chamados abertos', value: vm.totals.tickets, color: 'var(--info)' },
    { label: 'Mensagens', value: vm.totals.messages, color: 'var(--chart-2)' },
    { label: 'Comentários', value: vm.totals.comments, color: 'var(--chart-5)' },
    { label: 'Pessoas ativas', value: vm.ativos, color: 'var(--text)' },
  ]

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

      {/* Top 5 — quem mais contribui */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top 5 · quem mais contribui</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Atividade total (estudos + chamados + mensagens + comentários)</div>
        {vm.top5.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vm.top5.length}, 1fr)`, gap: 12 }}>
            {vm.top5.map((p, i) => (
              <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', cursor: 'pointer', padding: '14px 8px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', background: i === 0 ? 'rgba(167,139,250,.08)' : 'transparent' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={52} />
                  <span style={{ position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--chart-3)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--text-dim)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{i + 1}</span>
                </div>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="cnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--chart-3)' }}>{p.total}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>ações</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Por departamento */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por departamento</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Total de ações por setor</div>
          {vm.deptBars.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {vm.deptBars.map((d) => (
                <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, padding: '3px 5px', margin: '0 -5px' }}>
                  <div style={{ width: 92, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div className="cbar" style={{ height: '100%', width: `${(d.total / max) * 100}%`, background: 'var(--chart-3)', borderRadius: 20 }} />
                  </div>
                  <div style={{ width: 40, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.total.toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por usuário */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividade por usuário</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.ativos} pessoas · ordenadas por atividade</div>
          {vm.byUser.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 520, overflowY: 'auto' }}>
              {vm.byUser.map((p, i) => <UserRow key={p.id} p={p} rank={i + 1} router={router} />)}
            </div>
          )}
        </div>
      </div>

      {/* Usuários divididos por departamento */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Usuários por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Atividade de cada funcionário no Consultoria Plus, agrupada por setor</div>
        {vm.byDept.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px 28px', alignItems: 'start' }}>
            {vm.byDept.map((d) => (
              <div key={d.id}>
                <div className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', paddingBottom: 9, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{d.nome}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.users.length} {d.users.length === 1 ? 'pessoa' : 'pessoas'} · {d.total.toLocaleString('pt-BR')} ações</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.users.map((p) => <UserRow key={p.id} p={p} router={router} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ p, rank, router }: { p: ConsultoriaPerson; rank?: number; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
      {rank != null && <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{rank}</span>}
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.total}<span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}> ações</span></div>
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.studies}E · {p.tickets}C · {p.messages}M · {p.comments}c</div>
      </div>
    </div>
  )
}
