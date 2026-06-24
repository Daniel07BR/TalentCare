import Link from 'next/link'
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
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Saídas por departamento</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Últimos 12 meses</div>
          {vm.byDept.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Nenhuma saída registrada no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {vm.byDept.map((d) => (
                <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 100, fontSize: 12.5, color: 'var(--text-dim)', flex: 'none' }}>{d.nome}</span>
                  <div style={{ flex: 1, height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: d.pct, background: d.color, borderRadius: 20 }} /></div>
                  <span style={{ width: 42, textAlign: 'right', fontSize: 13, fontWeight: 700, color: d.color }}>{d.exits}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relatório por departamento */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Relatório por departamento</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Movimentação dos últimos 12 meses · headcount atual (ativos)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr .8fr .8fr .8fr .9fr', gap: 0, fontSize: 12.5 }}>
          {['Setor', 'Headcount', 'Entradas', 'Saídas', 'Turnover'].map((h, i) => (
            <div key={h} style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', padding: '0 0 10px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
          ))}
          {vm.deptReport.map((d) => (
            <div key={d.id} style={{ display: 'contents' }}>
              <Link href={`/departamentos/${d.id}`} style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', fontWeight: 600, color: 'var(--text)' }}>{d.nome}</Link>
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right' }}>{d.headcount}</div>
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right', color: d.ent ? 'var(--success)' : 'var(--text-dim)' }}>{d.ent ? '+' + d.ent : '0'}</div>
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right', color: d.sai ? 'var(--danger)' : 'var(--text-dim)' }}>{d.sai ? '−' + d.sai : '0'}</div>
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right', fontWeight: 700, color: d.rate >= 20 ? 'var(--danger)' : d.rate > 0 ? 'var(--warning)' : 'var(--text-dim)' }}>{d.rate}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Desligados (todos os que temos, com datas) */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Desligados <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-mute)' }}>· {vm.totalDesligados}</span></div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Saídas registradas, com admissão e data de saída</div>
        {vm.leavers.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum desligamento registrado.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .9fr .9fr .9fr', gap: 0, fontSize: 12.5 }}>
            {['Funcionário', 'Setor', 'Admissão', 'Saída', 'Tempo de casa'].map((h, i) => (
              <div key={h} style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', padding: '0 0 10px', textAlign: i === 0 ? 'left' : i === 1 ? 'left' : 'right' }}>{h}</div>
            ))}
            {vm.leavers.map((p) => (
              <div key={p.id} style={{ display: 'contents' }}>
                <Link href={`/funcionarios/${p.id}`} style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', fontWeight: 600, color: 'var(--text)' }}>{p.nome}</Link>
                <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', color: 'var(--text-dim)' }}>{p.dept}</div>
                <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right' }}>{p.admissao}</div>
                <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>{p.saida}</div>
                <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)', textAlign: 'right', color: 'var(--text-dim)' }}>{p.tempo}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, color: 'var(--text-dim)', fontSize: 12.5 }}>
        Dados reais: <b style={{ color: 'var(--text)' }}>admissão</b> (data de contratação) e <b style={{ color: 'var(--text)' }}>saída</b> (quando o funcionário é inativado no Nexus). O <b style={{ color: 'var(--text)' }}>motivo</b> da saída ainda não é informado na origem — quando houver, entra aqui.
      </div>
    </div>
  )
}
