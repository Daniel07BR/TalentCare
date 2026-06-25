'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useCidePeriod } from '@/lib/ui/cide-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { cideVM, type CidePerson } from '@/lib/mock/cide'
import Avatar from '../Avatar'

const CideIcon = ({ size = 17, color = 'var(--chart-5)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" />
  </svg>
)

export default function CidePage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useCidePeriod()
  const vm = cideVM(data, map ?? undefined)
  const max = Math.max(1, ...vm.deptBars.map((d) => d.atividades))

  const kpis = [
    { label: 'Atividades registradas', value: vm.totalAtividades, color: 'var(--chart-5)' },
    { label: 'Pessoas ativas', value: vm.ativos, color: 'var(--text)' },
    { label: 'Setores com atividade', value: vm.deptCount, color: 'var(--info)' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CideIcon size={24} /> CIDE · Cadastro Geral
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>Atividade = alterações registradas no histórico de empresas (exclui eventos automáticos)</div>
        </div>
      </div>

      {/* Top 5 */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top 5 · quem mais registra atividade</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Alterações registradas no CIDE</div>
        {vm.top5.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vm.top5.length}, 1fr)`, gap: 12 }}>
            {vm.top5.map((p, i) => (
              <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', cursor: 'pointer', padding: '14px 8px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', background: i === 0 ? 'rgba(241,120,138,.08)' : 'transparent' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={52} />
                  <span style={{ position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--chart-5)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--text-dim)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{i + 1}</span>
                </div>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="cnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--chart-5)' }}>{p.atividades}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>ativ.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Por departamento */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividades por departamento</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Total de alterações registradas por setor</div>
          {vm.deptBars.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem atividade no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {vm.deptBars.map((d) => (
                <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, padding: '3px 5px', margin: '0 -5px' }}>
                  <div style={{ width: 92, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div className="cbar" style={{ height: '100%', width: `${(d.atividades / max) * 100}%`, background: 'var(--chart-5)', borderRadius: 20 }} />
                  </div>
                  <div style={{ width: 44, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.atividades.toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por usuário */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atividades por usuário</div>
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
    </div>
  )
}

function UserRow({ p, rank, router }: { p: CidePerson; rank?: number; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
      {rank != null && <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{rank}</span>}
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.atividades.toLocaleString('pt-BR')}<span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}> ativ.</span></div>
    </div>
  )
}
