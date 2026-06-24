'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useRadioPeriod } from '@/lib/ui/radio-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { radioVM, type RadioPerson } from '@/lib/mock/radio'
import Avatar from '../Avatar'

const RadioIcon = ({ size = 17, color = 'var(--chart-2)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16.5 4 7 8" />
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <circle cx="8" cy="14" r="3" />
    <path d="M16 12h.01M18 16h.01" />
  </svg>
)

export default function RadioPage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useRadioPeriod()
  const vm = radioVM(data, map ?? undefined)
  const rMax = Math.max(1, ...vm.deptBars.map((d) => d.horas))

  const kpis = [
    { label: 'Horas ouvidas', value: vm.totalHoras, color: 'var(--chart-2)' },
    { label: 'Sessões', value: vm.totalSessoes, color: 'var(--info)' },
    { label: 'Ouvintes', value: vm.ouvintes, color: 'var(--accent)' },
    { label: 'Setores com uso', value: vm.deptCount, color: 'var(--text)' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {PERIOD_LABEL[period]}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RadioIcon size={24} /> Rádio Itamarathy
          </h1>
        </div>
      </div>

      {/* Top 5 — quem mais escuta */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top 5 · quem mais escuta a rádio</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Horas acumuladas por funcionário</div>
        {vm.top5.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda. Clique em “Sincronizar”.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vm.top5.length}, 1fr)`, gap: 12 }}>
            {vm.top5.map((p, i) => (
              <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', cursor: 'pointer', padding: '14px 8px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', background: i === 0 ? 'rgba(54,185,166,.07)' : 'transparent' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={52} />
                  <span style={{ position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--chart-2)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--text-dim)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{i + 1}</span>
                </div>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="cnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--chart-2)' }}>{p.horas}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
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
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Horas por departamento</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Total de horas ouvidas por setor</div>
          {vm.deptBars.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {vm.deptBars.map((d) => (
                <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, padding: '3px 5px', margin: '0 -5px' }}>
                  <div style={{ width: 92, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div className="cbar" style={{ height: '100%', width: `${(d.horas / rMax) * 100}%`, background: 'var(--chart-2)', borderRadius: 20 }} />
                  </div>
                  <div style={{ width: 52, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.horas.toLocaleString('pt-BR')}h</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por usuário */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Horas por usuário</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.ouvintes} ouvintes · ordenados por tempo de uso</div>
          {vm.byUser.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda.</div>
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
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Horas de rádio de cada funcionário, agrupadas por setor</div>
        {vm.byDept.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem dados ainda.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px 28px', alignItems: 'start' }}>
            {vm.byDept.map((d) => (
              <div key={d.id}>
                <div className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', paddingBottom: 9, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{d.nome}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.users.length} {d.users.length === 1 ? 'ouvinte' : 'ouvintes'} · {d.horas.toLocaleString('pt-BR')}h</span>
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

function UserRow({ p, rank, router }: { p: RadioPerson; rank?: number; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
      {rank != null && <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{rank}</span>}
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.horas}<span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>h</span></div>
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.sessoes.toLocaleString('pt-BR')} sess.{p.ultima ? ` · ${p.ultima}` : ''}</div>
      </div>
    </div>
  )
}
