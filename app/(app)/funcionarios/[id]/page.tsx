'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { buildEmployeeVM } from '@/lib/mock/employee'

const TABS: [string, string][] = [
  ['atividade', 'Atividade'], ['produtividade', 'Produtividade'], ['assiduidade', 'Assiduidade'],
  ['formacao', 'Formação'], ['trajetoria', 'Trajetória'], ['reconhecimento', 'Reconhecimento'],
]

export default function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState('atividade')
  const vm = buildEmployeeVM(id)

  if (!vm) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/funcionarios')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar ao diretório</button>
        <div className="empty">Funcionário não encontrado.</div>
      </div>
    )
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <button onClick={() => router.push('/funcionarios')} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar ao diretório</button>

      {/* Header: identidade + gauge + fatores */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: vm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: '#fff', flex: 'none' }}>{vm.initials}</div>
          <div style={{ paddingTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>{vm.name}</h1>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: vm.statusColor, background: vm.statusBg, padding: '3px 10px', borderRadius: 20 }}>{vm.status}</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.cargo} · {vm.dept}</div>
            <div style={{ display: 'flex', gap: 26 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Tempo de casa</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.tempo}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Admissão</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.admissao}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Escolaridade</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.esc}</div></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26, alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: 28 }}>
          <div style={{ position: 'relative', width: 172, textAlign: 'center' }}>
            <svg viewBox="0 0 200 116" style={{ width: 172, display: 'block' }}>
              <path d={vm.gaugeTrack} fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
              <path d={vm.gaugeValue} fill="none" stroke={vm.gaugeColor} strokeWidth="14" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: 36, left: 0, right: 0 }}>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, color: vm.scoreColor }}>{vm.score}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>Score geral · <span style={{ color: vm.deltaColor, fontWeight: 600 }}>{vm.delta}</span></div>
            </div>
          </div>
          <div style={{ width: 206, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {vm.factors.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{f.label} <span style={{ color: 'var(--text-mute)' }}>· {f.peso}%</span></span>
                  <span style={{ fontWeight: 700, color: f.color }}>{f.nota}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: f.pct, background: f.color, borderRadius: 20 }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abas + painel de decisão */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 22, padding: '0 22px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {TABS.map(([k, label]) => (
              <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)} style={{ fontSize: 13, fontWeight: 600, padding: '11px 2px', marginBottom: -1 }}>{label}</button>
            ))}
          </div>
          <div style={{ padding: 22 }}>
            {tab === 'atividade' && (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18 }}>Linha do tempo cross-sistema — integrada ao Nexus</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {vm.timeline.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 11, height: 11, borderRadius: '50%', background: ev.color, marginTop: 4, flex: 'none' }} />
                        <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '3px 0' }} />
                      </div>
                      <div style={{ paddingBottom: 18, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: ev.color, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 5 }}>{ev.system}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{ev.when}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.action}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{ev.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'produtividade' && (
              <>
                <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{vm.tasksDone}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Concluídas</div></div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{vm.tasksLate}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Atrasadas</div></div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-dim)' }}>{vm.tasksPend}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Pendentes</div></div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Distribuição</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
                  {vm.prodBar.map((p, i) => <div key={i} style={{ width: p.w, background: p.color }} />)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Tarefas por sistema</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {vm.bySystem.map((s) => (
                    <div key={s.sys} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 150, fontSize: 12.5, color: 'var(--text-dim)', flex: 'none' }}>{s.sys}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: s.pct, background: s.color, borderRadius: 20 }} /></div>
                      <span style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'assiduidade' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{vm.assid}%</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Assiduidade</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{vm.atrasos}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Atrasos</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{vm.faltas}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Faltas</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{vm.advert}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Advertências</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{vm.susp}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Suspensões</div></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Mapa de presença · últimas 18 semanas</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18,1fr)', gap: 4 }}>
                  {vm.heat.map((c, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 3, background: c.bg }} />)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 12, fontSize: 11, color: 'var(--text-mute)' }}>
                  Menos
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--surface-2)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.3)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.55)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--accent)' }} /> Mais
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Rádio da empresa</span><span style={{ fontSize: 11, color: 'var(--text-mute)' }}>8 semanas</span></div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}><span className="cnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: 'var(--chart-2)' }}>{vm.radioHoras}h</span><span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· média {vm.radioMedia}h/sem</span></div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 74 }}>
                      {vm.radioBars.map((b, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                          <div className="crise" style={{ width: '100%', height: b.h, background: 'var(--chart-2)', borderRadius: '3px 3px 0 0', minHeight: 3 }} />
                          <span style={{ fontSize: 9.5, color: 'var(--text-mute)' }}>{b.sem}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Advertências &amp; suspensões</div>
                    {vm.discEmpty ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 96, textAlign: 'center', gap: 6 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(63,178,85,.13)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
                        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Nenhuma ocorrência registrada</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {vm.disc.map((d, i) => (
                          <div key={i} className="cpop" style={{ display: 'flex', alignItems: 'center', gap: 11, background: d.bg, borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.cor, flex: 'none' }} />
                            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: d.cor }}>{d.tipo}</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{d.motivo}</div></div>
                            <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{d.quando}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'formacao' && (
              <>
                <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{vm.grau}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Escolaridade</div></div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{vm.horas}h</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Treinamento (12m)</div></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Cursos &amp; treinamentos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                  {vm.cursos.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{c.quando}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Certificações</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {vm.certs.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 13px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.nome}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{c.quando}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'trajetoria' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {vm.traj.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: t.dot, marginTop: 4, flex: 'none' }} />
                      <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '3px 0' }} />
                    </div>
                    <div style={{ paddingBottom: 20, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{t.tipo} · {t.quando}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.titulo}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 1 }}>{t.detalhe}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'reconhecimento' && (
              vm.reconEmpty ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Nenhum reconhecimento registrado ainda.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {vm.recon.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: r.kind, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1205', fontSize: 16, flex: 'none' }}>★</div>
                      <div><div style={{ fontSize: 13, fontWeight: 600 }}>{r.titulo}</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{r.quando}</div></div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Fatores para decisão */}
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--accent-dim)', borderRadius: 'var(--radius)', padding: 20, position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} /><div style={{ fontSize: 14, fontWeight: 700 }}>Fatores para decisão</div></div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Resumo executivo · aumento / promoção</div>
          <div style={{ background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{vm.decRec}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 3 }}>Tendência 6m</div><div style={{ fontSize: 18, fontWeight: 700, color: vm.decTrendColor }}>{vm.decTrend}</div></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 3 }}>vs. setor</div><div style={{ fontSize: 18, fontWeight: 700, color: vm.decVsDeptColor }}>{vm.decVsDept}</div></div>
          </div>
          {vm.decHasStr && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Pontos fortes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {vm.decStrengths.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: 'var(--text)' }}>↑ {s.label}</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>{s.diff}</span></div>)}
              </div>
            </>
          )}
          {vm.decHasAtt && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Pontos de atenção</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {vm.decAttention.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: 'var(--text)' }}>↓ {s.label}</span><span style={{ fontWeight: 600, color: 'var(--danger)' }}>{s.diff}</span></div>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
