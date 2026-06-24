'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useClassroomPeriod } from '@/lib/ui/classroom-period'
import { classroomVM } from '@/lib/mock/classroom'

// Card do Dashboard: cursos criados por departamento NO PERÍODO (espelho local
// classroom_daily via /api/classroom-metrics). Clica → /classroom.
export default function ClassroomDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useClassroomPeriod()
  const cvm = classroomVM(data, map ?? undefined)
  const bars = [...cvm.deptBars].sort((a, b) => b.created - a.created)
  const max = Math.max(1, ...bars.map((d) => d.created))

  return (
    <div className="tc-card" onClick={() => router.push('/classroom')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chart-2)' }} /> ClassRoom · cursos criados por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{cvm.totals.created.toLocaleString('pt-BR')} cursos criados · {cvm.totals.courses.toLocaleString('pt-BR')} concluídos · {cvm.totals.videos.toLocaleString('pt-BR')} vídeos assistidos</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-2)', fontWeight: 600 }}>ver resumo ›</span>
      </div>
      {loading && !map ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : bars.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhum curso criado no período.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 28px' }}>
          {bars.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="cbar" style={{ height: '100%', width: `${(d.created / max) * 100}%`, background: 'var(--accent)', borderRadius: 20 }} />
              </div>
              <div style={{ width: 36, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.created}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
