'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, GraduationCap, PlayCircle, BookOpen } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { type EmployeeMetrics, useEmployeePeriod } from '@/lib/ui/employee-period'
import { useEmployeeTimeline, type EstadoTimeline } from '@/lib/ui/employee-timeline'
import { usePeriod } from '@/lib/ui/period'
import { buildEmployeeVM, type EmployeeVM } from '@/lib/mock/employee'
import Avatar from '../../Avatar'
import ClassroomStats from '../../ClassroomStats'
import FormacaoEditor from './FormacaoEditor'
import DadosEditor from './DadosEditor'
import TreinamentosEditor from './TreinamentosEditor'


// Cor de destaque por nível de formação (chave = rótulo exibido no card, sem acento).
const FORM_COR: Record<string, string> = {
  graduacao: '#159b87', superior: '#159b87',
  pos: '#a78bfa', 'pos-graduacao': '#a78bfa',
  extensao: '#2f9fd6',
  mba: '#f5a623',
  mestrado: '#7c8cf0', doutorado: '#7c5cf0',
  'medio tecnico': '#b6d957', tecnico: '#8aab2e',
  'ensino medio': '#e0857a', 'ensino fundamental': '#f1788a',
}
const FORM_PALETTE = ['#159b87', '#a78bfa', '#2f9fd6', '#f5a623', '#e0857a', '#b6d957']
const normLbl = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const formCor = (label: string, i: number) => FORM_COR[normLbl(label)] ?? FORM_PALETTE[i % FORM_PALETTE.length]

export default function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  /* ⚠️ Sem `withRealScores`/`useScoreSignals`: eles disparavam mais um fetch a
     `/api/score-metrics` — que devolve a atividade da EMPRESA INTEIRA — em toda
     ficha aberta, para produzir campos que a página não lê desde que o score
     saiu daqui. */
  const data = useTalentData()
  const { period, label } = usePeriod()
  const { m } = useEmployeePeriod(id)
  const { events: timeline, estado: estadoTimeline } = useEmployeeTimeline(id)
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
  /* ⚠️⚠️ ENQUANTO CARREGA, NADA em vez do ACUMULADO. Estes fallbacks caíam em
     `vm.*`, que é a soma de TODA A HISTÓRIA — a mesma armadilha que o relatório
     de setor tinha (o TI com 59 cursos debaixo de "Últimos 30 dias"), aqui numa
     versão mais discreta: o número de sempre aparecia por um segundo e era
     trocado pelo do período. Quem olhasse rápido leria o valor errado, e quem
     olhasse duas vezes concluiria que a tela pisca sozinha.

     `null` faz cada bloco mostrar "—" até o dado do período chegar. */
  const radioHoras = m ? m.radio.horas : null
  const radioSessoes = m ? m.radio.sessoes : null
  const radioUltima = m
    ? (m.radio.ultimaDay ? new Date(`${m.radio.ultimaDay}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : null)
    : null
  const cr = m
    ? { assistidos: m.classroom.courses, criados: m.classroom.created, videos: m.classroom.videos, total: m.classroom.total }
    : { assistidos: null, criados: null, videos: null, total: null }
  const wpp = m?.whatsapp ?? null
  const cons = m?.consultoria ?? null
  const hd = m?.helpdesk ?? null
  const cd = m?.cide ?? null
  const gr = m?.gerencia ?? null
  const ch = m?.chat ?? null
  // Assiduidade REAL (ponto) no período; fallback ao acumulado do vm enquanto carrega.
  const ass = m?.assiduidade ?? null
  /* ⚠️ "Tem ponto" = há QUALQUER registro no período. Sem isso, zero atrasos por
     ausência de dado viraria índice 100. */
  const temPonto = !!ass && (ass.atrasos > 0 || ass.atrasosAbon > 0 || ass.advertencias > 0 || ass.minutos > 0)
  const periodo = label

  // "Concluídas" REAL = soma das atividades concluídas no período nos sistemas
  // integrados. Atrasadas/Pendentes não têm fonte (SLA vazio / sem estado) → ocultas.
  const concluidasParts = m
    ? [
        { label: 'chamados resolvidos', sys: 'HelpDesk', n: m.helpdesk.resolved },
        { label: 'cursos (concluídos/criados)', sys: 'ClassRoom', n: m.classroom.total },
        { label: 'alterações', sys: 'CIDE', n: m.cide.atividades },
        { label: 'atividades', sys: 'Consultoria Plus', n: m.consultoria.total },
        { label: 'atendimentos finalizados', sys: 'WhatsApp', n: m.whatsapp.finalizados },
        { label: 'serviços entregues', sys: 'Gerência', n: m.gerencia.servicos },
        { label: 'serviços criados', sys: 'Gerência', n: m.gerencia.servCriados },
        // ⚠️ Só CHAMADO CONCLUÍDO. Mensagem não é entrega e não entra aqui —
        // seria o maior número da lista e o mais vazio.
        { label: 'chamados concluídos', sys: 'Chat Interno', n: m.chat.chamadosConcluidos },
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
    // Gerência = execução + demanda; o card abaixo separa as duas.
    'Gerência': m ? m.gerencia.servicos + m.gerencia.protAbertos + m.gerencia.protAprovados + m.gerencia.servCriados + m.gerencia.datasAlteradas : null,
    // ⚠️ A barra do Chat mede CHAMADO, não mensagem: com mensagem dentro, ela
    // encostaria no teto em toda ficha e as outras seis viravam risquinhos.
    'Chat Interno': m ? m.chat.chamadosAbertos + m.chat.chamadosConcluidos : null,
  }
  const bySystem = vm.bySystem.map((b) => {
    const real = b.sys in realBySystem
    /* ⚠️⚠️ `?? 0` fazia o gráfico-resumo — o primeiro que o gestor lê — afirmar
       SEIS ZEROS carimbados "REAL" em verde até a rota responder, e para sempre
       se ela negasse. O acumulado era o número certo da pergunta errada; o zero
       é a resposta errada da pergunta certa. */
    return { sys: b.sys, color: b.color, real, value: real ? realBySystem[b.sys] : b.value }
  })
  const maxSys = Math.max(1, ...bySystem.map((b) => b.value ?? 0))

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <button onClick={() => router.push('/funcionarios')} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar ao diretório</button>

      {/* Cabeçalho: identidade. O gauge e os fatores saíram — ver abaixo. */}
      {/*
        ⚠️⚠️ O GAUGE DE SCORE SAIU DAQUI (03/09/2026), pela mesma régua que o
        tirou do relatório de setor: ele não foi validado e não está valendo.

        E aqui ele era pior que lá. Um número de 38px no alto da ficha, logo
        acima do botão "Avaliar a Karen", sugere fortemente que a nota deve sair
        dele — o oposto exato do que a avaliação mensal existe para fazer. A nota
        é de quem observou a pessoa; o score é o que oito sistemas registraram.
        Deixá-los encostados um no outro convidava a transcrever um no outro.

        Os FATORES (produtividade/assiduidade/formação, com os pesos) foram junto:
        eles são a decomposição do score, e sozinhos não querem dizer nada.
      */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>
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
              <div><div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Escolaridade</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {vm.grauLevels.map((l) => (
                    <span key={l.label} style={{ fontSize: 11.5, fontWeight: 600, color: l.color, background: `color-mix(in srgb, ${l.color} 16%, transparent)`, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{l.label}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Rádio</div>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--chart-2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16.5 4 7 8" /><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="8" cy="14" r="3" /><path d="M16 12h.01M18 16h.01" />
                  </svg>
                  {radioHoras != null ? `${radioHoras.toLocaleString('pt-BR')}h` : '—'}
                </div>
              </div>
            </div>
            <DadosEditor nexusUserId={vm.nexusUserId} birthISO={vm.birthISO} hireISO={vm.hireISO} />
          </div>
        </div>
      </div>

      {/*
        ⚠️⚠️ PÁGINA ÚNICA, e não abas (decisão do dono, 03/09/2026).

        O leitor é o GESTOR PRESTES A AVALIAR, e ele não vem com UMA pergunta —
        vem formar um juízo que cruza dimensões. Os oito critérios da avaliação
        atravessam o que eram as abas: *Entrega* vive na atividade, *Conduta* na
        assiduidade, *Iniciativa* está espalhada. Com abas ele visitava quatro
        vezes e montava o quadro de memória — e memória entre cliques é onde a
        impressão vira "acho que ela andou faltando".

        Rolar é mais barato que clicar e lembrar. Depois de sair a Trajetória e o
        Reconhecimento (que eram inventados), sobraram quatro blocos: cabe.
      */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          <Secao titulo="O que os sistemas registraram" sub={`Por fonte · ${periodo}`}>
{/* Concluídas REAL no período (soma das atividades concluídas nos sistemas).
                    Atrasadas/Pendentes não têm fonte → ocultas. */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 22, alignItems: 'stretch' }}>
                  <div style={{ flex: 'none', minWidth: 150, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="cnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: 'var(--success)' }}>{concluidas == null ? '—' : concluidas.toLocaleString('pt-BR')}</div>
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
                      {/* ⚠️ `null` = ainda não sabemos. Barra vazia e "—", nunca zero. */}
                      <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div className="cbar" style={{ height: '100%', width: s.value == null ? '0%' : `${(s.value / maxSys) * 100}%`, background: s.color, borderRadius: 20, opacity: s.real ? 1 : 0.5 }} /></div>
                      <span style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700, color: s.value == null ? 'var(--text-mute)' : s.real ? 'var(--text)' : 'var(--text-mute)' }}>{s.value == null ? '—' : s.value}</span>
                    </div>
                  ))}
                </div>

                {wpp?.has && (
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

                {gr && (gr.hasSaida || gr.hasEscritorio) && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 17h4V5H2v12h3M20 17h2v-6l-3-4h-4v10h2" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                      </svg>
                      Gerência · mensageria <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>

                    {gr.hasSaida && (
                      <div style={{ marginBottom: gr.hasEscritorio ? 12 : 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Saídas externas</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 10 }}>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-2)' }}>{gr.servicos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Serviços entregues</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.km.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Km rodados</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.saidas.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Saídas</div></div>
                          {gr.viagens > 0 && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{gr.viagens.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Viagens <span style={{ color: 'var(--text-mute)' }}>(fora do estado)</span></div></div>
                          )}
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(gr.jornadaMin / 60).toLocaleString('pt-BR')}<span style={{ fontSize: 13, color: 'var(--text-mute)' }}>h</span></div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Jornada registrada</div></div>
                        </div>
                      </div>
                    )}

                    {gr.hasEscritorio && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Demanda do escritório</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 10 }}>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{gr.protAbertos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Protocolos abertos</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.protAprovados.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Aprovações</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.servCriados.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Serviços criados</div></div>
                          {gr.datasAlteradas > 0 && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.datasAlteradas.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Datas alteradas</div></div>
                          )}
                          {(gr.reagendados > 0 || gr.cancelados > 0) && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{gr.reagendados.toLocaleString('pt-BR')}<span style={{ fontSize: 13, color: 'var(--text-mute)' }}> / {gr.cancelados}</span></div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Reagend. / cancel.</div></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {ch && (ch.hasConversa || ch.hasChamado) && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chart-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                      </svg>
                      Chat Interno <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                    </div>

                    {/* ⚠️ CHAMADO primeiro, e CONVERSA depois com o aviso: o
                        número de mensagem é uma ordem de grandeza maior e, em
                        cima, seria lido como o resultado da pessoa. */}
                    {ch.hasChamado && (
                      <div style={{ marginBottom: ch.hasConversa ? 12 : 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Chamados entre setores</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 10 }}>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{ch.chamadosConcluidos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Concluídos</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{ch.chamadosAbertos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Abertos por ela</div></div>
                          {ch.chamadosAssumidos > 0 && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{ch.chamadosAssumidos.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Assumidos</div></div>
                          )}
                          {ch.chamadosConcluidos > 0 && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{ch.tempoMedio}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Tempo médio <span style={{ color: 'var(--text-mute)' }}>(só expediente)</span></div></div>
                          )}
                        </div>
                      </div>
                    )}

                    {ch.hasConversa && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Conversa <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· não entra no score</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 10 }}>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-3)' }}>{ch.mensagens.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Mensagens</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{ch.msgCanais.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Em canais</div></div>
                          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{ch.msgDiretas.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Conversas diretas</div></div>
                          {ch.msgChamados > 0 && (
                            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700 }}>{ch.msgChamados.toLocaleString('pt-BR')}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Dentro de chamados</div></div>
                          )}
                        </div>
                        {/* ⚠️ O aviso fica JUNTO do número, e não no rodapé da
                            página: quem olha a ficha de uma pessoa para decidir
                            promoção precisa ler aqui que isto não é avaliação. */}
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
                          Volume de conversa é contexto, não desempenho — não entra no score.
                          O conteúdo das mensagens nunca sai do chat: aqui só chega a contagem.
                        </div>
                      </div>
                    )}
                  </div>
                )}
          </Secao>

          <Secao titulo="Linha do tempo" sub={`O que aconteceu, dia a dia · ${periodo}`}>
<div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18 }}>Linha do tempo cross-sistema · dados reais · {periodo}</div>
                {/* ⚠️⚠️ "Sem atividade" só no estado `ok`. Antes um 403 ou uma
                    falha de rede virava essa frase — a tela afirmando um fato
                    sobre a pessoa que está prestes a ser avaliada. */}
                {estadoTimeline === 'carregando' ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '10px 0' }}>Carregando o período…</div>
                ) : estadoTimeline === 'negado' ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>Você não tem acesso à atividade desta pessoa.</div>
                ) : estadoTimeline === 'erro' ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>Não deu para carregar a linha do tempo. Recarregue a página.</div>
                ) : timeline !== null && timeline.length === 0 ? (
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
          </Secao>

          <Secao titulo="Assiduidade e disciplina" sub={`Ponto eletrônico · ${periodo}`}>
            {!ass ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-mute)', fontSize: 13 }}>Carregando o período…</div>
            ) : (
              <>
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Ponto eletrônico · {periodo}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 22 }}>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>{/* ⚠️⚠️ Este cartão mostrava `100 − atrasos×2 − advertências×5` como se fosse
       uma TAXA de presença — e é a `assidNotaFrom()` do score, o mesmo fator que
       vale 20% dele. Quem não tem ponto na fonte recebia "100%": zero atraso por
       AUSÊNCIA DE DADO virava nota máxima, na mesma fileira em que "Faltas" e
       "Suspensões" mostram "—" com "sem fonte". A fileira era honesta em duas
       células e inventava na primeira. */}
                    <div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: temPonto ? 'var(--text)' : 'var(--text-mute)' }}>{temPonto ? `${ass.assid}%` : '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Índice de assiduidade</div>
                    <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 3 }} title="100 − atrasos×2 − advertências×5. Não é taxa de presença.">
                      {temPonto ? '100 − atrasos×2 − advert.×5' : 'sem registro de ponto'}
                    </div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{ass.atrasos}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Atrasos</div>
                    {ass.minutos > 0 || ass.atrasosAbon > 0 ? (
                      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3 }}>
                        {ass.minutos > 0 ? `${ass.minutos} min` : null}
                        {ass.minutos > 0 && ass.atrasosAbon > 0 ? ' · ' : null}
                        {ass.atrasosAbon > 0 ? `${ass.atrasosAbon} abonado${ass.atrasosAbon > 1 ? 's' : ''}` : null}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-mute)' }}>—</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Faltas</div><div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3 }}>sem fonte</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{ass.advertencias}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Advertências</div><div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3 }}>histórico total</div></div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}><div className="cnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-mute)' }}>—</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Suspensões</div><div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3 }}>sem fonte</div></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mapa de ocorrências · últimas 18 semanas</div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 12 }}>Cada quadro é um dia; a cor indica atraso (mais escuro = mais minutos). Dia limpo = sem ocorrência.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18,1fr)', gap: 4 }}>
                  {vm.heat.map((c, i) => <div key={i} title={c.future ? '' : c.atrasos > 0 ? `${c.iso}: ${c.atrasos} atraso${c.atrasos > 1 ? 's' : ''}${c.minutos > 0 ? ` · ${c.minutos} min` : ''}` : `${c.iso}: sem ocorrência`} style={{ aspectRatio: '1', borderRadius: 3, background: c.bg, opacity: c.future ? 0 : 1 }} />)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 12, fontSize: 11, color: 'var(--text-mute)' }}>
                  Sem atraso
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--surface-2)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.3)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(245,166,35,.55)' }} />
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--accent)' }} /> Mais minutos
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
                          {radioSessoes != null ? `${radioSessoes.toLocaleString('pt-BR')} ${radioSessoes === 1 ? 'sessão' : 'sessões'}` : 'carregando…'}
                          {radioUltima ? <> · última escuta {radioUltima}</> : null}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Advertências <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· histórico completo</span></div>
                    {(m?.disciplina.length ?? 0) === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 96, textAlign: 'center', gap: 6 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(63,178,85,.13)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</div>
                        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Nenhuma ocorrência registrada</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {(m?.disciplina ?? []).map((d, i) => (
                          <div key={i} className="cpop" style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'color-mix(in srgb, var(--danger) 9%, var(--surface-2))', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', flex: 'none' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)', textTransform: 'capitalize' }}>{d.tipo}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{d.motivo ?? 'sem motivo registrado'}</div>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                              {new Date(`${d.data}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Secao>

          {/*
            ⚠️ A FORMAÇÃO é leitura aqui; a EDIÇÃO fica atrás de um botão.
            Campo editável no meio do fluxo de quem está julgando alguém é
            convite a mexer sem querer — e o cadastro de escolaridade é
            manutenção, não parte do juízo.
          */}
          <Secao
            titulo="Formação"
            sub="Retrato de hoje · não acompanha o filtro de período"
            acao={
              <button onClick={() => setEditando((v) => !v)} className="tc-btn"
                style={{ background: editando ? 'var(--accent)' : 'transparent', border: `1px solid ${editando ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: editando ? '#fff' : 'var(--text-dim)', padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {editando ? 'Fechar edição' : 'Editar cadastro'}
              </button>
            }
          >
<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chart-2)' }} /> ClassRoom <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· dados reais · {periodo}</span>
                </div>
                <div style={{ marginBottom: 22 }}>
                  {cr.total == null ? (
                    <div style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>Carregando o período…</div>
                  ) : (cr.total ?? 0) + (cr.videos ?? 0) > 0 ? (
                    <ClassroomStats stats={[
                      { icon: GraduationCap, label: 'Cursos assistidos', value: cr.assistidos ?? 0, color: 'var(--chart-2)' },
                      { icon: PenLine, label: 'Cursos criados', value: cr.criados ?? 0, color: 'var(--accent)' },
                      { icon: PlayCircle, label: 'Vídeos assistidos', value: cr.videos ?? 0, color: 'var(--info)' },
                      { icon: BookOpen, label: 'Total', value: cr.total ?? 0, color: 'var(--text)' },
                    ]} />
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>Sem atividade no ClassRoom neste período.</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      {vm.grauLevels.map((l) => (
                        <span key={l.label} style={{ fontSize: 12.5, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 16%, transparent)`, padding: '3px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>{l.label}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Escolaridade</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Formação acadêmica <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 500 }}>· cadastro RH</span></div>
                {vm.cursos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                    {vm.cursos.map((c, i) => {
                      const cor = formCor(c.quando, i)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `color-mix(in srgb, ${cor} 13%, var(--surface-2))`, borderLeft: `3px solid ${cor}`, borderRadius: 'var(--radius-sm)', padding: '11px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: cor }}>{c.quando}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-mute)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 12 }}>Sem cursos informados no cadastro.</div>
                )}
                {editando && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
                    <FormacaoEditor nexusUserId={vm.nexusUserId ?? vm.id} level={vm.grau} detail={vm.eduDetail} />
                    <TreinamentosEditor nexusUserId={vm.nexusUserId ?? vm.id} cursos={vm.treinoCursos} certs={vm.treinoCerts} />
                  </div>
                )}
          </Secao>
        </div>


        {/*
          ⚠️⚠️ AQUI HAVIA "Fatores para decisão" · Resumo executivo · aumento /
          promoção", com uma frase automática do tipo "forte candidato a promoção
          ou bônus". Removido a pedido do dono em 03/09/2026 — e ele tinha mais
          razão do que sabia: a frase saía de `trend = hist[11] - hist[5]`, e
          `hist` é um passeio ALEATÓRIO semeado pelo id da pessoa. "Em evolução
          clara nos últimos 6 meses" era sorteio, impresso ao lado da palavra
          "promoção".

          Quem decide sobre a carreira de alguém é gente, e o lugar disso é a
          avaliação mensal. O painel aqui passou a servir a quem vai AVALIAR: o
          que aconteceu no mês, e o que perguntar na conversa.
        */}
        <PainelDoAvaliador vm={vm} m={m} periodo={periodo} estado={estadoTimeline} />
      </div>
    </div>
  )
}

/* ============================================================
   O PAINEL DE QUEM VAI AVALIAR.

   ⚠️⚠️ Substitui "Fatores para decisão · aumento / promoção", que escrevia uma
   recomendação automática a partir de um número — e o número era sorteado.

   O que fica aqui não decide nada: junta o que aconteceu no mês e o que vale
   PERGUNTAR na conversa. A nota continua sendo de quem observou a pessoa.
   ============================================================ */
function PainelDoAvaliador({ vm, m, periodo, estado }: {
  vm: EmployeeVM
  m: EmployeeMetrics | null
  periodo: string
  estado: EstadoTimeline
}) {
  const router = useRouter()

  /* ⚠️⚠️ A JANELA vs. A VIDA DA PESSOA. Todos os números são "no período", e
     nada relacionava um com o outro: quem foi admitido há 12 dias tinha os
     mesmos zeros de quem não é medido, debaixo de "Últimos 30 dias"; quem saiu
     há 8 meses idem. Sem esta linha, a ausência de dado se lê como ausência de
     trabalho — e é o leitor que vai pontuar entrega quem lê. */
  const admissao = vm.hireISO ? new Date(vm.hireISO) : null
  const saida = vm.leftISO ? new Date(vm.leftISO) : null
  const desde = m ? new Date(`${m.fromDay}T00:00:00`) : null
  const recemAdmitida = admissao && desde && admissao > desde
  const saiuNoPeriodo = saida && desde && saida > desde
  const fmtD = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

  /* O QUE PERGUNTAR — derivado do que os sistemas registraram, e escrito como
     PERGUNTA, nunca como conclusão. A diferença não é de estilo: "resolveu 40
     chamados, o dobro do mês passado" é um fato; "excelente produtividade" é um
     julgamento que cabe a quem avalia, não à tela. */
  const pontos: { texto: string; cor: string }[] = []
  if (m) {
    const c = m.chat
    if (c.hasChamado && c.chamadosConcluidos > 0) {
      pontos.push({ texto: `Concluiu ${c.chamadosConcluidos} ${c.chamadosConcluidos === 1 ? 'chamado' : 'chamados'} de outros setores, em média ${c.tempoMedio}. Isso corresponde ao que você via no dia a dia?`, cor: 'var(--chart-3)' })
    }
    if (m.helpdesk.has && m.helpdesk.resolved > 0) {
      pontos.push({ texto: `Resolveu ${m.helpdesk.resolved} ${m.helpdesk.resolved === 1 ? 'chamado' : 'chamados'} no HelpDesk. Vale reconhecer, ou foi tarefa de rotina?`, cor: 'var(--chart-4)' })
    }
    if (m.classroom.created > 0) {
      pontos.push({ texto: `Criou ${m.classroom.created} ${m.classroom.created === 1 ? 'curso' : 'cursos'} no ClassRoom — ensinar alguém conta como colaboração.`, cor: 'var(--chart-2)' })
    }
    if (m.whatsapp.has && m.whatsapp.finalizados > 0) {
      pontos.push({ texto: `Finalizou ${m.whatsapp.finalizados} atendimentos no WhatsApp, em média ${m.whatsapp.tempoMedio}.`, cor: 'var(--chart-1)' })
    }
    if (m.gerencia.hasSaida && m.gerencia.servicos > 0) {
      pontos.push({ texto: `Entregou ${m.gerencia.servicos} serviços na rua, ${m.gerencia.km} km rodados.`, cor: 'var(--chart-2)' })
    }
    const a = m.assiduidade
    if (a.advertencias > 0) {
      pontos.push({ texto: `${a.advertencias} ${a.advertencias === 1 ? 'advertência' : 'advertências'} no período. Já foi conversado?`, cor: 'var(--danger)' })
    }
    if (a.atrasos > 0) {
      pontos.push({ texto: `${a.atrasos} ${a.atrasos === 1 ? 'atraso' : 'atrasos'} (${a.minutos} min). ${a.atrasosAbon > 0 ? `Outros ${a.atrasosAbon} foram abonados.` : 'Há um motivo conhecido?'}`, cor: 'var(--warning)' })
    }
    /* ⚠️ SILÊNCIO NOS SISTEMAS NÃO É INATIVIDADE. Quem não passa pelas oito
       fontes (Limpeza, Cozinha, quem não tem conta no Nexus) apareceria aqui sem
       nenhum ponto — e a ausência de linhas se lê como "não fez nada". */
    if (pontos.length === 0) {
      pontos.push({
        texto: 'Os sistemas não registraram atividade desta pessoa no período. Isso não quer dizer que ela não trabalhou — o trabalho dela pode não passar por nenhuma das oito fontes medidas.',
        cor: 'var(--text-mute)',
      })
    }
  }

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, position: 'sticky', top: 80 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Antes de avaliar</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, marginBottom: 16 }}>
        O que os sistemas registraram · {periodo}
      </div>

      {(recemAdmitida || saiuNoPeriodo) && (
        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--text-dim)', background: 'var(--surface-2)', borderLeft: '3px solid var(--warning)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginBottom: 12 }}>
          {recemAdmitida && admissao && <>Admitida em <b>{fmtD(admissao)}</b> — o período cobre só parte do tempo de casa dela.</>}
          {saiuNoPeriodo && saida && <>{recemAdmitida ? ' ' : ''}Desligada em <b>{fmtD(saida)}</b> — os números param aí.</>}
        </div>
      )}

      {/* ⚠️ Painel VAZIO enquanto carrega lia-se como "não há nada a observar",
          que é uma conclusão, e a errada. */}
      {!m && (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '8px 0' }}>
          {estado === 'negado' ? 'Você não tem acesso à atividade desta pessoa.'
            : estado === 'erro' ? 'Não deu para carregar o que os sistemas registraram.'
            : 'Carregando o que os sistemas registraram…'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {pontos.map((p, i) => (
          <div key={i} className="cpop" style={{ animationDelay: `${i * 55}ms`, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-dim)', background: 'var(--surface-2)', borderLeft: `3px solid ${p.cor}`, borderRadius: 'var(--radius-sm)', padding: '10px 13px' }}>
            {p.texto}
          </div>
        ))}
      </div>

      {/* ⚠️ O botão leva à avaliação DESTA pessoa. Sem ele, o gestor lê a ficha,
          abre outra aba, procura o nome na fila e recomeça — e a ficha existe
          justamente para ser lida antes de avaliar. */}
      {/* ⚠️ Desligado não entra na fila da competência corrente: oferecer o
          botão levaria a uma tela que recusa. */}
      <button
        onClick={() => router.push(`/avaliacoes/${vm.id}`)}
        disabled={!!saida}
        title={saida ? 'Pessoa desligada — fora da fila de avaliação' : undefined}
        className="tc-btn"
        style={{ width: '100%', marginTop: 18, background: saida ? 'var(--surface-2)' : 'var(--accent)', border: saida ? '1px solid var(--border)' : 'none', borderRadius: 'var(--radius-sm)', color: saida ? 'var(--text-mute)' : '#fff', padding: '11px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: saida ? 'not-allowed' : 'pointer' }}
      >
        {saida ? 'Desligada — fora da avaliação' : `Avaliar ${vm.name.split(' ')[0]}`}
      </button>

      {/* ⚠️ O que a tela NÃO faz, dito na tela. Uma ficha cheia de números ao
          lado de um botão de avaliar sugere que a nota sai deles. */}
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 11, lineHeight: 1.5 }}>
        Estes números são o que os sistemas viram — não são a nota. A nota é sua, e o que ela mede
        (entrega, prazo, conduta, equipe) nenhum sistema registra.
      </div>
    </div>
  )
}

/** Um bloco da ficha. Substitui as abas: mesmo peso visual, título próprio, e
 *  um canto para a ação daquele bloco (hoje só a Formação usa). */
function Secao({ titulo, sub, acao, children }: {
  titulo: string; sub?: string; acao?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{titulo}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
        </div>
        {acao}
      </div>
      {children}
    </div>
  )
}
