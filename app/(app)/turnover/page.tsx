import { turnoverVM } from '@/lib/mock/turnover'
import { getTalentData } from '@/lib/data/source'

export const dynamic = 'force-dynamic'

export default async function TurnoverPage() {
  const vm = turnoverVM(await getTalentData())
  const kpis = [
    { label: 'Taxa de turnover', value: vm.rate + '%', color: 'var(--danger)' },
    { label: 'Headcount ativo', value: vm.headcount, color: 'var(--text)' },
    { label: 'Entradas (12m)', value: vm.totalEnt, color: 'var(--success)' },
    { label: 'Saldo líquido', value: vm.net, color: vm.netColor },
  ]

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Analítico</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Turnover &amp; Headcount</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Entradas vs. saídas</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Movimentação por mês</div></div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--success)' }} />Entradas</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--danger)' }} />Saídas</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
            {vm.bars.map((b) => (
              <div key={b.mo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', height: 130, justifyContent: 'center' }}>
                  <div className="crise" style={{ width: '42%', height: b.entH, background: 'var(--success)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                  <div className="crise" style={{ width: '42%', height: b.saiH, background: 'var(--danger)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-mute)' }}>{b.mo}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Motivos de saída</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {vm.motivos.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--text-dim)' }}>{m.label}</span><span style={{ fontWeight: 600 }}>{m.pct}%</span></div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: m.pct + '%', background: m.color, borderRadius: 20 }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Turnover por departamento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {vm.byDept.map((d) => (
            <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 100, fontSize: 12.5, color: 'var(--text-dim)', flex: 'none' }}>{d.nome}</span>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: d.pct, background: d.color, borderRadius: 20 }} /></div>
              <span style={{ width: 42, textAlign: 'right', fontSize: 13, fontWeight: 700, color: d.color }}>{d.turnover}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
