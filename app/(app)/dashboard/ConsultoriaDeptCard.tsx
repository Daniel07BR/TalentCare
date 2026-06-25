'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useConsultoriaPeriod } from '@/lib/ui/consultoria-period'
import { consultoriaVM } from '@/lib/mock/consultoria'

// Card do Dashboard: atividade total do Consultoria Plus por departamento NO
// PERÍODO (espelho local consultoria_daily via /api/consultoria-metrics).
// Atividade = estudos + chamados + mensagens + comentários. Clica → /consultoria.
export default function ConsultoriaDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useConsultoriaPeriod()
  const vm = consultoriaVM(data, map ?? undefined)
  const max = Math.max(1, ...vm.deptBars.map((d) => d.total))

  return (
    <div className="tc-card" onClick={() => router.push('/consultoria')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--chart-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
            </svg>
            Consultoria Plus · atividade por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{vm.totals.studies.toLocaleString('pt-BR')} estudos · {vm.totals.tickets.toLocaleString('pt-BR')} chamados · {vm.totals.messages.toLocaleString('pt-BR')} mensagens · {vm.totals.comments.toLocaleString('pt-BR')} comentários</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-3)', fontWeight: 600 }}>ver resumo ›</span>
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
                <div className="cbar" style={{ height: '100%', width: `${(d.total / max) * 100}%`, background: 'var(--chart-3)', borderRadius: 20 }} />
              </div>
              <div style={{ width: 36, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.total.toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
