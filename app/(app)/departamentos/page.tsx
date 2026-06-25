'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useScoreSignals } from '@/lib/ui/score-period'
import { withRealScores } from '@/lib/mock/score'
import { deptListVM } from '@/lib/mock/departments'

export default function DepartamentosPage() {
  const router = useRouter()
  const { signals } = useScoreSignals()
  const vm = deptListVM(withRealScores(useTalentData(), signals))

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Setores</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Departamentos</h1>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Headcount total</div><div style={{ fontSize: 20, fontWeight: 700 }}>{vm.totalHc}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Score médio</div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{vm.avgScore}</div></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {vm.cards.map((d) => (
          <div key={d.id} className="tc-card" onClick={() => router.push(`/departamentos/${d.id}`)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>{d.nome}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{d.lider}</div></div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, marginTop: 6, flex: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}><span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: d.scoreColor }}>{d.score}</span><span style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>/100 score</span></div>
            <svg width="100%" height="30" viewBox="0 0 120 28" preserveAspectRatio="none" style={{ marginBottom: 14, overflow: 'visible' }}><polyline points={d.spark} fill="none" stroke={d.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Headcount</div><div style={{ fontSize: 14, fontWeight: 600 }}>{d.headcount}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Turnover</div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>{d.turnover}%</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
