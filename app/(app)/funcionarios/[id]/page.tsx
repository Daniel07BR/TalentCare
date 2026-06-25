'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, GraduationCap, PlayCircle, BookOpen } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { useEmployeePeriod } from '@/lib/ui/employee-period'
import { useEmployeeTimeline } from '@/lib/ui/employee-timeline'
import { usePeriod } from '@/lib/ui/period'
import { PERIOD_LABEL } from '@/lib/mock/dashboard'
import { buildEmployeeVM } from '@/lib/mock/employee'
import Avatar from '../../Avatar'
import ClassroomStats from '../../ClassroomStats'
import FormacaoEditor from './FormacaoEditor'
import DadosEditor from './DadosEditor'
import TreinamentosEditor from './TreinamentosEditor'

const TABS: [string, string][] = [
  ['atividade', 'Atividade'], ['produtividade', 'Produtividade'], ['assiduidade', 'Assiduidade'],
  ['formacao', 'Formação'], ['trajetoria', 'Trajetória'], ['reconhecimento', 'Reconhecimento'],
]

export default function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState('atividade')
  const data = useTalentData()
  const { period } = usePeriod()
  const { m } = useEmployeePeriod(id)
  const { events: timeline } = useEmployeeTimeline(id)
  const vm = buildEmployeeVM(data, id)

  if (!vm) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/funcionarios')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar ao diretório</button>
        <div className="empty">Funcionário não encontrado.</div>
      </div>
    )
  }

  // Métricas REAIS no período (rádio/ClassRoom/WhatsApp). Enquanto carrega, usa o
  // acumulado do vm; quando chega, reflete o filtro de dias.
  const radioHoras = m ? m.radio.horas : vm.radioHoras
  const radioSessoes = m ? m.radio.sessoes : vm.radioSessoes
  const radioUltima = m
    ? (m.radio.ultimaDay ? new Date(`${m.radio.ultimaDay}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : null)
    : vm.radioUltima
  const cr = m
    ? { assistidos: m.classroom.courses, criados: m.classroom.created, videos: m.classroom.videos, total: m.classroom.total }
    : vm.classroom
  const wpp = m ? m.whatsapp : vm.whatsapp
  const cons = m?.consultoria ?? null
  const hd = m?.helpdesk ?? null
  const cd = m?.cide ?? null
  const periodo = PERIOD_LABEL[period]

  // "Concluídas" REAL = soma das atividades concluídas no período nos sistemas
  // integrados. Atrasadas/Pendentes não têm fonte (SLA vazio / sem estado) → ocultas.
  const concluidasParts = m
    ? [
        { label: 'chamados resolvidos', sys: 'HelpDesk', n: m.helpdesk.resolved },
        { label: 'cursos (concluídos/criados)', sys: 'ClassRoom', n: m.classroom.total },
        { label: 'alterações', sys: 'CIDE', n: m.cide.atividades },
        { label: 'atividades', sys: 'Consultoria Plus', n: m.consultoria.total },
        { label: 'atendimentos finalizados', sys: 'WhatsApp', n: m.whatsapp.finalizados },
      ].filter((p) => p.n > 0)
    : []
  const concluidas = m ? concluidasParts.reduce((a, p) => a + p.n, 0) : null

  // "Atividade por sistema": agora TODAS as 5 fontes são REAIS (period-aware via m).
  // Mantido o mecanismo real/simulado caso entre algum sistema novo no futuro.
  const realBySystem: Record<string, number | null> = {
    HelpDesk: m ? m.helpdesk.opened + m.helpdesk.resolved : null,
    ClassRoom: m ? m.classroom.videos + m.classroom.courses + m.classroom.created : null,
    'Painel de Atendimento': m ? m.whatsapp.abertos : null,
    'Consultoria Plus': m ? m.consultoria.total : null,
    CIDE: m ? m.cide.atividades : null,
  }
  const bySystem = vm.bySystem.map((b) => {
    const real = b.sys in realBySystem
    return { sys: b.sys, color: b.color, real, value: real ? (realBySystem[b.sys] ?? 0) : b.value }
  })
  const maxSys = Math.max(1, ...bySystem.map((b) => b.value))

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <button onClick={() => router.push('/funcionarios')} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar ao diretório</button>

      {/* Header: identidade + gauge + fatores */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Avatar id={vm.id} hasAvatar={vm.hasAvatar} initials={vm.initials} color={vm.color} size={84} radius={22} />
          <div style={{ paddingTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>{vm.name}</h1>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: vm.statusColor, background: vm.statusBg, padding: '3px 10px', borderRadius: 20 }}>{vm.status}</span>
            </div>
            {vm.username && <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginBottom: 8 }}>{vm.username}</div>}
            <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>{vm.cargo} · {vm.dept}</div>
            <div style={{ display: 'flex', gap: 26 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Tempo de casa</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.tempo}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Admissão</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.admissao}</div></div>
              {vm.dataSaida && <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Data de saída</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>{vm.dataSaida}</div></div>}
              {vm.idade != null && <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Idade</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.idade} anos</div></div>}
              {vm.nascimento && <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Nascimento</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.nascimento}</div></div>}
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Escolaridade</div><div style={{ fontSize: 13, fontWeight: 600 }}>{vm.esc}</div></div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Rádio</div>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--chart-2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16.5 4 7 8" /><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="8" cy="14" r="3" /><path d="M16 12h.01M18 16h.01" />
                  </svg>
                  {radioHoras.toLocaleString('pt-BR')}h
                </div>
              </div>
            </div>
            <DadosEditor nexusUserId={vm.nexusUserId} birthISO={vm.birthISO} hireISO={vm.hireISO} />
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
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18 }}>Linha do tempo cross-sistema · dados reais · {periodo}</div>
                {timeline !== null && timeline.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>Sem atividade registrada nos sistemas integrados neste período.</div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(timeline ?? []).map((ev, i) => (
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
                )}
              </>
            )}

            {tab === 'produtividade' && (
              <>
                {/* Concluídas REAL no período (soma das atividades concluídas nos sistemas).
                    Atrasadas/Pendentes não têm fonte → ocultas. */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 22, alignItems: 'stretch' }}>
                  <div style={{ flex: 'none', minWidth: 150, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="cnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: 'var(--success)' }}>{(concluidas ?? 0).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Atividades concluídas <span style={{ color: 'var(--text-mute)' }}>· {periodo}</span></div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {concluidas && concluidasParts.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                        {concluidasParts.map((p) => (
                          <div key={p.sys} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12.5 }}>
                            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.n.toLocaleString('pt-BR')}</span>
                            <span style={{ color: 'var(--text-dim)' }}>{p.label}</span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>({p.sys})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>Sem atividades concluídas neste período.</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Atividade por sistema</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginBottom: 14 }}>
                  Volume de atividade por sistema no período ({periodo}) · dados reais.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {bySystem.map((s) => (
                    <div key={s.sys} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 168, fontSize: 12.5, color: 'var(--text-dim)', flex: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.sys}
                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 4, color: s.real ? 'var(--success)' : 'var(--text-mute)', background: s.real ? 'rgba(63,178,85,.13)' : 'var(--surface-2)' }}>{s.real ? 'real' : 'simulado'}</span>
                      </span>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: `${(s.value / maxSys) * 100}%`, background: s.color, borderRadius: 20, opacity: s.real ? 1 : 0.5 }} /></div>
                      <span style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700, color: s.real ? 'var(--text)' : 'var(--text-mute)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {wpp.has && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1.1 1.4 1.7 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.2Z" /></svg>
                      Atendimentos · WhatsApp <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{wpp.abertos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Abertos</div></div>
                      <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{wpp.finalizados.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Finalizados</div></div>
                      <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{wpp.tempoMedio}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Tempo médio</div></div>
                    </div>
                  </div>
                )}

                {cons && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chart-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                      </svg>
                      Consultoria Plus <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>
                    {cons.has ? (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{cons.studies.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Estudos</div></div>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{cons.tickets.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Chamados</div></div>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-2)' }}>{cons.messages.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Mensagens</div></div>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-5)' }}>{cons.comments.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Comentários</div></div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>Sem atividade no Consultoria Plus neste período.</div>
                    )}
                  </div>
                )}

                {hd && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chart-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 0 1 18 0" /><path d="M21 12v3a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3Z" /><path d="M3 12v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H3Z" />
                      </svg>
                      HelpDesk · chamados <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>
                    {hd.has ? (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{hd.opened.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Abertos</div></div>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{hd.resolved.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Resolvidos{hd.formalized > 0 ? <span style={{ color: 'var(--text-mute)' }}> · {hd.formalized} formaliz.</span> : null}</div></div>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-4)' }}>{hd.tempoMedio}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Tempo médio de resolução</div></div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>Sem atividade no HelpDesk neste período.</div>
                    )}
                  </div>
                )}

                {cd && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chart-5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" />
                      </svg>
                      CIDE · cadastro geral <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>
                    {cd.has ? (
                      <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-5)' }}>{cd.atividades.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Atividades registradas <span style={{ color: 'var(--text-mute)' }}>(alterações)</span></div></div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>Sem atividade no CIDE neste período.</div>
                    )}
                  </div>
                )}
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
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16.5 4 7 8" />
                          <rect x="3" y="8" width="18" height="12" rx="2" />
                          <circle cx="8" cy="14" r="3" />
                          <path d="M16 12h.01M18 16h.01" />
                        </svg>
                        Rádio Itamarathy
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{periodo}</span>
                    </div>
                    {radioHoras === 0 && radioSessoes === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginTop: 'auto', marginBottom: 'auto' }}>Sem escuta no período.</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                          <span className="cnum" style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--chart-2)' }}>{radioHoras}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>horas ouvidas</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 'auto' }}>
                          {radioSessoes.toLocaleString('pt-BR')} {radioSessoes === 1 ? 'sessão' : 'sessões'}
                          {radioUltima ? <> · última escuta {radioUltima}</> : null}
                        </div>
                      </>
                    )}
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
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chart-2)' }} /> ClassRoom <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                </div>
                <div style={{ marginBottom: 22 }}>
                  {cr.total + cr.videos > 0 ? (
                    <ClassroomStats stats={[
                      { icon: GraduationCap, label: 'Cursos assistidos', value: cr.assistidos, color: 'var(--chart-2)' },
                      { icon: PenLine, label: 'Cursos criados', value: cr.criados, color: 'var(--accent)' },
                      { icon: PlayCircle, label: 'Vídeos assistidos', value: cr.videos, color: 'var(--info)' },
                      { icon: BookOpen, label: 'Total', value: cr.total, color: 'var(--text)' },
                    ]} />
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>Sem atividade no ClassRoom neste período.</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{vm.grau}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Escolaridade</div></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Formação acadêmica <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· cadastro RH</span></div>
                {vm.cursos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                    {vm.cursos.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{c.quando}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 12 }}>Sem cursos informados no cadastro.</div>
                )}
                <FormacaoEditor nexusUserId={vm.nexusUserId ?? vm.id} level={vm.grau} detail={vm.eduDetail} />
                <TreinamentosEditor nexusUserId={vm.nexusUserId ?? vm.id} cursos={vm.treinoCursos} certs={vm.treinoCerts} />
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
