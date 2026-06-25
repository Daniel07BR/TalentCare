'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useCidePeriod } from '@/lib/ui/cide-period'
import { cideVM } from '@/lib/mock/cide'

// Card do Dashboard: atividades do CIDE (alterações registradas) por departamento
// NO PERÍODO (espelho local cide_daily via /api/cide-metrics). Clica → /cide.
export default function CideDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useCidePeriod()
  const vm = cideVM(data, map ?? undefined)
  const max = Math.max(1, ...vm.deptBars.map((d) => d.atividades))

  return (
    <div className="tc-card" onClick={() => router.push('/cide')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chart-5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" />
            </svg>
            CIDE · atividades registradas por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{vm.totalAtividades.toLocaleString('pt-BR')} alterações · {vm.ativos} pessoas · {vm.deptCount} setores</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-5)', fontWeight: 600 }}>ver resumo ›</span>
      </div>
      {loading && !map ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : vm.deptBars.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhuma atividade no período.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 28px' }}>
          {vm.deptBars.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="cbar" style={{ height: '100%', width: `${(d.atividades / max) * 100}%`, background: 'var(--chart-5)', borderRadius: 20 }} />
              </div>
              <div style={{ width: 40, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.atividades.toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
