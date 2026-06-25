'use client'
import { useRouter } from 'next/navigation'
import { useTalentData } from '@/lib/ui/data'
import { useConsultoriaPeriod } from '@/lib/ui/consultoria-period'
import { consultoriaVM } from '@/lib/mock/consultoria'

// Card do Dashboard: atividade do Consultoria Plus por departamento NO PERÍODO
// (espelho local consultoria_daily via /api/consultoria-metrics), DETALHADA por
// tipo — estudos / chamados / mensagens / comentários (não um total bruto).
// Clica → /consultoria.
const COLS = [
  { key: 'studies' as const, label: 'Estudos', color: 'var(--accent)' },
  { key: 'tickets' as const, label: 'Chamados', color: 'var(--info)' },
  { key: 'messages' as const, label: 'Mensagens', color: 'var(--chart-2)' },
  { key: 'comments' as const, label: 'Comentários', color: 'var(--chart-5)' },
]

export default function ConsultoriaDeptCard() {
  const router = useRouter()
  const data = useTalentData()
  const { map, loading } = useConsultoriaPeriod()
  const vm = consultoriaVM(data, map ?? undefined)

  return (
    <div className="tc-card" onClick={() => router.push('/consultoria')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--chart-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
            </svg>
            Consultoria Plus · atividade por departamento
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Estudos postados, chamados abertos, mensagens e comentários por setor</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--chart-3)', fontWeight: 600 }}>ver resumo ›</span>
      </div>
      {loading && !map ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Carregando…</div>
      ) : vm.deptBars.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>Nenhuma atividade no período.</div>
      ) : (
        <div>
          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 92px)', gap: 8, padding: '0 6px 8px', borderBottom: '1px solid var(--border-soft)' }}>
            <div />
            {COLS.map((c) => (
              <div key={c.key} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flex: 'none' }} />{c.label}
              </div>
            ))}
          </div>
          {/* Linhas por departamento */}
          {vm.deptBars.map((d) => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 92px)', gap: 8, padding: '8px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
              {COLS.map((c) => (
                <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d[c.key] > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                  {d[c.key].toLocaleString('pt-BR')}
                </div>
              ))}
            </div>
          ))}
          {/* Totais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 92px)', gap: 8, padding: '9px 6px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
            {COLS.map((c) => (
              <div key={c.key} style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: c.color }}>
                {vm.totals[c.key].toLocaleString('pt-BR')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
