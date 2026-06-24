'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useRadioPeriod } from '@/lib/ui/radio-period'
import { radioVM } from '@/lib/mock/radio'

// Card do Dashboard: horas de rádio por departamento NO PERÍODO selecionado
// (lê o espelho local radio_daily via /api/radio-metrics). Clica → /radio.
export default function RadioDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useRadioPeriod()
  const vm = radioVM(data, map ?? undefined)
  const rMax = Math.max(1, ...vm.deptBars.map((d) => d.horas))

  return (
    <div className="tc-card" onClick={() => router.push('/radio')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16.5 4 7 8" /><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="8" cy="14" r="3" /><path d="M16 12h.01M18 16h.01" />
            </svg>
            Rádio Itamarathy · horas ouvidas por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{vm.totalHoras.toLocaleString('pt-BR')} horas · {vm.totalSessoes.toLocaleString('pt-BR')} sessões · {vm.ouvintes} ouvintes</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-2)', fontWeight: 600 }}>ver resumo ›</span>
      </div>
      {loading && !map ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : vm.deptBars.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhuma escuta no período.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 28px' }}>
          {vm.deptBars.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="cbar" style={{ height: '100%', width: `${(d.horas / rMax) * 100}%`, background: 'var(--chart-2)', borderRadius: 20 }} />
              </div>
              <div style={{ width: 48, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.horas.toLocaleString('pt-BR')}h</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
