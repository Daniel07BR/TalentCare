'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { educationByDept, type EscSeg, type EscPerson } from '@/lib/mock/education'
import Avatar from '../Avatar'

function StackedBar({ segs }: { segs: EscSeg[] }) {
  return (
    <div style={{ display: 'flex', height: 9, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', minWidth: 160 }}>
      {segs.map((s) => <div key={s.label} title={`${s.label}: ${s.count} (${s.pct}%)`} style={{ width: `${s.pct}%`, background: s.color }} />)}
    </div>
  )
}

function LevelBadge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 11.5, fontWeight: 600, color, background: `color-mix(in srgb, ${color} 16%, transparent)`, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{label}</span>
}

export default function FormacaoPage() {
  const router = useRouter()
  const vm = educationByDept(useTalentData())

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Escolaridade</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Escolaridade por departamento</h1>
      </div>

      {/* Resumo geral */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Empresa</div>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{vm.overall.informed} de {vm.overall.total} informados</span>
        </div>
        <StackedBar segs={vm.overall.segs} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
          {vm.overall.segs.map((s) => (
            <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-dim)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} /> {s.label} <b style={{ color: 'var(--text)' }}>{s.count}</b> ({s.pct}%)
            </span>
          ))}
        </div>
      </div>

      {/* Por departamento */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vm.byDept.map((d) => (
          <div key={d.id} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
            <div className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', borderRadius: 8, padding: '4px 6px', margin: '-4px -6px 14px' }}>
              <div style={{ minWidth: 150, flex: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{d.total} colaborador{d.total !== 1 ? 'es' : ''} · {d.informed} informados</div>
              </div>
              <div style={{ flex: 1 }}><StackedBar segs={d.segs} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'flex-end', maxWidth: 360 }}>
                {d.segs.map((s) => (
                  <span key={s.label} style={{ fontSize: 11, color: s.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.pct}% {s.label.replace('Superior ', 'Sup. ').replace('Ensino ', '')}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px 24px' }}>
              {d.people.map((p: EscPerson) => (
                <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                    {p.username && <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.username}</div>}
                  </div>
                  <LevelBadge label={p.level} color={p.levelColor} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {vm.semInfo.length > 0 && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: '#9aa1ac' }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sem escolaridade informada <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {vm.semInfo.length}</span></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Funcionários ainda sem vínculo na planilha — pendentes de informação</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px 24px' }}>
            {vm.semInfo.map((p) => (
              <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                  {p.username && <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.username}</div>}
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{p.dept}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
