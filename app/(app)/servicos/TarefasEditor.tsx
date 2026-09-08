'use client'
import { useEffect, useState } from 'react'
import { ListChecks, RotateCcw, TriangleAlert, ChevronUp, ChevronDown, Check, Sparkles, GitCompareArrows } from 'lucide-react'

type Tarefa = {
  tarefa: string; amostras: number
  mediaMedida: number; mediaSemLimites: number; semAmostraNaMedia: boolean
  mediaEmUso: number; mediaAjustada: number | null
  cronometradas: number; zerados: number
  abaixoDoMinimo: number; acimaDoMaximo: number
  tempoMinimo: number | null; tempoMaximo: number | null
  medianaMinutos: number
  maiores: { minutos: number; quem: string }[]
  menores: { minutos: number; quem: string }[]
  pontosAuto: number; pontos: number; pontosAjustados: boolean
  ajustado: boolean; ajustadoPor: string | null; ajustadoEm: string | null
  pontosAutoNaEpoca: number | null
  revisado: boolean; revisadoPor: string | null; revisadoEm: string | null
  pontosNaRevisao: number | null; mudouDesdeRevisao: boolean; mudouPelaRegua: boolean
  grafias: string[]; reguasEmDisputa: number; reguaDaGrafia: string | null
}

/* ── O QUE PRECISA DE OLHO ────────────────────────────────────────────────────
   ⚠️⚠️ Com 74 tipos, "o que mudou" e "o que ninguém nunca viu" não são
   perguntas que uma lista ordenada por frequência responde — e são exatamente
   as duas perguntas de quem abre esta tela depois de subir a planilha do mês.
   O filtro nasce em "pendentes" quando há pendência: a informação que a pessoa
   veio buscar não pode depender de ela saber que existe um filtro. */
type Filtro = 'todos' | 'pendentes' | 'mudaram' | 'grafias'
const pendente = (t: Tarefa) => !t.revisado
const mudou = (t: Tarefa) => t.mudouDesdeRevisao
const duplicada = (t: Tarefa) => t.grafias.length > 0

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

const dur = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`
}

/** Amostra pequena demais para a palavra "média" significar alguma coisa. */
const POUCAS_AMOSTRAS = 5
/** A média está sendo puxada por poucos casos longos. */
const PUXADA = 1.6

/** As colunas, num grid único — cabeçalho e linhas usam a MESMA definição, para
 *  não desalinharem quando uma das duas mudar. Sem largura fixa total: a coluna
 *  do nome absorve a sobra e a tabela nunca rola na horizontal. */
const COLS = 'minmax(0,1fr) 58px 84px 84px 100px 80px 92px 30px 30px'

/** A ordenação, num lugar só — usada ao carregar e ao clicar num título. */
function ordenar(lista: Tarefa[], ordem: { col: Coluna; desc: boolean }): string[] {
  return [...lista].sort((a, b) => {
    const { col, desc } = ordem
    if (col === 'tarefa') {
      const r = a.tarefa.localeCompare(b.tarefa, 'pt-BR')
      return desc ? -r : r
    }
    const va = a[col] as number | null
    const vb = b[col] as number | null
    /* ⚠️ Nulos por último, nos DOIS sentidos: ausência não é "menor que". Sem
       isso, ordenar por mínimo traria ao topo as 47 tarefas que ninguém limitou
       como se todas tivessem mínimo zero. */
    if (va == null && vb == null) return a.tarefa.localeCompare(b.tarefa, 'pt-BR')
    if (va == null) return 1
    if (vb == null) return -1
    return desc ? vb - va : va - vb
  }).map((t) => t.tarefa)
}

/* As colunas que dá para ordenar, e por qual número cada uma ordena.
   ⚠️ `null` (mínimo/máximo não definidos) vai SEMPRE para o fim, nos dois
   sentidos: ausência não é "menor que", é ausência — a mesma regra que vale
   para o resto do painel. Ordenar por mínimo com os nulos misturados faria
   parecer que 47 tarefas têm mínimo zero. */
type Coluna = 'tarefa' | 'amostras' | 'tempoMinimo' | 'tempoMaximo' | 'mediaEmUso' | 'medianaMinutos' | 'pontos'
const ORDENAVEIS: { chave: Coluna; label: string; dica?: string; numerica: boolean }[] = [
  { chave: 'tarefa', label: 'Tipo de serviço', numerica: false },
  { chave: 'amostras', label: 'Feitos', numerica: true },
  { chave: 'tempoMinimo', label: 'Mínimo', dica: 'Serviço mais rápido que isto sai da média — o trabalho continua contando, o tempo não', numerica: true },
  { chave: 'tempoMaximo', label: 'Máximo', dica: 'Serviço mais lento que isto sai da média — o trabalho continua contando, o tempo não', numerica: true },
  { chave: 'mediaEmUso', label: 'Média usada', numerica: true },
  { chave: 'medianaMinutos', label: 'Mediana', numerica: true },
  { chave: 'pontos', label: 'Pontos', numerica: true },
]

export default function TarefasEditor({ departmentId, setorNome, versao = 0 }: { departmentId: string; setorNome: string; versao?: number }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [fator, setFator] = useState(0.5)
  const [fatorDecidido, setFatorDecidido] = useState(true)
  const [reguaCriadaEm, setReguaCriadaEm] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState<Record<string, { media?: string; pontos?: string; minimo?: string; maximo?: string }>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: 'amostras', desc: true })
  /* ⚠️⚠️ A ORDEM É CONGELADA numa lista de nomes, e só muda quando a pessoa
     clica num título ou o setor é recarregado. Recalculá-la a cada valor
     digitado faria a linha PULAR de posição no instante em que ela é editada —
     o outro jeito de perder o lugar, e mais desconcertante que o recarregamento,
     porque a tela nem pisca: o número simplesmente vai parar em outro canto. */
  const [ordemNomes, setOrdemNomes] = useState<string[]>([])
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [filtro, setFiltro] = useState<Filtro>('todos')

  async function carregar() {
    setCarregando(true)
    try {
      const r = await fetch(`/api/servicos/tarefas?departmentId=${departmentId}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui ler os tipos de serviço.'); setTarefas([]); return }
      const lista: Tarefa[] = d.tarefas ?? []
      setTarefas(lista); setFator(d.fatorPorMinuto ?? 0.5); setTotal(d.totalConcluidos ?? 0)
      setFatorDecidido(d.fatorDecidido !== false); setReguaCriadaEm(d.reguaCriadaEm ?? null)
      setRascunho({})
      /* ⚠️ A tela ABRE no que precisa de decisão, quando há. Era o pedido do
         dono: guardar o que já foi decidido e "apresentar para ajuste os novos
         lançamentos" — apresentar, não deixar disponível atrás de um filtro que
         a pessoa precisa descobrir. */
      setFiltro(lista.some(pendente) ? 'pendentes' : lista.some(mudou) ? 'mudaram' : 'todos')
      /* A ordem é FIXADA aqui, não recalculada a cada tecla — ver `nomesEmOrdem`. */
      setOrdemNomes(ordenar(d.tarefas ?? [], ordem))
    } finally { setCarregando(false) }
  }
  /* ⚠️ `versao` sobe quando uma planilha é importada: sem ela a tabela ficava
     no catálogo de antes do envio — sem os tipos novos, com os pontos velhos —
     logo abaixo do cartão que promete o contrário. */
  useEffect(() => { carregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [departmentId, versao])

  /**
   * ⚠️⚠️ SALVAR NÃO RECARREGA A TELA.
   *
   * Antes cada tecla nos campos de mínimo/máximo disparava um `carregar()`
   * completo: a tabela sumia atrás de "Medindo a duração de cada tipo…", as 74
   * linhas remontavam e a pessoa perdia o lugar no meio do trabalho. A rota
   * passou a devolver A LINHA recalculada, e aqui a gente troca só ela.
   *
   * ⚠️ Enquanto salva, a linha fica marcada (`salvando`) em vez de a tela
   * inteira parar: o retorno visual continua existindo, sem custar o contexto.
   */
  async function salvar(t: Tarefa, campo: 'media' | 'pontos' | 'minimo' | 'maximo' | 'limpar' | 'revisar' | 'revisar_todos', valor: number | null) {
    setSalvando((v) => ({ ...v, [t.tarefa]: true }))
    try {
      const r = await fetch('/api/servicos/tarefas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, tarefa: t.tarefa, campo, valor, pontosAuto: t.pontosAuto }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui salvar.'); return }
      setMsg(null)
      /* Confirmar todos mexe em 74 linhas — a única operação da tela que faz
         isso, e a única que justifica recarregar o catálogo inteiro. */
      if (d.recarregar) { await carregar(); return }
      if (d.tarefa) setTarefas((ts) => ts.map((x) => (x.tarefa === d.tarefa.tarefa ? d.tarefa : x)))
      // O rascunho DESTA linha sai; o das outras fica como estava.
      setRascunho((r2) => { const c = { ...r2 }; delete c[t.tarefa]; return c })
    } catch {
      setMsg('A rede falhou — o valor pode não ter sido salvo. Recarregue para conferir.')
    } finally {
      setSalvando((v) => { const c = { ...v }; delete c[t.tarefa]; return c })
    }
  }

  if (!carregando && !tarefas.length) return null

  /* Um clique ordena; clicar de novo na MESMA coluna inverte. Texto começa
     A→Z e número começa do maior — é o que a pessoa espera de cada um. */
  const clicar = (col: Coluna) => {
    const nova = ordem.col === col
      ? { col, desc: !ordem.desc }
      : { col, desc: ORDENAVEIS.find((c) => c.chave === col)!.numerica }
    setOrdem(nova)
    setOrdemNomes(ordenar(tarefas, nova))
  }

  // Renderiza pela ordem congelada; o que entrou depois vai para o fim.
  const porNome = new Map(tarefas.map((t) => [t.tarefa, t]))
  const ordenadas = ordemNomes.length
    ? [...ordemNomes.map((n) => porNome.get(n)).filter((t): t is Tarefa => !!t),
       ...tarefas.filter((t) => !ordemNomes.includes(t.tarefa))]
    : tarefas

  const poucas = tarefas.filter((t) => t.amostras < POUCAS_AMOSTRAS).length
  const ajustadas = tarefas.filter((t) => t.ajustado).length
  const nPendentes = tarefas.filter(pendente).length
  const nMudaram = tarefas.filter(mudou).length
  const nPelaRegua = tarefas.filter((t) => t.mudouPelaRegua).length
  const nGrafias = tarefas.filter(duplicada).length
  const nDivergentes = tarefas.filter((t) => t.reguasEmDisputa > 0).length
  /* ⚠️⚠️ O EFEITO DOS LIMITES, SOMADO. Cada linha já avisa quando os limites
     dela cortaram fundo, mas ninguém lê 74 linhas — e o agregado conta outra
     história: medido em 08/09/2026, **44 dos 74** tipos perdem mais da metade
     dos serviços para o mínimo e o máximo, e **10 perdem todos**. Quando o
     corte é a regra e não a exceção, o que a média descreve deixou de ser o
     trabalho da equipe, e quem define o peso precisa saber disso antes de
     olhar linha por linha. */
  const nCortouMuito = tarefas.filter((t) => {
    const total = t.cronometradas + t.abaixoDoMinimo + t.acimaDoMaximo
    return total > 0 && t.cronometradas < total / 2
  }).length
  const nSemAmostra = tarefas.filter((t) => t.semAmostraNaMedia).length

  const passaNoFiltro = (t: Tarefa) =>
    filtro === 'todos' ? true : filtro === 'pendentes' ? pendente(t) : filtro === 'mudaram' ? mudou(t) : duplicada(t)
  const visiveis = ordenadas.filter(passaNoFiltro)

  const CHIPS: { chave: Filtro; label: string; n: number; cor: string }[] = [
    { chave: 'todos', label: 'Todos', n: tarefas.length, cor: 'var(--text-dim)' },
    { chave: 'pendentes', label: 'Nunca revisados', n: nPendentes, cor: 'var(--warning)' },
    { chave: 'mudaram', label: 'Mudaram desde a revisão', n: nMudaram, cor: 'var(--accent)' },
    { chave: 'grafias', label: 'Grafia repetida', n: nGrafias, cor: 'var(--danger)' },
  ]

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ListChecks size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por tipo de serviço — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Cada tipo vale <b>{fator} ponto por minuto</b>{!fatorDecidido && <span style={{ color: 'var(--warning)' }}> (valor provisório — este setor ainda não tem régua de pontuação gravada)</span>} do tempo médio, medido em{' '}
        <b>{total.toLocaleString('pt-BR')} serviços concluídos</b> da planilha inteira — não do período selecionado,
        porque quanto um serviço leva é característica dele, não da janela que você está olhando.
        {' '}<b>A média e os pontos são editáveis</b>: mudar a média recalcula os pontos na hora.
        {ajustadas > 0 && <> · <b style={{ color: 'var(--accent)' }}>{ajustadas} {ajustadas === 1 ? 'ajustado' : 'ajustados'} à mão</b></>}
        {/* ⚠️⚠️ O QUE O SETOR DECIDE FICA. Era o pedido do dono em 08/09/2026, e
            a tela precisa dizê-lo: a decisão é guardada por setor e por tipo,
            fora do lote, e a planilha do mês que vem não a apaga. O que ela
            faz é trazer tipos NOVOS — e esses o sistema não decide sozinho. */}
        <div style={{ marginTop: 8 }}>
          O que você decidir aqui <b>vale para os próximos arquivos</b>: fica guardado por tipo de serviço, não por
          planilha. Os limites continuam valendo sobre os serviços novos — e o sistema avisa quando o valor de um tipo
          se afastar do que você conferiu.
        </div>
      </div>

      {/* ── o que precisa de olho ───────────────────────────────────────────
          ⚠️⚠️ "Ninguém nunca olhou" e "olharam e mantiveram o medido" eram a
          MESMA coisa: a ausência de linha no banco. É a regra da casa em mais
          uma roupa — ausência de decisão não é decisão de manter —, e o preço
          era uma lista de pendências que nunca esvazia, que é uma lista que
          ninguém lê. O ✓ de cada linha grava "conferi, e está certo". */}
      {!carregando && tarefas.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {CHIPS.filter((c) => c.chave === 'todos' || c.n > 0).map((c) => {
            const on = filtro === c.chave
            return (
              <button key={c.chave} onClick={() => setFiltro(c.chave)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px',
                  background: on ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${on ? c.cor : 'var(--border)'}`, borderRadius: 999,
                  color: on ? c.cor : 'var(--text-dim)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 500,
                }}>
                {c.label}
                <span style={{ fontVariantNumeric: 'tabular-nums', color: on ? c.cor : 'var(--text-mute)' }}>{c.n}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ⚠️⚠️ A MESMA GRAFIA, DUAS VEZES. Medido em 08/09/2026: "TAXAS PREFEITURA
          (TFE/TFA) Emitir boletos" e "… emitir boletos" são o mesmo serviço, com
          5 concluídos cada, e alguém do Legal configurou os dois separadamente —
          com máximos DIFERENTES, 240 e 237. Nada acusava, porque são duas linhas
          plausíveis. O sistema não escolhe entre 240 e 237: mostra e pergunta. */}
      {nDivergentes > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.55 }}>
          <GitCompareArrows size={13} style={{ verticalAlign: -2 }} />{' '}
          <b style={{ color: 'var(--text)' }}>{nDivergentes === 1 ? 'Um serviço estava' : `${nDivergentes} serviços estavam`} partido em mais de uma grafia</b>
          {' '}(muda só a caixa, o acento ou um espaço), com uma régua configurada em cada uma. Agora {nDivergentes === 1 ? 'ele conta' : 'eles contam'} como
          um serviço só — a amostra é a soma das grafias — e <b>vale a régua que dá mais pontos</b>. A linha diz qual
          grafia ganhou. Para acabar com a duplicidade de vez, o nome tem de ser acertado no sistema de origem.
        </div>
      )}

      {poucas > 0 && (
        /* ⚠️⚠️ Média de amostra pequena não é média. Dos 74 tipos do Legal, 16
           aconteceram UMA vez. Sem este aviso, um serviço que ocorreu uma vez e
           travou por 8 horas vira o mais valioso do catálogo para sempre. */
        <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <TriangleAlert size={13} style={{ verticalAlign: -2 }} /> <b>{poucas} {poucas === 1 ? 'tipo tem' : 'tipos têm'} menos de {POUCAS_AMOSTRAS} ocorrências.</b>
          {' '}A média deles é o próprio caso, não uma média — vale conferir o número à mão antes de deixá-lo valendo.
        </div>
      )}

      {/* ⚠️⚠️ O FATOR AINDA NÃO É DECISÃO DE NINGUÉM. Sem régua gravada, o 0,5 é
          o padrão do código, e ele multiplica TODA a coluna de pontos — os
          ajustes já feitos foram decididos olhando números derivados dele. A
          tela dizia "cada tipo vale 0,5 ponto por minuto" como fato. */}
      {!carregando && !fatorDecidido && tarefas.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <TriangleAlert size={13} style={{ verticalAlign: -2 }} /> <b>Este setor ainda não tem régua de pontuação gravada.</b>
          {' '}O <b>{fator} ponto por minuto</b> é o valor provisório do sistema, não uma decisão registrada — e ele
          multiplica a coluna de pontos inteira. Quando a régua for criada com outro fator, <b>todos os {tarefas.length} tipos
          mudam de valor de uma vez</b>, e cada um vai aparecer aqui como “mudou desde a revisão”. Vale definir o fator
          antes de afinar tipo por tipo.
        </div>
      )}

      {/* ⚠️⚠️ UMA notícia, não 74. A régua mudar move todos os tipos no mesmo
          instante, por um ato que já tem autor, data e motivo gravados — e 74
          alarmes individuais para isso enterram o sinal que o aviso existe para
          dar: a PLANILHA ter mexido no valor de um tipo sem ninguém anunciar. */}
      {!carregando && nPelaRegua > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.55 }}>
          <b style={{ color: 'var(--text)' }}>A régua de pontuação mudou{reguaCriadaEm ? ` em ${dataBr(reguaCriadaEm)}` : ''} — e por isso {nPelaRegua === tarefas.length ? 'todos os' : ''} {nPelaRegua} {nPelaRegua === 1 ? 'tipo mudou' : 'tipos mudaram'} de valor de uma vez.</b>
          {' '}Não foi a planilha: o fator agora é <b>{fator} ponto por minuto</b> e ele multiplica a coluna inteira. O que
          vocês ajustaram — mínimo, máximo e média de cada tipo — continua valendo; só a escala é outra.
          <button onClick={() => salvar(tarefas[0], 'revisar_todos', null)} disabled={!!salvando['__todos__']}
            style={{ marginLeft: 10, height: 26, padding: '0 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
            Conferir os {nPelaRegua} valores novos
          </button>
        </div>
      )}

      {nCortouMuito > 0 && (
        <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <TriangleAlert size={13} style={{ verticalAlign: -2 }} />{' '}
          <b>{nCortouMuito} de {tarefas.length} tipos perdem mais da metade dos serviços para o mínimo e o máximo</b>
          {nSemAmostra > 0 && <>, e <b>{nSemAmostra} {nSemAmostra === 1 ? 'perde' : 'perdem'} todos</b></>}.
          {' '}Quando o corte é a regra e não a exceção, a média deixa de descrever o trabalho da equipe e passa a
          descrever a faixa que os limites escolheram. Cada linha diz quantos ela tirou.
        </div>
      )}

      {msg && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{msg}</div>}

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Medindo a duração de cada tipo…</div>
      ) : (
        <>
          {/* ⚠️ O cabeçalho ORDENA. Com 74 tipos, "qual serviço vale mais" e
              "quais eu ainda não limitei" são perguntas que a lista fixa por
              frequência não responde. */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '0 6px 8px', borderBottom: '1px solid var(--border)' }}>
            {ORDENAVEIS.map((c) => {
              const ativa = ordem.col === c.chave
              return (
                <button key={c.chave} onClick={() => clicar(c.chave)} title={c.dica ?? `Ordenar por ${c.label.toLowerCase()}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    justifyContent: c.numerica ? 'flex-end' : 'flex-start',
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase',
                    color: ativa ? 'var(--accent)' : 'var(--text-mute)',
                  }}>
                  {c.label}
                  {ativa && (ordem.desc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                </button>
              )
            })}
            <span />
            <span />
          </div>

          {visiveis.length === 0 && (
            /* ⚠️ Lista vazia DIZ por quê e oferece a volta. Um filtro que
               esvazia a tela sem explicação se lê como sistema quebrado. */
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '14px 6px', lineHeight: 1.6 }}>
              {filtro === 'pendentes' ? 'Todos os tipos já passaram por alguém — nenhum está sem revisão.'
                : filtro === 'mudaram' ? 'Nenhum tipo se afastou do valor que foi conferido.'
                : 'Nenhum tipo aparece com mais de uma grafia.'}
              {' '}<button onClick={() => setFiltro('todos')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}>Ver todos os {tarefas.length}</button>
            </div>
          )}

          {/* ⚠️ O filtro ABRE nos pendentes, que é o que o dono pediu ver — mas
              esconder 72 de 74 linhas sem dizer faz a tela parecer o catálogo
              inteiro. A contagem fica visível, e a saída também. */}
          {filtro !== 'todos' && visiveis.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', padding: '8px 6px 0' }}>
              Mostrando {visiveis.length} de {tarefas.length} tipos.{' '}
              <button onClick={() => setFiltro('todos')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600 }}>Ver todos</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visiveis.map((t) => {
              const poucasAmostras = t.amostras < POUCAS_AMOSTRAS
              const puxada = t.mediaMedida >= t.medianaMinutos * PUXADA && t.amostras >= POUCAS_AMOSTRAS
              const rMedia = rascunho[t.tarefa]?.media ?? String(t.mediaEmUso)
              const rMinimo = rascunho[t.tarefa]?.minimo ?? (t.tempoMinimo != null ? String(t.tempoMinimo) : '')
              const rMaximo = rascunho[t.tarefa]?.maximo ?? (t.tempoMaximo != null ? String(t.tempoMaximo) : '')
              /* ⚠️ Teto abaixo do piso não filtra nada — sobra zero. A tela
                 avisa em vez de mostrar uma média vazia sem explicação. */
              const limitesInvertidos = t.tempoMinimo != null && t.tempoMaximo != null && t.tempoMaximo <= t.tempoMinimo
              /* Cortou mais da metade: não é exceção que saiu, é outra tarefa. */
              const cortouMuito = (t.abaixoDoMinimo + t.acimaDoMaximo) > (t.cronometradas + t.abaixoDoMinimo + t.acimaDoMaximo) / 2
              const rPontos = rascunho[t.tarefa]?.pontos ?? String(t.pontos)
              /* ⚠️ O ESPELHO NA TELA: enquanto a pessoa digita a média, os pontos
                 já mostram o resultado, com a MESMA conta do servidor. Esperar o
                 salvamento para ver o efeito faria a régua ser ajustada às cegas. */
              const pontosPrevistos = Math.max(1, Math.round((parseInt(rMedia || '0', 10) || 0) * fator))
              /* ⚠️⚠️ EM REPOUSO, O CAMPO MOSTRA O QUE VALE — não o que a conta daria.
                 O espelho valia enquanto a pessoa digita; fora disso, ele apagava a
                 decisão da tela. Medido em 08/09/2026: SERVIÇOS INTERNOS - VERIFICAR
                 CALCULADORA tem override de **0** (o setor decidiu que não vale
                 ponto) e o campo exibia **8**, com a borda de "ajustado à mão" e um
                 tooltip dizendo que o cálculo dá 8. A única decisão de pontos do
                 catálogo inteiro era a única coisa invisível nele — e a ordenação
                 por Pontos, que usa o valor de verdade, mandava a linha para o fim
                 mostrando 8. */
              const editando = rascunho[t.tarefa]?.media != null
                || rascunho[t.tarefa]?.minimo != null || rascunho[t.tarefa]?.maximo != null
              const mostrarPontos = rascunho[t.tarefa]?.pontos != null ? rPontos
                : editando ? String(pontosPrevistos) : String(t.pontos)

              return (
                <div key={t.tarefa} style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', opacity: salvando[t.tarefa] ? 0.55 : 1, transition: 'opacity .12s' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', fontSize: 12.5 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={t.tarefa}>
                      {t.tarefa}
                    </span>
                    <span style={{ textAlign: 'right', color: poucasAmostras ? 'var(--warning)' : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}
                      title={t.zerados ? `${t.amostras} feitos, ${t.cronometradas} com tempo cronometrado` : undefined}>
                      {t.amostras}
                    </span>

                    {/* ⚠️⚠️ O TEMPO MÍNIMO. Serviço mais rápido que isto sai da
                        MÉDIA — o trabalho continua contando, o tempo não. É a
                        mesma família do tempo zero, um degrau acima: zero é
                        "ninguém cronometrou" e o sistema descobre sozinho;
                        abaixo do mínimo é "isto não pode ter sido feito de
                        verdade", e só quem conhece o trabalho sabe. */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" value={rMinimo} placeholder="—"
                        onChange={(e) => setRascunho((r) => ({ ...r, [t.tarefa]: { ...r[t.tarefa], minimo: e.target.value, media: undefined, pontos: undefined } }))}
                        onBlur={() => {
                          const v = rMinimo === '' ? null : parseInt(rMinimo, 10)
                          /* ⚠️⚠️ ESVAZIAR O MÍNIMO TIRA SÓ O MÍNIMO. Antes mandava
                             `limpar`, que apaga o máximo, a média lançada e o
                             override junto — o espelho deste campo, o do máximo,
                             sempre fez certo. Medido em 08/09/2026: apagar a
                             caixinha do mínimo no CANCELAMENTO (78 serviços, média
                             lançada 200, o 2º tipo mais caro do catálogo) derrubava
                             o tipo de 100 para 17 pontos, sem confirmação, sem
                             aviso e sem desfazer. */
                          if (v !== (t.tempoMinimo ?? null)) salvar(t, 'minimo', v)
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        title={t.tempoMinimo != null
                          ? `Definido por ${t.ajustadoPor} em ${dataBr(t.ajustadoEm)}.\n${t.abaixoDoMinimo} ${t.abaixoDoMinimo === 1 ? 'serviço ficou' : 'serviços ficaram'} de fora da média por ser mais rápido que isto.`
                          : 'O tempo mínimo que este serviço leva. Nada mais rápido que isto entra na média — o serviço continua contando como feito.'}
                        style={{
                          height: 30, width: '100%', textAlign: 'right', padding: '0 26px 0 6px',
                          background: 'var(--surface-2)',
                          border: `1px solid ${t.tempoMinimo != null ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                          fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-mute)', pointerEvents: 'none' }}>min</span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" value={rMaximo} placeholder="—"
                        onChange={(e) => setRascunho((r) => ({ ...r, [t.tarefa]: { ...r[t.tarefa], maximo: e.target.value, media: undefined, pontos: undefined } }))}
                        onBlur={() => {
                          const v = rMaximo === '' ? null : parseInt(rMaximo, 10)
                          if (v !== (t.tempoMaximo ?? null)) salvar(t, 'maximo', v)
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        title={t.tempoMaximo != null
                          ? `Definido por ${t.ajustadoPor} em ${dataBr(t.ajustadoEm)}.\n${t.acimaDoMaximo} ${t.acimaDoMaximo === 1 ? 'serviço ficou' : 'serviços ficaram'} de fora da média por ser mais lento que isto.`
                          : 'O tempo máximo que este serviço leva. Nada mais lento que isto entra na média — o serviço continua contando como feito.'}
                        style={{
                          height: 30, width: '100%', textAlign: 'right', padding: '0 26px 0 6px',
                          background: 'var(--surface-2)',
                          border: `1px solid ${limitesInvertidos ? 'var(--danger)' : (t.tempoMaximo != null ? 'var(--accent)' : 'var(--border)')}`,
                          borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                          fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-mute)', pointerEvents: 'none' }}>min</span>
                    </div>

                    {/* MÉDIA EDITÁVEL, em minutos. ⚠️ A medida continua ao lado
                        quando a pessoa muda: trocar uma pela outra faria o
                        sistema afirmar que mediu o que alguém decidiu. */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" value={rMedia}
                        onChange={(e) => setRascunho((r) => ({ ...r, [t.tarefa]: { ...r[t.tarefa], media: e.target.value, pontos: undefined } }))}
                        onBlur={() => {
                          const v = parseInt(rMedia || '', 10)
                          if (Number.isFinite(v) && v !== t.mediaEmUso) salvar(t, 'media', v)
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        /* ⚠️⚠️ QUEM LANÇOU E QUANDO (pedido do dono). Um número
                           que define o peso de um serviço, e que alguém pode ter
                           mudado à mão, precisa dizer de quem ele é. Sem ajuste,
                           diz de onde a medição saiu — quantos serviços e quantos
                           ficaram de fora por virem sem tempo. */
                        title={t.mediaAjustada != null
                          ? `Lançado por ${t.ajustadoPor} em ${dataBr(t.ajustadoEm)}.\n` + (t.semAmostraNaMedia
                              /* ⚠️⚠️ Sem esta ramificação a tela dizia "o medido na
                                 planilha é 0 min" para os 10 tipos cujos limites
                                 tiraram TODOS os serviços — o CANCELAMENTO entre
                                 eles, com 33 min medidos em 78 serviços. Zero não
                                 foi medido: foi filtrado. */
                              ? `Os limites de ${t.tempoMinimo ?? '—'}–${t.tempoMaximo ?? '—'} min tiraram TODOS os ${t.abaixoDoMinimo + t.acimaDoMaximo} serviços cronometrados da média. Sem eles, o medido são ${t.mediaSemLimites} min.`
                              : `O medido na planilha é ${t.mediaMedida} min, em ${t.cronometradas} serviços cronometrados.`)
                          : `Medido em ${t.cronometradas} ${t.cronometradas === 1 ? 'serviço cronometrado' : 'serviços cronometrados'}${t.zerados ? `, com ${t.zerados} fora da conta por virem sem tempo` : ''}.\nPode mudar — o valor que você digitar passa a valer no lugar deste.`}
                        style={{
                          height: 30, width: '100%', textAlign: 'right', padding: '0 26px 0 8px',
                          background: 'var(--surface-2)',
                          border: `1px solid ${t.mediaAjustada != null ? 'var(--accent)' : (puxada ? 'rgba(245,166,35,.5)' : 'var(--border)')}`,
                          borderRadius: 'var(--radius-sm)',
                          color: puxada && t.mediaAjustada == null ? 'var(--warning)' : 'var(--text)',
                          fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-mute)', pointerEvents: 'none' }}>min</span>
                    </div>

                    <span style={{ textAlign: 'right', color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums' }}>{dur(t.medianaMinutos)}</span>

                    <input
                      type="number" value={mostrarPontos}
                      onChange={(e) => setRascunho((r) => ({ ...r, [t.tarefa]: { ...r[t.tarefa], pontos: e.target.value } }))}
                      onBlur={() => {
                        const v = parseInt(rPontos || '', 10)
                        if (rascunho[t.tarefa]?.pontos != null && Number.isFinite(v) && v !== t.pontos) salvar(t, 'pontos', v)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      title={t.pontosAjustados
                        ? `Definido à mão por ${t.ajustadoPor}. O cálculo dá ${t.pontosAuto}${t.pontosAutoNaEpoca ? ` (dava ${t.pontosAutoNaEpoca} quando foi mudado)` : ''}.`
                        : `${t.mediaEmUso} min × ${fator} = ${t.pontosAuto}`}
                      style={{
                        height: 30, width: '100%', textAlign: 'right', padding: '0 8px',
                        background: 'var(--surface-2)',
                        border: `1px solid ${t.pontosAjustados ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                        fontSize: 13, fontWeight: 700, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                      }}
                    />

                    {/* ⚠️⚠️ "CONFERI, E ESTÁ CERTO" — a decisão que antes não
                        tinha onde ser gravada. Sem ela, o tipo que a liderança
                        olhou e aprovou volta como pendente todo mês, e a lista
                        de pendências que nunca esvazia deixa de ser lida.
                        ⚠️ Some depois de conferido: um botão que não faz nada é
                        pior que botão nenhum. Volta a aparecer se o valor se
                        afastar do que foi conferido. */}
                    <button
                      onClick={() => salvar(t, 'revisar', null)}
                      /* ⚠️ Revisão SEM âncora ainda aceita clique: ela é uma
                         revisão de antes deste campo existir, e o sistema não sabe
                         quanto o tipo valia naquele dia. Travar o botão faria a
                         linha ler "confirmado" onde o certo é "não sei", sem saída. */
                      disabled={t.revisado && !t.mudouDesdeRevisao && t.pontosNaRevisao != null}
                      title={!t.revisado
                        ? 'Conferi, e este valor está certo — grava sua confirmação sem mudar o número.'
                        : t.mudouDesdeRevisao
                          ? `Valia ${t.pontosNaRevisao} quando ${t.revisadoPor} conferiu, em ${dataBr(t.revisadoEm)}. Confirmar o valor de agora (${t.pontos}).`
                          : t.pontosNaRevisao == null
                            ? `Conferido por ${t.revisadoPor} em ${dataBr(t.revisadoEm)}, antes de o sistema guardar quanto o tipo valia. Confirmar de novo grava a referência (${t.pontos}) e liga o aviso de mudança.`
                            : `Conferido por ${t.revisadoPor} em ${dataBr(t.revisadoEm)}, valendo ${t.pontosNaRevisao}.`}
                      style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: !t.revisado ? 'var(--warning)' : t.mudouDesdeRevisao ? 'var(--accent)' : 'var(--success)', cursor: t.revisado && !t.mudouDesdeRevisao ? 'default' : 'pointer' }}
                    >
                      <Check size={14} />
                    </button>

                    <button
                      onClick={() => salvar(t, 'limpar', null)} disabled={!t.ajustado}
                      /* ⚠️⚠️ O NÚMERO PROMETIDO É O QUE ELE ENTREGA. `mediaMedida`
                         é a média DEPOIS dos limites, e limpar apaga os limites —
                         então o botão anunciava 149 min → 75 pontos e entregava
                         33 min → 17 pontos na ALTERAÇÃO SIMPLES NACIONAL, onde os
                         limites deixavam 7 de 270 serviços. Cinco vezes menos, na
                         tela que define quanto o trabalho vale. */
                      title={t.ajustado
                        ? `Voltar ao medido: apaga o mínimo, o máximo, a média lançada e os pontos desta linha.\nSem os limites, a média são ${t.mediaSemLimites} min em ${t.cronometradas + t.abaixoDoMinimo + t.acimaDoMaximo} serviços cronometrados → ${Math.max(1, Math.round(t.mediaSemLimites * fator))} pontos.`
                        : 'Está no valor medido'}
                      style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: t.ajustado ? 'var(--text-dim)' : 'var(--border)', cursor: t.ajustado ? 'pointer' : 'default' }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>

                  {/* ⚠️⚠️ A OBSERVAÇÃO SAIU DO TOOLTIP. Os extremos existiam só no
                      `title` do HTML — ou seja, para quem passasse o mouse por
                      cima e por acaso esperasse. Quem define o peso de um serviço
                      precisa ver, de graça, que o CERTIFICADO tem casos de 9h24 e
                      casos de 1 minuto: é o que separa "esta tarefa é longa" de
                      "esta tarefa travou num dia". */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4, fontSize: 10.5, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                    {/* ⚠️⚠️ NUNCA REVISADO ≠ REVISADO E MANTIDO. O tipo novo entra
                        valendo o que a média dele medir, e com pouca amostra isso
                        é um caso, não uma média: medido em 08/09/2026, quatro
                        tipos estrearam em agosto valendo 108, 86, 46 e 18 pontos,
                        e o de 108 tem UMA ocorrência de 3h35. */}
                    {!t.revisado && (
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                        <Sparkles size={11} style={{ verticalAlign: -1 }} /> nunca revisado — vale {t.pontos} pelo cálculo
                      </span>
                    )}
                    {/* ⚠️⚠️ O valor ACOMPANHA a planilha (decisão do dono), e por
                        isso avisa quando se mexeu: acompanhar em silêncio seria
                        mudar a nota de alguém sem ninguém saber. */}
                    {t.mudouDesdeRevisao && (
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        valia {t.pontosNaRevisao} quando {t.revisadoPor} conferiu ({dataBr(t.revisadoEm)}) — agora vale {t.pontos}
                        {/* ⚠️ A CAUSA muda o que a pessoa deve fazer: régua nova
                            é decisão registrada e move tudo; planilha nova mexeu
                            neste tipo sozinha, e isso é que é notícia. */}
                        <span style={{ fontWeight: 400, color: 'var(--text-mute)' }}>
                          {t.mudouPelaRegua ? ' · a régua mudou' : ' · a planilha mudou este tipo'}
                        </span>
                      </span>
                    )}
                    {/* ⚠️⚠️ AS GRAFIAS ESTÃO SOMADAS NESTA LINHA, e isso precisa
                        aparecer: os "{t.amostras} feitos" não vêm todos do nome que
                        está escrito à esquerda. Quando havia mais de uma régua,
                        venceu a que dá mais pontos (decisão do dono) — e uma régua
                        que vence em silêncio é uma régua que ninguém revisa. */}
                    {t.grafias.length > 0 && (
                      <span style={{ color: 'var(--text-dim)' }}>
                        <b style={{ fontWeight: 600 }}>somado com {t.grafias.length === 1 ? 'a grafia' : 'as grafias'}</b>{' '}
                        “{t.grafias[0]}”{t.grafias.length > 1 ? ` e mais ${t.grafias.length - 1}` : ''}
                        {t.reguasEmDisputa > 0 && (
                          <span style={{ color: 'var(--accent)' }}>
                            {' '}— havia {t.reguasEmDisputa} réguas; ficou a que dá mais pontos
                            {t.reguaDaGrafia ? `, a de “${t.reguaDaGrafia}”` : ''}
                          </span>
                        )}
                      </span>
                    )}
                    <span>
                      <b style={{ color: 'var(--text-dim)', fontWeight: 600 }}>mais longos:</b>{' '}
                      {t.maiores.length
                        ? t.maiores.map((m, i) => (
                            <span key={i} title={`Feito por ${m.quem}`} style={{ cursor: 'help' }}>
                              {i ? ' · ' : ''}{dur(m.minutos)}
                            </span>
                          ))
                        : '—'}
                    </span>
                    <span>
                      <b style={{ color: 'var(--text-dim)', fontWeight: 600 }}>mais curtos:</b>{' '}
                      {t.menores.length
                        ? t.menores.map((m, i) => (
                            <span key={i} title={`Feito por ${m.quem}`} style={{ cursor: 'help' }}>
                              {i ? ' · ' : ''}{dur(m.minutos)}
                            </span>
                          ))
                        : '—'}
                    </span>
                    {puxada && t.mediaAjustada == null && (
                      <span style={{ color: 'var(--warning)' }}>
                        a média ({dur(t.mediaMedida)}) está bem acima da mediana ({dur(t.medianaMinutos)}) — poucos casos longos a puxam
                      </span>
                    )}
                    {poucasAmostras && (
                      <span style={{ color: 'var(--warning)' }}>
                        {t.amostras === 1 ? 'aconteceu uma única vez — não é média, é o caso' : `só ${t.amostras} ocorrências`}
                      </span>
                    )}
                    {/* ⚠️ Os zerados ficam VISÍVEIS. Tempo 0 é "não cronometrado"
                        e sai da média — dizer quantos saíram é o que impede o
                        número de parecer apurado sobre o total. */}
                    {t.zerados > 0 && (
                      <span>
                        <b style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{t.zerados} sem tempo</b> — fora da média
                      </span>
                    )}
                    {/* ⚠️⚠️ O MÍNIMO SÓ SOBE A MÉDIA — e portanto só sobe os
                        pontos. Quem o define é o gestor do próprio time, então
                        quantos serviços ele tirou da conta fica VISÍVEL, não só
                        no tooltip. Um filtro que aumenta a nota da própria
                        equipe sem deixar rastro seria a porta mais fácil do
                        sistema inteiro. */}
                    {t.abaixoDoMinimo > 0 && (
                      <span style={{ color: 'var(--accent)' }}>
                        <b style={{ fontWeight: 600 }}>{t.abaixoDoMinimo} abaixo do mínimo</b> de {t.tempoMinimo} min — fora da média
                      </span>
                    )}
                    {/* ⚠️⚠️ O MÁXIMO desce a média — o incentivo inverso do mínimo.
                        Juntos, os dois afinam o número nas duas direções, e por
                        isso quantos cada um removeu fica visível. */}
                    {t.acimaDoMaximo > 0 && (
                      <span style={{ color: 'var(--accent)' }}>
                        <b style={{ fontWeight: 600 }}>{t.acimaDoMaximo} acima do máximo</b> de {t.tempoMaximo} min — fora da média
                      </span>
                    )}
                    {/* ⚠️⚠️ Os limites tiraram TODOS os serviços. Sem média medida,
                        o tipo cairia para 1 ponto se a média lançada sair — e a
                        linha continuaria plausível. São 10 dos 74 tipos hoje. */}
                    {t.semAmostraNaMedia && (
                      <span style={{ color: 'var(--danger)' }}>
                        os limites tiraram <b style={{ fontWeight: 600 }}>todos</b> os {t.abaixoDoMinimo + t.acimaDoMaximo} serviços cronometrados —
                        {t.mediaAjustada != null
                          ? ` a média em uso é a lançada à mão; sem os limites, o medido são ${dur(t.mediaSemLimites)}`
                          : ` não há média a medir, e o tipo cai para 1 ponto`}
                      </span>
                    )}
                    {limitesInvertidos && (
                      <span style={{ color: 'var(--danger)' }}>
                        o máximo ({t.tempoMaximo} min) está abaixo do mínimo ({t.tempoMinimo} min) — assim nenhum serviço entra na média
                      </span>
                    )}
                    {/* ⚠️⚠️ Cortar MAIS DA METADE não é remover exceção: é dizer
                        que a tarefa é outra coisa. Medido: um teto de 4h em
                        SERVIÇOS INTERNOS - ARQUIVO tira 130 dos 264 e derruba a
                        média de 231 para 115 minutos. */}
                    {cortouMuito && !limitesInvertidos && (
                      <span style={{ color: 'var(--danger)' }}>
                        os limites tiraram mais da metade dos serviços — restaram {t.cronometradas} de {t.cronometradas + t.abaixoDoMinimo + t.acimaDoMaximo}
                      </span>
                    )}
                    {(t.tempoMinimo != null || t.tempoMaximo != null) && t.cronometradas < POUCAS_AMOSTRAS && !limitesInvertidos && (
                      <span style={{ color: 'var(--danger)' }}>
                        só {t.cronometradas} {t.cronometradas === 1 ? 'serviço sobrou' : 'serviços sobraram'} para a média
                      </span>
                    )}
                    {t.mediaAjustada != null && (
                      <span style={{ color: 'var(--accent)' }}>
                        média lançada por {t.ajustadoPor} em {dataBr(t.ajustadoEm)} · o medido na planilha é {dur(t.mediaMedida)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 12, lineHeight: 1.6 }}>
            {tarefas.length} tipos de serviço. A <b>média usada</b> é o que vira ponto; a <b>mediana</b> fica ao lado porque
            {' '}poucos casos longos puxam a média para cima, e é ela que mostra o serviço típico. Os extremos de cada linha
            {' '}estão ali para mostrar o que a média esconde.
          </div>
        </>
      )}
    </div>
  )
}
