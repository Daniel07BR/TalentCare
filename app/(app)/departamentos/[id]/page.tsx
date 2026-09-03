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
import { Atencao } from './Atencao'
import { Pessoas } from './Pessoas'
import { Tendencia, Turnover } from './Tendencia'
import { CardFonte } from './CardFonte'
import { usePeriod } from '@/lib/ui/period'
import { criterioDe, ancoraDe, competenciaLabel, ANCORAS } from '@/lib/avaliacoes/criterios'
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
  const { m, estado } = useDeptPeriod(id)
  // ⚠️ Setor "cabe à Diretoria": cobrar do gestor uma avaliação que ele não pode
  // publicar é alerta que não se resolve — e alerta eterno se aprende a ignorar.
  // A rota já sabe quem está logado; aqui basta saber se ele alcança tudo.
  const ehAdmin = !!m?.ehAdmin

  /* ⚠️⚠️ O corte sai das ÂNCORAS (`criterios.ts`), e não de um número escrito
     aqui. Antes era `< 7`, e isso contradizia a própria escala da casa: 5–6 é
     "atende em parte", não "abaixo do esperado". A pessoa com 6,5 aparecia em
     VERMELHO e NOMEADA no canto mais nobre da tela, e em laranja na tabela logo
     abaixo — duas cores para a mesma nota na mesma página. */
  const CORTE_ABAIXO = ANCORAS[0].ate // 4 → "abaixo do esperado"
  const CORTE_PARCIAL = ANCORAS[1].ate // 6 → "atende em parte"
  const notas = (m?.pessoas ?? []).filter((p): p is typeof p & { nota: number } => p.nota != null)
  const abaixoDoEsperado = notas.filter((p) => p.nota <= CORTE_ABAIXO)
    .sort((a, b) => a.nota - b.nota).map((p) => ({ id: p.id, nome: p.nome, nota: p.nota }))
  const atendeEmParte = notas.filter((p) => p.nota > CORTE_ABAIXO && p.nota <= CORTE_PARCIAL)
    .sort((a, b) => a.nota - b.nota).map((p) => ({ id: p.id, nome: p.nome, nota: p.nota }))

  // Clicar num alerta leva ao bloco que o explica — alerta que não leva a lugar
  // nenhum obriga o gestor a caçar na página o que o número quis dizer.
  const irPara = (chave: string) => {
    const destino = chave === 'avaliar' || chave === 'abaixo' ? 'sec-pessoas'
      : chave === 'turnover' ? 'sec-tendencia' : 'sec-assiduidade'
    document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /* ⚠️⚠️ Estados distintos, e ANTES de desenhar o topo. O nome do setor, o
     score, a escolaridade e o heatmap vêm do dataset do cliente e NÃO passam
     pela régua da rota — desenhá-los enquanto a rota nega vaza o setor alheio
     para quem trocou o id na URL. */
  if (estado === 'negado') {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/departamentos')} style={voltar}>‹ Voltar aos departamentos</button>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Você não tem acesso a este setor</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>O relatório de um setor é visível para quem avalia nele e para a Diretoria.</div>
        </div>
      </div>
    )
  }
  if (estado === 'erro') {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/departamentos')} style={voltar}>‹ Voltar aos departamentos</button>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Não deu para carregar este relatório</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Recarregue a página. Se continuar, o servidor de métricas pode estar fora.</div>
        </div>
      </div>
    )
  }

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
      {/*
        ⚠️⚠️ A ORDEM DA PÁGINA É A ORDEM DO Z, e é uma decisão, não estética:
          1. topo-esquerda  → o que EXIGE AÇÃO (é onde o olho começa)
          2. topo-direita   → o veredito do setor, para situar
          3. meio           → AS PESSOAS, comparadas entre si — o coração
          4. abaixo         → tendência e rotatividade, ambas REAIS
          5. rodapé         → o detalhe por sistema e o contexto da equipe

        Um relatório de setor é lido por quem PODE AGIR sobre ele. Score e
        headcount não pedem nada de ninguém; "quatro pessoas sem avaliação e duas
        com advertência" pede — e por isso vem primeiro.
      */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
            Relatório do setor · <b>{label}</b>
          </div>
          <h1 style={{ margin: '0 0 18px', fontSize: 28, fontWeight: 700, letterSpacing: '-.7px' }}>{vm.name}</h1>
          {m ? (
            <Atencao m={m} abaixoDoEsperado={abaixoDoEsperado} atendeEmParte={atendeEmParte} ehAdmin={ehAdmin} onIr={irPara} />
          ) : (
            <div style={{ height: 92, background: 'var(--surface-2)', borderRadius: 'var(--radius)', opacity: 0.5 }} />
          )}
        </div>

        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="cnum" style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-2px', color: vm.kpis[0].color as string, lineHeight: 1 }}>{vm.score}</span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/100 score do setor</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Barra nome={vm.name} valor={vm.score} largura={vm.barSelf} cor="var(--accent)" />
            <Barra nome="Média da empresa" valor={vm.compAvg} largura={vm.barComp} cor="var(--text-mute)" esmaecido />
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Pessoas</div>
              <div className="cnum" style={{ fontSize: 18, fontWeight: 700 }}>{m ? m.equipe.ativos : vm.kpis[1].value}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>vs. empresa</div>
              <div className="cnum" style={{ fontSize: 18, fontWeight: 700, color: vm.score - vm.compAvg >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {vm.score - vm.compAvg >= 0 ? '+' : ''}{vm.score - vm.compAvg} pts
              </div>
            </div>
            {m && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Rotatividade</div>
                <div className="cnum" style={{ fontSize: 18, fontWeight: 700, color: m.turnover.taxa12m >= 20 ? 'var(--danger)' : 'var(--text)' }}>
                  {m.turnover.taxa12m}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 · AS PESSOAS — o coração do relatório */}
      <div id="sec-pessoas" style={{ marginBottom: 16 }}>
        {m && <Pessoas pessoas={m.pessoas} periodo={m.label} competencia={competenciaLabel(m.avaliacao.competencia)} />}
      </div>

      {/* 4 · TENDÊNCIA e ROTATIVIDADE, as duas reais */}
      {m && (
        <div id="sec-tendencia" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, marginBottom: 16, alignItems: 'start' }}>
          <Tendencia m={m} />
          <Turnover m={m} />
        </div>
      )}

      <div id="sec-avaliacao" />
      {m && <Avaliacao m={m} />}
      {m && <Atividade m={m} />}
      <div id="sec-assiduidade">{m && <Assiduidade m={m} />}</div>
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

      {/*
        ⚠️⚠️ Saíram daqui a "Evolução do score · 12 meses", o "Comparativo com a
        empresa" e o "Ranking interno".

        A evolução do score era `rnd(seed)` — passeio aleatório semeado pelo id do
        setor, terminando no score de hoje. Uma linha sem relação com o passado, no
        lugar mais nobre da tela. Virou a ATIVIDADE mês a mês, que é real.

        O comparativo subiu para o cartão de veredito, no topo: é contexto para ler
        o resto, não conclusão de rodapé.

        E o ranking virou `<Pessoas>` — um ranking só por score ordena gente sem
        dizer POR QUE; a comparação mostra nota, atividade e ocorrências lado a
        lado, que é o que deixa agir.
      */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atrasos do setor · últimas 18 semanas</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginBottom: 14 }}>
          Soma dos atrasos dos membros por dia; mais escuro = mais minutos. São sempre 18 semanas — não acompanha o filtro.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18,1fr)', gap: 3 }}>
          {vm.heat.map((c, i) => (
            <div key={i} className="cpop" style={{ animationDelay: `${Math.min(i, 40) * 8}ms`, aspectRatio: '1', borderRadius: 2, background: c.bg, opacity: c.future ? 0 : 1 }}
              title={c.future ? '' : c.atrasos > 0 ? `${c.iso}: ${c.atrasos} atraso${c.atrasos > 1 ? 's' : ''}` : `${c.iso}: sem ocorrência`} />
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

/* ── A atividade nas 8 fontes, NO PERÍODO ──────────────────────────────────
   ⚠️⚠️ Cada fonte virou um CARTÃO com quem fez à esquerda e o total à direita.
   A tira de números que havia antes respondia "quanto o setor fez" e sumia com
   QUEM fez — num relatório lido para decidir sobre gente, o nome é o dado.  */
function Atividade({ m }: { m: DeptMetrics }) {
  const tem = (...vs: number[]) => vs.some((v) => v > 0)
  const r = m.rankings
  const cards: React.ReactNode[] = []
  const fora: string[] = []

  const add = (chave: string, mostrar: boolean, node: React.ReactNode) => {
    if (mostrar) cards.push(<div key={chave}>{node}</div>)
    else fora.push(chave)
  }

  add('Painel de Atendimento', tem(m.whatsapp.abertos, m.whatsapp.finalizados),
    <CardFonte
      titulo="Painel de Atendimento · WhatsApp" cor="var(--chart-1)" Icone={MessageCircle}
      ranking={r.whatsapp} unidade="mais finalizou atendimento"
      numeros={[
        { label: 'Atendimentos abertos', valor: m.whatsapp.abertos, cor: 'var(--info)' },
        { label: 'Finalizados', valor: m.whatsapp.finalizados, cor: 'var(--success)' },
        { label: 'Tempo médio', valor: m.whatsapp.finalizados ? dur(Math.round(m.whatsapp.handleSum / m.whatsapp.finalizados)) : null },
      ]}
    />)

  add('Chat Interno', tem(m.chat.msgCanais, m.chat.msgDiretas, m.chat.chamadosAbertos, m.chat.chamadosConcluidos),
    <CardFonte
      titulo="Chat Interno" cor="var(--chart-3)" Icone={MessageSquareText}
      ranking={r.chat} unidade="mais concluiu chamado"
      numeros={[
        { label: 'Chamados abertos por estas pessoas', valor: m.chat.chamadosAbertos, cor: 'var(--info)' },
        { label: 'Concluídos', valor: m.chat.chamadosConcluidos, cor: 'var(--success)' },
        { label: 'Tempo médio', valor: m.chat.chamadosConcluidos ? dur(Math.round(m.chat.segundos / m.chat.chamadosConcluidos), 10) : null, nota: 'só expediente' },
        { label: 'Mensagens', valor: m.chat.msgCanais + m.chat.msgDiretas + m.chat.msgChamados, nota: 'não entra no score' },
      ]}
      rodape={<>Das mensagens, {m.chat.msgCanais.toLocaleString('pt-BR')} em canais, {m.chat.msgDiretas.toLocaleString('pt-BR')} em conversas diretas e {m.chat.msgChamados.toLocaleString('pt-BR')} dentro de chamados.</>}
    />)

  add('HelpDesk', tem(m.helpdesk.abertos, m.helpdesk.resolvidos),
    <CardFonte
      titulo="HelpDesk" cor="var(--chart-4)" Icone={LifeBuoy}
      ranking={r.helpdesk} unidade="mais resolveu"
      numeros={[
        { label: 'Chamados abertos', valor: m.helpdesk.abertos, cor: 'var(--info)' },
        { label: 'Resolvidos', valor: m.helpdesk.resolvidos, cor: 'var(--success)' },
        { label: 'Tempo médio', valor: m.helpdesk.resolvidosNormais ? dur(Math.round(m.helpdesk.segundos / m.helpdesk.resolvidosNormais)) : null, nota: `sobre ${m.helpdesk.resolvidosNormais} resolvidos no fluxo normal` },
      ]}
    />)

  add('ClassRoom', tem(m.classroom.criados, m.classroom.assistidos, m.classroom.videos),
    <CardFonte
      titulo="ClassRoom" cor="var(--chart-2)" Icone={GraduationCap}
      ranking={r.classroom} unidade="mais concluiu e criou curso"
      numeros={[
        { label: 'Cursos criados', valor: m.classroom.criados, cor: 'var(--accent)' },
        { label: 'Cursos concluídos', valor: m.classroom.assistidos, cor: 'var(--chart-2)' },
        { label: 'Vídeos assistidos', valor: m.classroom.videos, cor: 'var(--info)' },
      ]}
    />)

  add('Gerência', tem(m.gerencia.servicos, m.gerencia.protAbertos, m.gerencia.servCriados, m.gerencia.km),
    <CardFonte
      titulo="Gerência · mensageria" cor="var(--chart-2)" Icone={Truck}
      ranking={r.gerencia} unidade="mais entregou e pediu"
      numeros={[
        { label: 'Serviços entregues', valor: m.gerencia.servicos, cor: 'var(--chart-2)' },
        { label: 'Km rodados', valor: m.gerencia.km },
        { label: 'Saídas', valor: m.gerencia.saidas },
        { label: 'Viagens', valor: m.gerencia.viagens, nota: 'fora do estado' },
        { label: 'Protocolos abertos', valor: m.gerencia.protAbertos, cor: 'var(--info)' },
        { label: 'Serviços criados', valor: m.gerencia.servCriados },
      ]}
    />)

  add('Consultoria Plus', tem(m.consultoria.estudos, m.consultoria.chamados, m.consultoria.mensagens, m.consultoria.comentarios),
    <CardFonte
      titulo="Consultoria Plus" cor="var(--chart-3)" Icone={MessagesSquare}
      ranking={r.consultoria} unidade="mais registrou atividade"
      numeros={[
        { label: 'Estudos publicados', valor: m.consultoria.estudos, cor: 'var(--chart-3)' },
        { label: 'Chamados abertos', valor: m.consultoria.chamados },
        { label: 'Mensagens', valor: m.consultoria.mensagens },
        { label: 'Comentários', valor: m.consultoria.comentarios },
      ]}
    />)

  add('CIDE', tem(m.cide.atividades),
    <CardFonte
      titulo="CIDE" cor="var(--chart-5)" Icone={Landmark}
      ranking={r.cide} unidade="mais alterou cadastro"
      numeros={[{ label: 'Alterações no cadastro', valor: m.cide.atividades, cor: 'var(--chart-5)' }]}
    />)

  add('Rádio', tem(m.radio.horas, m.radio.sessoes),
    <CardFonte
      titulo="Rádio Itamarathy" cor="var(--info)" Icone={Radio}
      ranking={r.radio} unidade="mais ouviu"
      numeros={[
        { label: 'Horas ouvidas', valor: m.radio.horas, cor: 'var(--info)', nota: 'não entra no score' },
        { label: 'Sessões', valor: m.radio.sessoes },
      ]}
      rodape="Escuta não é trabalho — a rádio é vitrine e fica fora do score."
    />)

  if (cards.length === 0) {
    return (
      <Card titulo="Atividade nos sistemas" cor="var(--chart-2)">
        {/* ⚠️ "Sem atividade REGISTRADA", e não "sem atividade": o setor pode
            trabalhar fora dos sistemas medidos (Limpeza, Cozinha). A diferença
            entre as duas frases é a diferença entre um fato e uma acusação. */}
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Nenhuma atividade <b>registrada nos sistemas medidos</b> neste período. Isso não quer dizer
          que o setor não trabalhou — quer dizer que o trabalho dele não passa por estes oito sistemas.
        </div>
      </Card>
    )
  }

  return (
    <>
      {cards}
      {fora.length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.5, margin: '-4px 0 16px 2px' }}>
          Sem nenhum registro deste setor no período, e por isso fora da lista: {fora.join(', ')}.
        </div>
      )}
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

/** Uma barra de comparação com rótulo. Usada no cartão de veredito. */
function Barra({ nome, valor, largura, cor, esmaecido }: {
  nome: string; valor: number; largura: string; cor: string; esmaecido?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: esmaecido ? 'var(--text-dim)' : 'var(--text)' }}>{nome}</span>
        <span style={{ fontWeight: 700, color: esmaecido ? 'var(--text-dim)' : cor }}>{valor}</span>
      </div>
      <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}>
        <div className="cbar" style={{ height: '100%', width: largura, background: cor, borderRadius: 20 }} />
      </div>
    </div>
  )
}

/** Estilo do voltar, repetido nos três estados da página. */
const voltar: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18,
}
