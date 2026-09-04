'use client'
import { useEffect, useState } from 'react'
import { ListChecks, RotateCcw, TriangleAlert, ChevronUp, ChevronDown } from 'lucide-react'

type Tarefa = {
  tarefa: string; amostras: number
  mediaMedida: number; mediaEmUso: number; mediaAjustada: number | null
  cronometradas: number; zerados: number
  abaixoDoMinimo: number; acimaDoMaximo: number
  tempoMinimo: number | null; tempoMaximo: number | null
  medianaMinutos: number
  maiores: { minutos: number; quem: string }[]
  menores: { minutos: number; quem: string }[]
  pontosAuto: number; pontos: number; pontosAjustados: boolean
  ajustado: boolean; ajustadoPor: string | null; ajustadoEm: string | null
  pontosAutoNaEpoca: number | null
}

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
const COLS = 'minmax(0,1fr) 58px 84px 84px 100px 80px 92px 32px'

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

export default function TarefasEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [fator, setFator] = useState(0.5)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState<Record<string, { media?: string; pontos?: string; minimo?: string; maximo?: string }>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: 'amostras', desc: true })

  async function carregar() {
    setCarregando(true)
    try {
      const r = await fetch(`/api/servicos/tarefas?departmentId=${departmentId}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui ler os tipos de serviço.'); setTarefas([]); return }
      setTarefas(d.tarefas ?? []); setFator(d.fatorPorMinuto ?? 0.5); setTotal(d.totalConcluidos ?? 0)
      setRascunho({})
    } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [departmentId])

  async function salvar(t: Tarefa, campo: 'media' | 'pontos' | 'minimo' | 'maximo' | 'limpar', valor: number | null) {
    const r = await fetch('/api/servicos/tarefas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId, tarefa: t.tarefa, campo, valor, pontosAuto: t.pontosAuto }),
    })
    if (!r.ok) { setMsg((await r.json()).error ?? 'Não consegui salvar.'); return }
    setMsg(null)
    await carregar()
  }

  if (!carregando && !tarefas.length) return null

  /* Um clique ordena; clicar de novo na MESMA coluna inverte. Texto começa
     A→Z e número começa do maior — é o que a pessoa espera de cada um. */
  const clicar = (col: Coluna) =>
    setOrdem((o) => o.col === col
      ? { col, desc: !o.desc }
      : { col, desc: ORDENAVEIS.find((c) => c.chave === col)!.numerica })

  const ordenadas = [...tarefas].sort((a, b) => {
    const { col, desc } = ordem
    if (col === 'tarefa') {
      const r = a.tarefa.localeCompare(b.tarefa, 'pt-BR')
      return desc ? -r : r
    }
    const va = a[col] as number | null
    const vb = b[col] as number | null
    // Nulos por último, nos DOIS sentidos.
    if (va == null && vb == null) return a.tarefa.localeCompare(b.tarefa, 'pt-BR')
    if (va == null) return 1
    if (vb == null) return -1
    return desc ? vb - va : va - vb
  })

  const poucas = tarefas.filter((t) => t.amostras < POUCAS_AMOSTRAS).length
  const ajustadas = tarefas.filter((t) => t.ajustado).length

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ListChecks size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por tipo de serviço — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Cada tipo vale <b>{fator} ponto por minuto</b> do tempo médio, medido em{' '}
        <b>{total.toLocaleString('pt-BR')} serviços concluídos</b> da planilha inteira — não do período selecionado,
        porque quanto um serviço leva é característica dele, não da janela que você está olhando.
        {' '}<b>A média e os pontos são editáveis</b>: mudar a média recalcula os pontos na hora.
        {ajustadas > 0 && <> · <b style={{ color: 'var(--accent)' }}>{ajustadas} {ajustadas === 1 ? 'ajustado' : 'ajustados'} à mão</b></>}
      </div>

      {poucas > 0 && (
        /* ⚠️⚠️ Média de amostra pequena não é média. Dos 74 tipos do Legal, 16
           aconteceram UMA vez. Sem este aviso, um serviço que ocorreu uma vez e
           travou por 8 horas vira o mais valioso do catálogo para sempre. */
        <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <TriangleAlert size={13} style={{ verticalAlign: -2 }} /> <b>{poucas} {poucas === 1 ? 'tipo tem' : 'tipos têm'} menos de {POUCAS_AMOSTRAS} ocorrências.</b>
          {' '}A média deles é o próprio caso, não uma média — vale conferir o número à mão antes de deixá-lo valendo.
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ordenadas.map((t) => {
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
              const mostrarPontos = rascunho[t.tarefa]?.pontos != null ? rPontos : String(pontosPrevistos)

              return (
                <div key={t.tarefa} style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)' }}>
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
                          if (v !== (t.tempoMinimo ?? null)) salvar(t, v == null ? 'limpar' : 'minimo', v)
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
                          ? `Lançado por ${t.ajustadoPor} em ${dataBr(t.ajustadoEm)}.\nO medido na planilha é ${t.mediaMedida} min, em ${t.cronometradas} serviços cronometrados.`
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

                    <button
                      onClick={() => salvar(t, 'limpar', null)} disabled={!t.ajustado}
                      title={t.ajustado ? `Voltar ao medido (${t.mediaMedida} min → ${Math.max(1, Math.round(t.mediaMedida * fator))} pontos)` : 'Está no valor medido'}
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
