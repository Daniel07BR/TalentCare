'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useHelpdeskPeriod } from '@/lib/ui/helpdesk-period'
import { helpdeskVM } from '@/lib/mock/helpdesk'

// Card do Dashboard: chamados do HelpDesk por departamento NO PERÍODO (espelho
// local helpdesk_daily via /api/helpdesk-metrics), separados em abertos
// (solicitante) e resolvidos (responsável). Clica → /helpdesk.
const COLS = [
  { key: 'opened' as const, label: 'Abertos', color: 'var(--info)' },
  { key: 'resolved' as const, label: 'Resolvidos', color: 'var(--success)' },
]

export default function HelpdeskDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useHelpdeskPeriod()
  const vm = helpdeskVM(data, map ?? undefined)

  return (
    <div className="tc-card" onClick={() => router.push('/helpdesk')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--chart-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 18 0" /><path d="M21 12v3a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3Z" /><path d="M3 12v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H3Z" />
            </svg>
            HelpDesk · chamados por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{vm.totals.opened.toLocaleString('pt-BR')} abertos · {vm.totals.resolved.toLocaleString('pt-BR')} resolvidos · tempo médio {vm.tempoMedioGeral}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-4)', fontWeight: 600 }}>ver resumo ›</span>
      </div>
      {loading && !map ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : vm.deptBars.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhum chamado no período.</div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: 8, padding: '0 6px 8px', borderBottom: '1px solid var(--border-soft)' }}>
            <div />
            {COLS.map((c) => (
              <div key={c.key} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flex: 'none' }} />{c.label}
              </div>
            ))}
          </div>
          {vm.deptBars.map((d) => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: 8, padding: '8px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              {COLS.map((c) => (
                <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>{d[c.key].toLocaleString('pt-BR')}</div>
              ))}
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: 8, padding: '9px 6px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
            {COLS.map((c) => (
              <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: c.color }}>{vm.totals[c.key].toLocaleString('pt-BR')}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
