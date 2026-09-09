'use client'
import { useEffect, useRef, useState } from 'react'

/* ============================================================
   O PLACAR DA FICHA — pontos acumulados e onde a pessoa está no setor.

   Pedido do dono (09/09/2026): um contador animado com os pontos já acumulados
   e a posição dela dentro do período do filtro, comparada ao setor.

   ⚠️⚠️ AS DUAS METADES RESPONDEM A PERGUNTAS DIFERENTES, e a tela tem de dizer
   qual é qual: o acumulado é a soma de TODOS os meses gravados (não acompanha o
   filtro); a posição é da COMPETÊNCIA do filtro. Um cabeçalho que juntasse os
   dois sem rótulo faria o leitor achar que a posição é do acumulado.
   ============================================================ */

/**
 * Conta de 0 até `valor` — em rAF, sem biblioteca.
 *
 * ⚠️ `prefers-reduced-motion` desliga a animação: número que corre na tela é
 * exatamente o tipo de movimento que atrapalha quem pediu para não ter
 * movimento, e aqui ele não decora nada — ele É o dado.
 *
 * ⚠️ E ela nunca "chega perto": o último quadro grava o valor exato. Contador
 * que termina em 1.318 quando o número é 1.319 mente com cara de enfeite.
 */
function useContador(valor: number, ms = 900) {
  const [n, setN] = useState(valor)
  const anterior = useRef(valor)

  useEffect(() => {
    const alvo = valor
    const de = anterior.current
    anterior.current = alvo
    if (de === alvo) { setN(alvo); return }

    const reduz = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduz) { setN(alvo); return }

    let raf = 0
    const t0 = performance.now()
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      // easeOutCubic: começa rápido e assenta — não desacelera até parecer travado.
      const e = 1 - Math.pow(1 - p, 3)
      setN(Math.round(de + (alvo - de) * e))
      if (p < 1) raf = requestAnimationFrame(passo)
      else setN(alvo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor, ms])

  return n
}

export type PosicaoFicha = {
  competencia: string
  posicao: number | null
  de: number
  pontosNoMes: number | null
  acumulado: number
  meses: number
}

export function Placar({ p, setor, competenciaLabel, motivoSemNota }: {
  p: PosicaoFicha
  setor: string
  competenciaLabel: string
  /** Por que ela não pontua nesta competência — o "—" tem de dizer. */
  motivoSemNota?: string | null
}) {
  const n = useContador(p.acumulado)
  const primeiro = p.posicao === 1
  const cor = primeiro ? 'var(--accent)' : p.posicao != null ? 'var(--chart-2)' : 'var(--text-mute)'

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 1,
      background: 'var(--border-soft)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden', marginTop: 16,
    }}>
      {/* ── ACUMULADO ────────────────────────────────────────────────────── */}
      <div style={{ flex: '1 1 240px', background: 'var(--surface)', padding: '16px 20px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
          Pontos acumulados
        </div>
        <div className="cnum" style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.1, color: 'var(--accent)' }}>
          {n.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
          {p.meses === 0
            ? 'nenhum mês pontuado ainda'
            : `soma de ${p.meses} ${p.meses === 1 ? 'mês' : 'meses'} · não acompanha o filtro`}
        </div>
      </div>

      {/* ── POSIÇÃO NO SETOR, na competência do filtro ───────────────────── */}
      <div style={{ flex: '1 1 240px', background: 'var(--surface)', padding: '16px 20px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
          No {setor} · {competenciaLabel}
        </div>
        {p.posicao != null ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="cnum" style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.1, color: cor }}>
                {p.posicao}º
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>de {p.de}</span>
              {primeiro && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                  MAIS PONTOS
                </span>
              )}
            </div>
            {/* ⚠️ O denominador é quem PONTUA, não quem trabalha no setor.
                "3º de 7 que pontuam" é verdade; "3º de 21" contaria como
                concorrente quem o sistema decidiu não pontuar. */}
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
              {p.pontosNoMes?.toLocaleString('pt-BR')} pontos no mês · entre os {p.de} que pontuam
            </div>
          </>
        ) : (
          <>
            <div className="cnum" style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.1, color: 'var(--text-mute)' }}>—</div>
            {/* ⚠️ Nunca o último lugar: um `?? 0` poria quem o sistema decidiu
                não pontuar no fundo de uma lista, e último lugar acusa. */}
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2, lineHeight: 1.45 }}>
              {motivoSemNota ?? `sem pontuação em ${competenciaLabel}`}
            </div>
          </>
        )}
      </div>

      {/* ── A BARRA DE POSIÇÃO ───────────────────────────────────────────── */}
      {p.posicao != null && p.de > 1 && (
        <div style={{ flex: '1 1 200px', background: 'var(--surface)', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
            {/* ⚠️ Uma coluna por pessoa que pontua, a dela em destaque. Não é um
                gráfico de valores — é o LUGAR dela na fila, que é o que a frase
                ao lado diz. Desenhar os pontos aqui sugeriria distância entre
                colocados que a barra não sabe medir. */}
            {Array.from({ length: p.de }, (_, i) => {
              const eu = i + 1 === p.posicao
              return (
                <div key={i} title={eu ? `Ela está em ${p.posicao}º` : undefined}
                  style={{
                    flex: 1, height: eu ? '100%' : '46%', borderRadius: 3,
                    background: eu ? cor : 'var(--surface-2)',
                    border: eu ? 'none' : '1px solid var(--border-soft)',
                  }} />
              )
            })}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 8 }}>
            posição na fila do setor, do maior para o menor
          </div>
        </div>
      )}
    </div>
  )
}
