'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, LifeBuoy, Landmark, MessagesSquare, Radio, Truck,
  MessageSquareText, MessageCircle, ClipboardCheck, AlarmClock, Users2,
} from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { useScoreSignals } from '@/lib/ui/score-period'
import { withRealScores } from '@/lib/mock/score'
import { deptDetailVM } from '@/lib/mock/departments'
import { educationByDept } from '@/lib/mock/education'
import { useDeptPeriod, type DeptMetrics } from '@/lib/ui/dept-period'
import { usePeriod } from '@/lib/ui/period'
import { criterioDe, ancoraDe, competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../Avatar'

export default function DepartamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { signals } = useScoreSignals()
  const { label } = usePeriod()
  const data = withRealScores(useTalentData(), signals)
  const vm = deptDetailVM(data, id)
  const edu = educationByDept(data).byDept.find((d) => d.id === id)
  // ⚠️⚠️ TODA a atividade da tela vem daqui, do PERÍODO. Antes ela saía de
  // `data.departments[x]`, que é o acumulado de toda a história — o TI aparecia
  // com 59 cursos criados debaixo do rótulo "Últimos 30 dias", quando no período
  // eram 4. O número não estava errado: respondia outra pergunta, o que é pior,
  // porque ninguém desconfia de um número plausível.
  const { m } = useDeptPeriod(id)

  if (!vm) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/departamentos')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar aos departamentos</button>
        <div className="empty">Departamento não encontrado.</div>
      </div>
    )
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <button onClick={() => router.push('/departamentos')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar aos departamentos</button>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
          Relatório do setor · <b>{label}</b>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>{vm.name}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {vm.kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.value}</span><span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k.unit}</span></div>
          </div>
        ))}
      </div>

      {m && <Avaliacao m={m} />}
      {m && <Atividade m={m} />}
      {m && <Assiduidade m={m} />}
      {m && <Equipe m={m} />}

      {edu && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Escolaridade do setor</div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{edu.informed} de {edu.total} informados</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)' }}>
            {edu.segs.map((s) => <div key={s.label} title={`${s.label}: ${s.count} (${s.pct}%)`} style={{ width: `${s.pct}%`, background: s.color }} />)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', marginTop: 14 }}>
            {edu.segs.map((s) => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} /> {s.label} <b style={{ color: 'var(--text)' }}>{s.count}</b> <span style={{ color: 'var(--text-mute)' }}>({s.pct}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Evolução do score</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Últimos 12 meses</div>
          <svg viewBox="0 0 300 84" preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
            <path d={vm.histArea} fill="url(#dgrad)" opacity="0.5" />
            <path d={vm.histLine} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="dgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          </svg>
        </div>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Comparativo com a empresa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span>{vm.name}</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{vm.score}</span></div><div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: vm.barSelf, background: 'var(--accent)', borderRadius: 20 }} /></div></div>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--text-dim)' }}>Média da empresa</span><span style={{ fontWeight: 700 }}>{vm.compAvg}</span></div><div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: vm.barComp, background: 'var(--text-mute)', borderRadius: 20 }} /></div></div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, margin: '22px 0 4px' }}>Atrasos do setor · últimas 18 semanas</div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 12 }}>Soma dos atrasos dos membros por dia; mais escuro = mais minutos.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18,1fr)', gap: 3 }}>{vm.heat.map((c, i) => <div key={i} title={c.future ? '' : c.atrasos > 0 ? `${c.iso}: ${c.atrasos} atraso${c.atrasos > 1 ? 's' : ''}` : `${c.iso}: sem ocorrência`} style={{ aspectRatio: '1', borderRadius: 2, background: c.bg, opacity: c.future ? 0 : 1 }} />)}</div>
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ranking interno · {vm.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {vm.ranking.map((r) => (
            <div key={r.id} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 9, borderRadius: 8, cursor: 'pointer' }}>
              <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center', flex: 'none' }}>{r.rank}</span>
              <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{r.cargo}</div></div>
              <div style={{ width: 120, height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', flex: 'none' }}><div style={{ height: '100%', width: r.scorePct, background: r.scoreColor, borderRadius: 20 }} /></div>
              <span style={{ width: 32, textAlign: 'right', fontSize: 14, fontWeight: 700, color: r.scoreColor }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── helpers de formatação ─────────────────────────────────────────────────── */
const num = (n: number) => n.toLocaleString('pt-BR')
/** Segundos → texto. Usado no tempo de resolução de chamado. */
function dur(sec: number, porDia = 24): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const min = Math.round((sec % 3600) / 60)
  if (h >= porDia) { const d = Math.floor(h / porDia); return `${d}d ${h % porDia}h` }
  return h > 0 ? `${h}h ${String(min).padStart(2, '0')}min` : `${min}min`
}

function Card({ titulo, sub, cor, children }: { titulo: string; sub?: string; cor?: string; children: React.ReactNode }) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: sub ? 2 : 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        {cor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor }} />}{titulo}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{sub}</div>}
      {children}
    </div>
  )
}

/** Um número com rótulo. `vazio` mostra "—" em vez de zero. */
function N({ label, valor, cor, nota }: { label: string; valor: number | string | null; cor?: string; nota?: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
      <div className="cnum" style={{ fontSize: 22, fontWeight: 700, color: valor === null || valor === 0 ? 'var(--text-mute)' : (cor ?? 'var(--text)') }}>
        {valor === null ? '—' : typeof valor === 'number' ? num(valor) : valor}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
      {nota && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>{nota}</div>}
    </div>
  )
}

const grade = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 } as React.CSSProperties

/* ── A avaliação mensal do setor ───────────────────────────────────────────── */
function Avaliacao({ m }: { m: DeptMetrics }) {
  const a = m.avaliacao
  const faltam = Math.max(0, a.avaliaveis - a.publicadas)
  return (
    <Card
      titulo="Avaliação mensal"
      /* ⚠️ A competência é o MÊS FECHADO e NÃO acompanha o filtro de período:
         avaliação é mensal por natureza e não se recorta em "últimos 7 dias".
         A tela diz isso, senão o número parece não obedecer ao filtro. */
      sub={`Competência de ${competenciaLabel(a.competencia)} · não acompanha o filtro de período (a avaliação é mensal)`}
      cor="var(--accent)"
    >
      <div style={grade}>
        <N label="Nota média do setor" valor={a.media !== null ? a.media.toFixed(1) : null} cor={a.media !== null ? ancoraDe(a.media).color : undefined} />
        <N label="Avaliações publicadas" valor={a.publicadas} cor="var(--success)" nota={`de ${a.avaliaveis} pessoas`} />
        <N label="Faltam avaliar" valor={faltam} cor={faltam > 0 ? 'var(--warning)' : undefined} />
      </div>
      {a.porCriterio.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-dim)' }}>Média por critério</div>
          {a.porCriterio.map((c) => (
            <div key={c.criterio} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 12.5 }}>{criterioDe(c.criterio)?.label ?? c.criterio}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-mute)', width: 74, textAlign: 'right' }}>{c.n} {c.n === 1 ? 'nota' : 'notas'}</span>
              <div style={{ width: 150, height: 6, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.media * 10}%`, background: ancoraDe(c.media).color, borderRadius: 4 }} />
              </div>
              <span className="cnum" style={{ width: 30, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: ancoraDe(c.media).color }}>{c.media.toFixed(1)}</span>
            </div>
          ))}
          {/* ⚠️ "Não se aplica" fica FORA da média — por isso a contagem de notas
              muda de critério para critério, e a tela mostra quantas entraram. */}
          <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
            Critério marcado como "não se aplica" fica fora da média — é por isso que o número de
            notas muda de linha para linha.
          </div>
        </div>
      )}
      {a.publicadas === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 12 }}>
          Nenhuma avaliação publicada nesta competência ainda.
        </div>
      )}
    </Card>
  )
}

/* ── A atividade nas 8 fontes, NO PERÍODO ──────────────────────────────────── */
function Atividade({ m }: { m: DeptMetrics }) {
  const tem = (...vs: number[]) => vs.some((v) => v > 0)
  const blocos: { titulo: string; cor: string; Icone: typeof GraduationCap; mostrar: boolean; filhos: React.ReactNode }[] = [
    {
      titulo: 'Chat Interno', cor: 'var(--chart-3)', Icone: MessageSquareText,
      mostrar: tem(m.chat.msgCanais, m.chat.msgDiretas, m.chat.chamadosAbertos, m.chat.chamadosConcluidos),
      filhos: (
        <div style={grade}>
          <N label="Mensagens" valor={m.chat.msgCanais + m.chat.msgDiretas + m.chat.msgChamados} cor="var(--chart-3)" nota="não entra no score" />
          <N label="Em canais" valor={m.chat.msgCanais} />
          <N label="Conversas diretas" valor={m.chat.msgDiretas} />
          <N label="Chamados abertos" valor={m.chat.chamadosAbertos} cor="var(--info)" />
          <N label="Chamados concluídos" valor={m.chat.chamadosConcluidos} cor="var(--success)" />
          {/* ⚠️ 1 d = 10 h aqui: o tempo do chamado é contado só no expediente
              (8h–18h, seg a sex) e vem pronto do chat. */}
          <N label="Tempo médio" valor={m.chat.chamadosConcluidos ? dur(Math.round(m.chat.segundos / m.chat.chamadosConcluidos), 10) : null} nota="só expediente" />
        </div>
      ),
    },
    {
      titulo: 'HelpDesk', cor: 'var(--chart-4)', Icone: LifeBuoy,
      mostrar: tem(m.helpdesk.abertos, m.helpdesk.resolvidos),
      filhos: (
        <div style={grade}>
          <N label="Chamados abertos" valor={m.helpdesk.abertos} cor="var(--info)" />
          <N label="Resolvidos" valor={m.helpdesk.resolvidos} cor="var(--success)" />
          <N label="Tempo médio" valor={m.helpdesk.resolvidosNormais ? dur(Math.round(m.helpdesk.segundos / m.helpdesk.resolvidosNormais)) : null} />
        </div>
      ),
    },
    {
      titulo: 'ClassRoom', cor: 'var(--chart-2)', Icone: GraduationCap,
      mostrar: tem(m.classroom.criados, m.classroom.assistidos, m.classroom.videos),
      filhos: (
        <div style={grade}>
          <N label="Cursos criados" valor={m.classroom.criados} cor="var(--accent)" />
          <N label="Cursos concluídos" valor={m.classroom.assistidos} cor="var(--chart-2)" />
          <N label="Vídeos assistidos" valor={m.classroom.videos} cor="var(--info)" />
        </div>
      ),
    },
    {
      titulo: 'Painel de Atendimento · WhatsApp', cor: 'var(--chart-1)', Icone: MessageCircle,
      mostrar: tem(m.whatsapp.abertos, m.whatsapp.finalizados),
      filhos: (
        <div style={grade}>
          <N label="Atendimentos abertos" valor={m.whatsapp.abertos} cor="var(--info)" />
          <N label="Finalizados" valor={m.whatsapp.finalizados} cor="var(--success)" />
          <N label="Tempo médio" valor={m.whatsapp.finalizados ? dur(Math.round(m.whatsapp.handleSum / m.whatsapp.finalizados)) : null} />
        </div>
      ),
    },
    {
      titulo: 'Consultoria Plus', cor: 'var(--chart-3)', Icone: MessagesSquare,
      mostrar: tem(m.consultoria.estudos, m.consultoria.chamados, m.consultoria.mensagens, m.consultoria.comentarios),
      filhos: (
        <div style={grade}>
          <N label="Estudos publicados" valor={m.consultoria.estudos} cor="var(--chart-3)" />
          <N label="Chamados abertos" valor={m.consultoria.chamados} />
          <N label="Mensagens" valor={m.consultoria.mensagens} />
          <N label="Comentários" valor={m.consultoria.comentarios} />
        </div>
      ),
    },
    {
      titulo: 'CIDE', cor: 'var(--chart-5)', Icone: Landmark,
      mostrar: tem(m.cide.atividades),
      filhos: <div style={grade}><N label="Alterações no cadastro" valor={m.cide.atividades} cor="var(--chart-5)" /></div>,
    },
    {
      titulo: 'Gerência · mensageria', cor: 'var(--chart-2)', Icone: Truck,
      mostrar: tem(m.gerencia.servicos, m.gerencia.protAbertos, m.gerencia.servCriados, m.gerencia.km),
      filhos: (
        <div style={grade}>
          <N label="Serviços entregues" valor={m.gerencia.servicos} cor="var(--chart-2)" />
          <N label="Km rodados" valor={m.gerencia.km} />
          <N label="Saídas" valor={m.gerencia.saidas} />
          <N label="Viagens" valor={m.gerencia.viagens} nota="fora do estado" />
          <N label="Protocolos abertos" valor={m.gerencia.protAbertos} cor="var(--info)" />
          <N label="Aprovações" valor={m.gerencia.protAprovados} />
          <N label="Serviços criados" valor={m.gerencia.servCriados} />
          <N label="Reagend. / cancel." valor={`${m.gerencia.reagendados} / ${m.gerencia.cancelados}`} />
        </div>
      ),
    },
    {
      titulo: 'Rádio Itamarathy', cor: 'var(--info)', Icone: Radio,
      mostrar: tem(m.radio.horas, m.radio.sessoes),
      filhos: (
        <div style={grade}>
          {/* ⚠️ A rádio é VITRINE: escuta não é trabalho e não entra no score. */}
          <N label="Horas ouvidas" valor={m.radio.horas} cor="var(--info)" nota="não entra no score" />
          <N label="Sessões" valor={m.radio.sessoes} />
        </div>
      ),
    },
  ]
  const ativos = blocos.filter((b) => b.mostrar)

  return (
    <>
      {/* Chamados ENTRE SETORES: as duas faces, que não se somam. */}
      {m.chamadosDoSetor && (m.chamadosDoSetor.pediu > 0 || m.chamadosDoSetor.recebeu > 0) && (
        <Card
          titulo="Chamados entre setores"
          sub="Duas faces do mesmo pedido: o que este setor pediu aos outros e o que recebeu para atender. Não se somam."
          cor="var(--chart-3)"
        >
          <div style={grade}>
            <N label="Pediu aos outros" valor={m.chamadosDoSetor.pediu} cor="var(--info)" />
            <N label="Desses, atendidos" valor={m.chamadosDoSetor.pediuConcluidos} />
            <N label="Recebeu para atender" valor={m.chamadosDoSetor.recebeu} cor="var(--chart-3)" />
            <N label="Concluiu" valor={m.chamadosDoSetor.recebeuConcluidos} cor="var(--success)" />
            <N label="Cancelados" valor={m.chamadosDoSetor.cancelados} nota="fora da média" />
            <N
              label="Tempo médio de atendimento"
              valor={m.chamadosDoSetor.recebeuConcluidos ? dur(Math.round(m.chamadosDoSetor.segundos / m.chamadosDoSetor.recebeuConcluidos), 10) : null}
              nota="só expediente · 1 d = 10 h"
            />
          </div>
        </Card>
      )}

      <Card titulo="Atividade nos sistemas" sub={`Somada no período · ${m.label}`} cor="var(--chart-2)">
        {ativos.length === 0 ? (
          /* ⚠️ "Sem atividade REGISTRADA", e não "sem atividade": o setor pode
             trabalhar fora dos sistemas medidos (Limpeza, Cozinha). A diferença
             entre as duas frases é a diferença entre um fato e uma acusação. */
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Nenhuma atividade <b>registrada nos sistemas medidos</b> neste período. Isso não quer
            dizer que o setor não trabalhou — quer dizer que o trabalho dele não passa por estes
            oito sistemas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ativos.map((b) => (
              <div key={b.titulo}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-dim)' }}>
                  <b.Icone size={14} color={b.cor} /> {b.titulo}
                </div>
                {b.filhos}
              </div>
            ))}
            {/* Só as fontes COM número aparecem; dizer quais ficaram de fora
                evita a leitura de que o sistema perdeu dado. */}
            {ativos.length < blocos.length && (
              <div style={{ fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                Fontes sem nenhum registro deste setor no período ficam de fora da lista:{' '}
                {blocos.filter((b) => !b.mostrar).map((b) => b.titulo.split(' ·')[0]).join(', ')}.
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  )
}

/* ── Assiduidade do setor no período ──────────────────────────────────────── */
function Assiduidade({ m }: { m: DeptMetrics }) {
  const a = m.assiduidade
  return (
    <Card titulo="Assiduidade e disciplina" sub={`Ponto eletrônico · ${m.label}`} cor="var(--warning)">
      <div style={grade}>
        <N label="Atrasos" valor={a.atrasos} cor={a.atrasos > 0 ? 'var(--warning)' : undefined} nota="não abonados" />
        <N label="Minutos de atraso" valor={a.minutos} />
        <N label="Atrasos abonados" valor={a.abonados} nota="justificados · não punem" />
        <N label="Advertências" valor={a.advertencias} cor={a.advertencias > 0 ? 'var(--danger)' : undefined} />
        {/* ⚠️ FALTA e SUSPENSÃO não vêm no dump do Nexo. Mostrar zero aqui se
            leria como "ninguém faltou", que é justamente o que não se sabe. */}
        <N label="Faltas" valor={a.faltas} nota="sem fonte na origem" />
      </div>
    </Card>
  )
}

/* ── Retrato da equipe (hoje, não do período) ─────────────────────────────── */
function Equipe({ m }: { m: DeptMetrics }) {
  const d = m.demografia
  const anos = d.tempoCasaMeses != null ? Math.floor(d.tempoCasaMeses / 12) : null
  const meses = d.tempoCasaMeses != null ? d.tempoCasaMeses % 12 : null
  const g = d.generos
  return (
    <Card
      titulo="A equipe"
      /* ⚠️ Isto é um RETRATO DE HOJE e não acompanha o filtro — idade e tempo de
         casa de "últimos 7 dias" não querem dizer nada. A tela avisa. */
      sub="Retrato de hoje · não acompanha o filtro de período"
      cor="var(--info)"
    >
      <div style={grade}>
        <N label="Pessoas ativas" valor={m.equipe.ativos} cor="var(--info)" />
        <N label="Idade média" valor={d.idadeMedia !== null ? `${d.idadeMedia} anos` : null} nota={d.idadesInformadas < m.equipe.ativos ? `${d.idadesInformadas} de ${m.equipe.ativos} informados` : undefined} />
        <N label="Tempo de casa médio" valor={anos !== null ? (anos > 0 ? `${anos}a ${meses}m` : `${meses}m`) : null} />
        <N label="Mulheres / homens" valor={`${g.F ?? 0} / ${g.M ?? 0}`} nota={g['?'] ? `${g['?']} não informado` : undefined} />
        {/* ⚠️ Quem não tem conta no Nexus não aparece em fonte nenhuma — a
            diferença explica por que a atividade pode parecer baixa. */}
        {m.equipe.comNexus < m.equipe.ativos && (
          <N label="Sem conta no Nexus" valor={m.equipe.ativos - m.equipe.comNexus} nota="fora das 8 fontes" />
        )}
      </div>
    </Card>
  )
}
