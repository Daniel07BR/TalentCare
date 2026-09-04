'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, LifeBuoy, Landmark, MessagesSquare, Radio, Truck,
  MessageSquareText, MessageCircle, Search,
  FileSpreadsheet,
} from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { deptDetailVM } from '@/lib/mock/departments'
import { educationByDept } from '@/lib/mock/education'
import { useDeptPeriod, type DeptMetrics } from '@/lib/ui/dept-period'
import { Atencao } from './Atencao'
import { Pessoas } from './Pessoas'
import { Tendencia, Turnover } from './Tendencia'
import { CardFonte } from './CardFonte'
import { Hero, Escolaridade } from './Hero'
import { usePeriod } from '@/lib/ui/period'
import { criterioDe, ancoraDe, competenciaLabel, ANCORAS } from '@/lib/avaliacoes/criterios'
import Avatar from '../../Avatar'

export default function DepartamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { label } = usePeriod()
  /* ⚠️ Sem `withRealScores`/`useScoreSignals`: eles recalculavam o score da
     EMPRESA INTEIRA no cliente (mais um fetch a `/api/score-metrics`) para
     alimentar o cartão de veredito — que saiu da tela. O que sobra do `vm` é o
     nome do setor e o heatmap de atrasos, nenhum dos dois dependente de score. */
  const data = useTalentData()
  const vm = deptDetailVM(data, id)
  const edu = educationByDept(data).byDept.find((d) => d.id === id)
  // ⚠️⚠️ TODA a atividade da tela vem daqui, do PERÍODO. Antes ela saía de
  // `data.departments[x]`, que é o acumulado de toda a história — o TI aparecia
  // com 59 cursos criados debaixo do rótulo "Últimos 30 dias", quando no período
  // eram 4. O número não estava errado: respondia outra pergunta, o que é pior,
  // porque ninguém desconfia de um número plausível.
  const { m, estado } = useDeptPeriod(id)
  const [busca, setBusca] = useState('')
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
    /* ⚠️ "Faltam avaliar" levava à tabela, onde a resposta é uma fileira de
       chips "sem nota". O destino útil é o bloco da avaliação — e o alerta de
       nota baixa é que pertence à tabela, onde estão os nomes. */
    const destino = chave === 'avaliar' ? 'sec-avaliacao'
      : chave === 'abaixo' || chave === 'parcial' ? 'sec-pessoas'
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
  /* ⚠️⚠️ CARREGANDO também não desenha. O título, o veredito, a escolaridade e o
     heatmap vêm do dataset do CLIENTE e não passam pela régua da rota: quem
     trocasse o id na URL via nome, score, distribuição de formação e o mapa de
     atrasos do setor alheio ATÉ o 403 chegar. Os dois estados de falha estavam
     cobertos; a janela entre o clique e a resposta, não. */
  if (estado === 'carregando') {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => router.push('/departamentos')} style={voltar}>‹ Voltar aos departamentos</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[92, 260, 180].map((h, i) => (
            <div key={i} style={{ height: h, background: 'var(--surface-2)', borderRadius: 'var(--radius)', opacity: 0.55 }} />
          ))}
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
        ⚠️⚠️ A ORDEM DA PÁGINA (decisão do dono, 03/09/2026):
          1. QUEM responde pelo setor — a foto do gestor, os sub-encarregados
             menores, e o que está aceso (rotatividade, advertência, atraso)
          2. O que é FIXO: escolaridade e o retrato da equipe — não dependem do
             filtro, então vêm antes dele
          3. Só então os FILTROS (data e busca por pessoa) e tudo o que eles
             mexem

        ⚠️ O SCORE saiu do topo: ainda não foi validado e não vale. Um número
        grande no topo é lido como o veredito da página, e o veredito não pode
        ser um número que ninguém validou. A AVALIAÇÃO também saiu da hero — ela
        tem o bloco dela mais abaixo.
      */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Relatório do setor</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.7px' }}>{vm.name}</h1>
      </div>

      {m && <Hero m={m} podeEnviar={!!m.setor.podeGerir} />}
      {edu && <Escolaridade segs={edu.segs} informed={edu.informed} total={edu.total} />}

      {/* ── A PARTIR DAQUI, TUDO OBEDECE AOS FILTROS ──────────────────────
          A faixa deixa isso explícito. Sem ela, o leitor não tem como saber
          por que a idade média não mexe quando ele troca o período. */}
      <div className="tc-card filtros-setor" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
          Daqui para baixo
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex' }}><Search size={15} /></span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pessoa deste setor…"
            style={{ width: '100%', height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 34px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          Período: <b style={{ color: 'var(--text)' }}>{label}</b>
          <span style={{ color: 'var(--text-mute)' }}> · trocar no alto da tela</span>
        </div>
        {busca.trim() && (
          <button onClick={() => setBusca('')} className="tc-btn"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '5px 12px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
            Limpar busca
          </button>
        )}
      </div>

      {/* O que exige ação continua vindo antes das pessoas — mas depois dos
          filtros, porque ele obedece a eles. */}
      {m && <Atencao m={m} abaixoDoEsperado={abaixoDoEsperado} atendeEmParte={atendeEmParte} ehAdmin={ehAdmin} onIr={irPara} />}
      <div style={{ height: 16 }} />
      <Tarja>As pessoas</Tarja>
      <div id="sec-pessoas" style={{ marginBottom: 16 }}>
        {m && <Pessoas pessoas={m.pessoas} periodo={m.label} competencia={competenciaLabel(m.avaliacao.competencia)} avaliaveis={m.avaliacao.avaliaveis} busca={busca} />}
      </div>

      {/* 4 · TENDÊNCIA e ROTATIVIDADE, as duas reais.
             ⚠️ Tarja própria: elas são sobre o SETOR, não sobre as pessoas dele,
             e sem rótulo ficavam visualmente dentro de "As pessoas". */}
      <Tarja>Tendência do setor</Tarja>
      {m && (
        <div id="sec-tendencia" className="dept-duplo" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, marginBottom: 16, alignItems: 'start' }}>
          <Tendencia m={m} />
          <Turnover m={m} />
        </div>
      )}

      {/* ⚠️ Nove cartões de peso idêntico depois da dobra era onde o "monte de
          dados jogados" sobrevivia. As tarjas dão ritmo e dizem em que assunto o
          leitor está — sem mudar nada do conteúdo. */}
      <Tarja>O que aconteceu</Tarja>
      <div id="sec-avaliacao">{m && <Avaliacao m={m} />}</div>
      {m && <Atividade m={m} />}
      <Tarja>Assiduidade e contexto da equipe</Tarja>
      <div id="sec-assiduidade">{m && <Assiduidade m={m} />}</div>
      {m && <Equipe m={m} />}

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
  // ⚠️ Zero medido não vira caixa — ver o comentário gêmeo em `CardFonte`.
  // `null` continua aparecendo como "—": "não medimos" é informação.
  if (valor === 0 || valor === '0') return null
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

  /* ⚠️⚠️ A PLANILHA DO SETOR entra PRIMEIRO quando existe: é a fonte que aquele
     setor mantém à mão, e é a que ele reconhece. As outras oito são espelhos de
     sistemas que ele usa de passagem. */
  if (m.servicos?.temFonte) {
    const sv = m.servicos
    add('Serviços do setor', true,
      <CardFonte
        titulo="Serviços do setor" sub={sv.cobertura ? `da planilha ${sv.cobertura.arquivo}` : undefined}
        cor="var(--chart-2)" Icone={FileSpreadsheet}
        ranking={r.servicos?.gente ?? []} unidade={r.servicos?.rotulo || 'mais concluiu serviço'}
        /* ⚠️ TODO MUNDO do setor, inclusive em zero: nesta fonte faltar da lista
           é o dado. Ver `CardFonte.todos`. */
        todos
        semNinguem="Há serviços no período, mas nenhum está vinculado a alguém do quadro."
        numeros={[
          { label: 'Concluídos', valor: sv.concluidos, cor: 'var(--success)' },
          { label: 'Em aberto', valor: sv.abertos, cor: 'var(--warning)' },
          { label: 'Tempo somado', valor: sv.minutos ? dur(sv.minutos * 60) : null },
          /* ⚠️ Linha sem dono é NOTÍCIA. Sem ela, a soma das pessoas não fecha
             com o total do setor e o gestor procura um erro que não existe. */
          { label: 'Sem vínculo', valor: sv.semDono || null, cor: 'var(--text-mute)', nota: 'gente fora do quadro' },
        ]}
        rodape={
          <span style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.55, display: 'block' }}>
            {/* ⚠️⚠️ O RECORTE TEM DE SE ANUNCIAR. Os números acima obedecem ao
                filtro — e mesmo assim enganavam: quem subiu um arquivo de 6.980
                linhas e leu "236" perguntou, com razão, onde estavam os dados.
                Número certo que responde outra pergunta é o defeito que esta
                casa mais conhece; aqui ele aparece pelo avesso, com o período se
                passando pelo total. */}
            {sv.total && sv.total.concluidos > sv.concluidos && (
              <>
                Os números acima são <b>do período selecionado</b>. A planilha inteira tem{' '}
                <b style={{ color: 'var(--text-dim)' }}>{sv.total.concluidos.toLocaleString('pt-BR')} concluídos</b>
                {' '}em {sv.total.linhas.toLocaleString('pt-BR')} linhas — troque o período no alto da tela para ver mais.<br />
              </>
            )}
            {sv.cobertura && (
              <>A planilha cobre de {sv.cobertura.de.split('-').reverse().join('/')} a {sv.cobertura.ate.split('-').reverse().join('/')}.
              {' '}Fora dessa janela o setor não mediu — não é zero.</>
            )}
          </span>
        }
      />)
  }

  add('Painel de Atendimento', tem(m.whatsapp.abertos, m.whatsapp.finalizados),
    <CardFonte
      titulo="Painel de Atendimento · WhatsApp" cor="var(--chart-1)" Icone={MessageCircle}
      ranking={r.whatsapp.gente} unidade={r.whatsapp.rotulo || "mais finalizou atendimento"}
      numeros={[
        { label: 'Atendimentos abertos', valor: m.whatsapp.abertos, cor: 'var(--info)' },
        { label: 'Finalizados', valor: m.whatsapp.finalizados, cor: 'var(--success)' },
        { label: 'Tempo médio', valor: m.whatsapp.finalizados ? dur(Math.round(m.whatsapp.handleSum / m.whatsapp.finalizados)) : null },
      ]}
    />)

  add('Chat Interno', tem(m.chat.msgCanais, m.chat.msgDiretas, m.chat.chamadosAbertos, m.chat.chamadosConcluidos),
    <CardFonte
      titulo="Chat Interno" cor="var(--chart-3)" Icone={MessageSquareText}
      ranking={r.chat.gente} unidade={r.chat.rotulo || "mais concluiu chamado"}
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
      ranking={r.helpdesk.gente} unidade={r.helpdesk.rotulo || "mais resolveu"}
      numeros={[
        { label: 'Chamados abertos', valor: m.helpdesk.abertos, cor: 'var(--info)' },
        { label: 'Resolvidos', valor: m.helpdesk.resolvidos, cor: 'var(--success)' },
        { label: 'Tempo médio', valor: m.helpdesk.resolvidosNormais ? dur(Math.round(m.helpdesk.segundos / m.helpdesk.resolvidosNormais)) : null, nota: `sobre ${m.helpdesk.resolvidosNormais} resolvidos no fluxo normal` },
      ]}
    />)

  add('ClassRoom', tem(m.classroom.criados, m.classroom.assistidos, m.classroom.videos),
    <CardFonte
      titulo="ClassRoom" cor="var(--chart-2)" Icone={GraduationCap}
      ranking={r.classroom.gente} unidade={r.classroom.rotulo || "mais concluiu e criou curso"}
      numeros={[
        { label: 'Cursos criados', valor: m.classroom.criados, cor: 'var(--accent)' },
        { label: 'Cursos concluídos', valor: m.classroom.assistidos, cor: 'var(--chart-2)' },
        { label: 'Vídeos assistidos', valor: m.classroom.videos, cor: 'var(--info)' },
      ]}
    />)

  add('Gerência', tem(m.gerencia.servicos, m.gerencia.protAbertos, m.gerencia.servCriados, m.gerencia.km),
    <CardFonte
      titulo="Gerência · mensageria" cor="var(--chart-2)" Icone={Truck}
      ranking={r.gerencia.gente} unidade={r.gerencia.rotulo || "mais entregou e pediu"}
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
      ranking={r.consultoria.gente} unidade={r.consultoria.rotulo || "mais registrou atividade"}
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
      ranking={r.cide.gente} unidade={r.cide.rotulo || "mais alterou cadastro"}
      numeros={[{ label: 'Alterações no cadastro', valor: m.cide.atividades, cor: 'var(--chart-5)' }]}
    />)

  /* ⚠️⚠️ A RÁDIO NÃO TEM RANKING, e é uma decisão.
     Ela chegou a ter: um pódio de quem mais ouve, com foto, posição, barra e o
     #1 colorido — a MESMA gramática visual dos cartões de entrega. Numa tela
     lida para decidir aumento, uma pessoa aparecia em primeiro lugar de uma
     lista por escutar rádio no trabalho. O rodapé dizia "escuta não é trabalho",
     mas o rodapé é 10,5px e o pódio é a forma. Aqui só os totais. */
  add('Rádio', tem(m.radio.horas, m.radio.sessoes),
    <Card titulo="Rádio Itamarathy" cor="var(--info)" sub="Escuta não é trabalho — a rádio é vitrine e fica fora do score.">
      <div style={grade}>
        <N label="Horas ouvidas" valor={m.radio.horas} cor="var(--info)" />
        <N label="Sessões" valor={m.radio.sessoes} />
      </div>
    </Card>)

  /* ⚠️⚠️ REGRESSÃO CONSERTADA: este cartão SUMIU da tela quando a Atividade foi
     reescrita em `CardFonte`. A rota continuava calculando e devolvendo
     `chamadosDoSetor`, o tipo continuava declarando, e nenhum componente
     renderizava — as duas faces que não se somam eram o único lugar da tela a
     responder "quanto este setor atende os outros", que é o argumento de
     headcount do T.I, da Programação e do Pessoal.

     Sem ranking DE PROPÓSITO: a fonte é a função gravada no chamado, não a
     pessoa — e aqui o cartão sem "quem" é legítimo, desde que diga isso. */
  const cs = m.chamadosDoSetor
  if (cs && (cs.pediu > 0 || cs.recebeu > 0)) {
    cards.unshift(
      <Card
        key="entre-setores"
        titulo="Chamados entre setores"
        cor="var(--chart-3)"
        sub="Duas faces do mesmo pedido: o que este setor pediu aos outros e o que recebeu para atender. Não se somam — contado pela função gravada no chamado, e não por pessoa."
      >
        <div style={grade}>
          <N label="Pediu aos outros" valor={cs.pediu} cor="var(--info)" />
          <N label="Desses, atendidos" valor={cs.pediuConcluidos} />
          <N label="Recebeu para atender" valor={cs.recebeu} cor="var(--chart-3)" />
          <N label="Concluiu" valor={cs.recebeuConcluidos} cor="var(--success)" />
          <N label="Cancelados" valor={cs.cancelados} nota="fora da média" />
          <N label="Tempo médio de atendimento"
            valor={cs.recebeuConcluidos ? dur(Math.round(cs.segundos / cs.recebeuConcluidos), 10) : null}
            nota="só expediente · 1 d = 10 h" />
        </div>
      </Card>,
    )
  }

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

/* ⚠️ `Barra` foi removida junto com o cartão de veredito: o score saiu do topo
   por não estar validado (decisão do dono, 03/09/2026). Quando ele voltar, volta
   com a barra — não deixo componente órfão esperando um dono que pode não vir. */

/** Estilo do voltar, repetido nos três estados da página. */
const voltar: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18,
}

/** Tarja de seção. Dá ritmo à página sem competir com os títulos dos cartões. */
function Tarja({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-mute)', margin: '4px 0 10px 2px' }}>
      {children}
    </div>
  )
}
