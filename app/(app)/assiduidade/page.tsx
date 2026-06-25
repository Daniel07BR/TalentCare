'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useAssiduidadePeriod } from '@/lib/ui/assiduidade-period'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { assiduidadeVM, fmtMin, type AssidPerson } from '@/lib/mock/assiduidade'
import { scoreColor } from '@/lib/mock/data'
import { AlarmClock } from 'lucide-react'
import Avatar from '../Avatar'

export default function AssiduidadePage() {
  const router = useRouter()
  const data = useTalentData()
  const { period } = usePeriod()
  const { map } = useAssiduidadePeriod()
  const vm = assiduidadeVM(data, map ?? undefined)
  const aMax = Math.max(1, ...vm.deptBars.map((d) => d.atrasos))

  const kpis: { label: string; value: string; color: string }[] = [
    { label: 'Assiduidade média', value: `${vm.assidMedio}%`, color: scoreColor(vm.assidMedio) },
    { label: 'Atrasos', value: vm.totalAtrasos.toLocaleString('pt-BR'), color: 'var(--warning)' },
    { label: 'Tempo atrasado', value: fmtMin(vm.totalMinutos), color: 'var(--warning)' },
    { label: 'Advertências (total)', value: vm.totalAdvert.toLocaleString('pt-BR'), color: 'var(--danger)' },
    { label: 'Atrasos abonados', value: vm.totalAbonados.toLocaleString('pt-BR'), color: 'var(--text-mute)' },
    { label: 'Pessoas c/ ocorrência', value: vm.pessoas.toLocaleString('pt-BR'), color: 'var(--info)' },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Ponto eletrônico · atrasos no {PERIOD_LABEL[period].toLowerCase()} · advertências acumuladas</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlarmClock size={24} color="var(--warning)" /> Assiduidade
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.8px', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Dois leaderboards: mais atrasou / mais advertências */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Leaderboard title="Top 5 · quem mais atrasou" subtitle="Nº de atrasos no período" people={vm.topAtrasos} metric="atrasos" color="var(--warning)" router={router} />
        <Leaderboard title="Top 5 · mais advertências" subtitle="Advertências · histórico total (acumulado)" people={vm.topAdvert} metric="advertencias" color="var(--danger)" router={router} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Por departamento */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atrasos por departamento</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Total de atrasos por setor</div>
          {vm.deptBars.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem ocorrências no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {vm.deptBars.map((d) => (
                <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, padding: '3px 5px', margin: '0 -5px' }}>
                  <div style={{ width: 92, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div className="cbar" style={{ height: '100%', width: `${(d.atrasos / aMax) * 100}%`, background: 'var(--warning)', borderRadius: 20 }} />
                  </div>
                  <div style={{ width: 70, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {d.atrasos}{d.advertencias > 0 ? <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}> · {d.advertencias}adv</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por usuário */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ocorrências por usuário</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.pessoas} pessoas · ordenadas por atrasos</div>
          {vm.byUser.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem ocorrências no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 520, overflowY: 'auto' }}>
              {vm.byUser.map((p, i) => <UserRow key={p.id} p={p} rank={i + 1} router={router} />)}
            </div>
          )}
        </div>
      </div>

      {/* Usuários por departamento */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ocorrências por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Atrasos e advertências de cada funcionário, agrupados por setor</div>
        {vm.byDept.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem ocorrências no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px 28px', alignItems: 'start' }}>
            {vm.byDept.map((d) => (
              <div key={d.id}>
                <div className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', paddingBottom: 9, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{d.nome}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.atrasos} atrasos{d.advertencias > 0 ? ` · ${d.advertencias} adv` : ''}</span>
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

function Leaderboard({ title, subtitle, people, metric, color, router }: { title: string; subtitle: string; people: AssidPerson[]; metric: 'atrasos' | 'advertencias'; color: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{subtitle}</div>
      {people.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Ninguém com registro no período. ✓</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {people.map((p, i) => (
            <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
              <span style={{ width: 18, fontSize: 12, fontWeight: 800, color: i === 0 ? color : 'var(--text-mute)', textAlign: 'center' }}>{i + 1}</span>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dept}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-1px', color }}>{p[metric]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>{metric === 'atrasos' ? (p.atrasos === 1 ? 'atraso' : 'atrasos') : (p.advertencias === 1 ? 'adv' : 'advs')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ p, rank, router }: { p: AssidPerson; rank?: number; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
      {rank != null && <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>{rank}</span>}
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo} · {p.dept}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {p.atrasos}<span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}> atr</span>
          {p.advertencias > 0 ? <span style={{ color: 'var(--danger)' }}> · {p.advertencias}<span style={{ fontSize: 11, fontWeight: 500 }}> adv</span></span> : null}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{fmtMin(p.minutos)}{p.abonados > 0 ? ` · ${p.abonados} abon.` : ''}</div>
      </div>
    </div>
  )
}
