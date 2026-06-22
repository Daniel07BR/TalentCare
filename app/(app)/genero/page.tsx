'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { genderVM } from '@/lib/mock/demographics'

const M = 'var(--info)'
const F = 'var(--chart-5)'

export default function GeneroPage() {
  const router = useRouter()
  const vm = genderVM(useTalentData())
  const o = vm.overall

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Demografia · quadro ativo</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Comparativo por gênero</h1>
      </div>

      {/* Geral */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', height: 14, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 18 }}>
          <div style={{ width: `${o.mPct}%`, background: M }} />
          <div style={{ width: `${o.fPct}%`, background: F }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Masculino', color: M, count: o.m, pct: o.mPct, age: o.avgM, score: o.scoreM },
            { label: 'Feminino', color: F, count: o.f, pct: o.fPct, age: o.avgF, score: o.scoreF },
          ].map((g) => (
            <div key={g.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</span></div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-2px', color: g.color, lineHeight: 1.1 }}>{g.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{g.pct}% do quadro</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 22 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Idade média</div><div style={{ fontSize: 18, fontWeight: 700 }}>{g.age ?? '—'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Score médio</div><div style={{ fontSize: 18, fontWeight: 700 }}>{g.score}</div></div>
              </div>
            </div>
          ))}
        </div>
        {o.ni > 0 && <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 12 }}>{o.ni} sem gênero informado (não entram na comparação).</div>}
      </div>

      {/* Por departamento */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Proporção masculino × feminino</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vm.byDept.map((d) => (
            <div key={d.id} className="tc-row" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 6, padding: '3px 4px', margin: '-3px -4px' }}>
              <div style={{ width: 110, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              <span style={{ width: 50, flex: 'none', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: M }}>♂ {d.m}</span>
              <div style={{ flex: 1, display: 'flex', height: 9, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)' }}>
                <div title={`Masculino: ${d.m}`} style={{ width: `${d.mPct}%`, background: M }} />
                <div title={`Feminino: ${d.f}`} style={{ width: `${d.fPct}%`, background: F }} />
              </div>
              <span style={{ width: 50, flex: 'none', fontSize: 12.5, fontWeight: 700, color: F }}>♀ {d.f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
