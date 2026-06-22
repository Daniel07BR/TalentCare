'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { generationsVM, type GenSeg } from '@/lib/mock/demographics'
import Avatar from '../Avatar'

function Bar({ segs }: { segs: GenSeg[] }) {
  return (
    <div style={{ display: 'flex', height: 9, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', minWidth: 160 }}>
      {segs.map((s) => <div key={s.key} title={`${s.label} · ${s.desc}`} style={{ width: `${s.pct}%`, background: s.color }} />)}
    </div>
  )
}

export default function GeracoesPage() {
  const router = useRouter()
  const vm = generationsVM(useTalentData())

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Demografia · quadro ativo</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Gerações por departamento</h1>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Empresa · idade média <span style={{ color: 'var(--accent)' }}>{vm.overall.avg ?? '—'} anos</span></div>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{vm.overall.withDob} de {vm.overall.total} com nascimento</span>
        </div>
        <Bar segs={vm.overall.segs} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
          {vm.overall.segs.map((s) => (
            <span key={s.key} title={s.desc} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-dim)', cursor: 'help' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} /> {s.label} <b style={{ color: 'var(--text)' }}>{s.count}</b> ({s.pct}%)
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vm.byDept.map((d) => (
          <div key={d.id} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
            <div className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', borderRadius: 8, padding: '4px 6px', margin: '-4px -6px 14px' }}>
              <div style={{ minWidth: 150, flex: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{d.total} pessoas · idade média {d.avg ?? '—'}</div>
              </div>
              <div style={{ flex: 1 }}><Bar segs={d.segs} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px 24px' }}>
              {d.people.map((p) => (
                <div key={p.id} className="tc-row" onClick={() => router.push(`/funcionarios/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, padding: 5, margin: '-1px -5px' }}>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.initials} color={p.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                    {p.username && <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{p.username}</div>}
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'right' }}>{p.nasc ?? '—'}{p.age != null ? ` · ${p.age}a` : ''}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.genColor, background: `color-mix(in srgb, ${p.genColor} 16%, transparent)`, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', width: 130, textAlign: 'center' }}>{p.gen}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
