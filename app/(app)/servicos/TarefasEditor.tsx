'use client'
import { useEffect, useState } from 'react'
import { ListChecks, RotateCcw, TriangleAlert } from 'lucide-react'

type Tarefa = {
  tarefa: string; amostras: number
  mediaMinutos: number; medianaMinutos: number; maiorMinutos: number
  pontosAuto: number; pontos: number
  ajustado: boolean; ajustadoPor: string | null; ajustadoEm: string | null
  pontosAutoNaEpoca: number | null
}

const dur = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`
}

/** Amostra pequena demais para a palavra "média" significar alguma coisa. */
const POUCAS_AMOSTRAS = 5

/**
 * O catálogo de tipos de serviço do setor, com a duração medida e o peso de cada
 * um — calculado pelo sistema e editável pela liderança.
 *
 * ⚠️⚠️ A tela mostra MÉDIA e MEDIANA lado a lado de propósito. Só a média vira
 * ponto (é o que o dono pediu), mas ela é puxada por poucos casos longos:
 * CERTIFICADO tem média 47 min e mediana 31, com um caso de 564. Quem decide o
 * peso de um serviço precisa ver o quanto as duas divergem — senão define o
 * valor de 389 certificados a partir de um dia em que um deles travou.
 */
export default function TarefasEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [fator, setFator] = useState(0.5)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)

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

  async function salvar(t: Tarefa, valor: number | null) {
    const r = await fetch('/api/servicos/tarefas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId, tarefa: t.tarefa, pontos: valor, pontosAuto: t.pontosAuto }),
    })
    if (!r.ok) { setMsg((await r.json()).error ?? 'Não consegui salvar.'); return }
    await carregar()
  }

  if (!carregando && !tarefas.length) return null

  const somaSePessoaFizerUmDeCada = tarefas.reduce((a, t) => a + t.pontos, 0)
  const poucas = tarefas.filter((t) => t.amostras < POUCAS_AMOSTRAS).length

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ListChecks size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por tipo de serviço — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.55 }}>
        Cada tipo vale <b>{fator} ponto por minuto</b> da duração média que ele levou, medida em{' '}
        <b>{total.toLocaleString('pt-BR')} serviços concluídos</b> da planilha inteira — não do período selecionado,
        porque quanto um serviço leva é uma característica dele, não da janela que você está olhando.
        {' '}<b>Os pontos são editáveis:</b> mude o número e ele passa a valer no lugar do calculado.
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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 62px 78px 78px 96px 30px', gap: 10, alignItems: 'center', padding: '0 8px 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-mute)', borderBottom: '1px solid var(--border)' }}>
            <span>Tipo de serviço</span>
            <span style={{ textAlign: 'right' }}>Feitos</span>
            <span style={{ textAlign: 'right' }}>Média</span>
            <span style={{ textAlign: 'right' }}>Mediana</span>
            <span style={{ textAlign: 'right' }}>Pontos</span>
            <span />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 560, overflowY: 'auto' }}>
            {tarefas.map((t) => {
              const poucasAmostras = t.amostras < POUCAS_AMOSTRAS
              const valor = rascunho[t.tarefa] ?? String(t.pontos)
              const mudou = Number(valor) !== t.pontos
              /* A média está MUITO acima da mediana → poucos casos longos estão
                 puxando o peso. A tela marca em vez de esconder. */
              const puxada = t.mediaMinutos >= t.medianaMinutos * 1.6 && t.amostras >= POUCAS_AMOSTRAS
              return (
                <div key={t.tarefa} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 62px 78px 78px 96px 30px', gap: 10, alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid var(--border-soft, var(--border))', fontSize: 12 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.tarefa}>
                    {t.tarefa}
                    {t.ajustado && <span style={{ color: 'var(--accent)', fontSize: 10.5 }}> · ajustado</span>}
                  </span>
                  <span style={{ textAlign: 'right', color: poucasAmostras ? 'var(--warning)' : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}
                    title={poucasAmostras ? 'Poucas ocorrências — a média não se sustenta' : undefined}>
                    {t.amostras}
                  </span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: puxada ? 'var(--warning)' : 'var(--text)' }}
                    title={puxada ? `A média está bem acima da mediana — poucos casos longos a puxam (o maior levou ${dur(t.maiorMinutos)}).` : `O maior levou ${dur(t.maiorMinutos)}`}>
                    {dur(t.mediaMinutos)}
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--text-mute)', fontVariantNumeric: 'tabular-nums' }}>{dur(t.medianaMinutos)}</span>
                  <input
                    type="number" value={valor}
                    onChange={(e) => setRascunho((r) => ({ ...r, [t.tarefa]: e.target.value }))}
                    onBlur={() => { if (mudou && valor !== '') salvar(t, Number(valor)) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    title={t.ajustado
                      ? `Ajustado por ${t.ajustadoPor} — o sistema calculava ${t.pontosAutoNaEpoca} na época e calcula ${t.pontosAuto} hoje.`
                      : `Calculado: ${dur(t.mediaMinutos)} × ${fator} = ${t.pontosAuto}`}
                    style={{
                      height: 30, width: '100%', textAlign: 'right', padding: '0 8px',
                      background: 'var(--surface-2)',
                      border: `1px solid ${t.ajustado ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  {/* Volta ao calculado — apaga o ajuste, não grava o sugerido. */}
                  <button
                    onClick={() => salvar(t, null)} disabled={!t.ajustado}
                    title={t.ajustado ? `Voltar ao calculado (${t.pontosAuto})` : 'Está no valor calculado'}
                    style={{ height: 26, width: 26, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: t.ajustado ? 'var(--text-dim)' : 'var(--border)', cursor: t.ajustado ? 'pointer' : 'default' }}
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 12, lineHeight: 1.6 }}>
            {tarefas.length} tipos de serviço · somados, um de cada valeria <b>{somaSePessoaFizerUmDeCada.toLocaleString('pt-BR')}</b> pontos.
            {' '}<b>Média</b> é o que vira ponto; a <b>mediana</b> está ao lado porque poucos casos longos puxam a média para cima,
            {' '}e é ela que mostra o serviço típico.
          </div>
        </>
      )}
    </div>
  )
}
