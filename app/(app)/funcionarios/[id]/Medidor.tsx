'use client'
import { useEffect, useState } from 'react'

/* ============================================================
   O MEDIDOR — o cartão de número da ficha, com anel e contador.

   Pedido do dono (09/09/2026): *"o sistema está muito engessado"*. As caixinhas
   cinzas de número viraram isto.

   ⚠️⚠️ E vale a mesma régua do placar: **o anel só existe quando há
   denominador.** Sem `de`, o medidor desenha só o número — e não um anel pela
   metade escolhido a olho. Gráfico sem dado atrás é a regra (d) da casa, e ela
   não se dobra por causa de estética.

   Exemplos honestos de denominador nesta ficha: finalizados ÷ abertos no
   WhatsApp, resolvidos ÷ abertos no HelpDesk, concluídos ÷ abertos no Chat.
   ============================================================ */

const semMovimento = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

function useContador(valor: number, ms = 800) {
  const [n, setN] = useState(() => (semMovimento() ? valor : 0))
  useEffect(() => {
    if (semMovimento()) { setN(valor); return }
    let raf = 0
    const t0 = performance.now()
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(valor * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(passo)
      else setN(valor)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor, ms])
  return n
}

const R = 34
const CIRC = 2 * Math.PI * R

export function Medidor({ valor, de, rotulo, nota, cor, texto }: {
  /** `null` = não foi possível medir → "—", nunca 0. */
  valor: number | null
  /** O denominador do anel. Sem ele, não há anel — e não se inventa um. */
  de?: number | null
  rotulo: string
  nota?: string
  cor: string
  /** Quando o valor não é um número (um tempo médio, por exemplo). */
  texto?: string
}) {
  const n = useContador(typeof valor === 'number' ? valor : 0)
  const temAnel = typeof valor === 'number' && typeof de === 'number' && de > 0
  const frac = temAnel ? Math.max(0, Math.min(1, valor / de)) : 0
  const [f, setF] = useState(() => (semMovimento() ? frac : 0))
  useEffect(() => {
    if (semMovimento()) { setF(frac); return }
    const id = requestAnimationFrame(() => setF(frac))
    return () => cancelAnimationFrame(id)
  }, [frac])

  const mostra = texto ?? (valor == null ? '—' : n.toLocaleString('pt-BR'))
  const grande = mostra.length > 4

  return (
    <div style={{
      flex: '1 1 150px', minWidth: 138, background: 'var(--surface-2)',
      borderRadius: 'var(--radius-sm)', padding: '14px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <svg width="84" height="84" viewBox="-42 -42 84 84" style={{ overflow: 'visible' }}>
        <g transform="rotate(-90)">
          <circle cx="0" cy="0" r={R} fill="none" stroke="var(--surface)" strokeWidth="8" />
          {temAnel && (
            <circle
              cx="0" cy="0" r={R} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${f * CIRC} ${CIRC}`}
              style={{ transition: semMovimento() ? undefined : 'stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)' }}
            />
          )}
        </g>
        <text x="0" y={grande ? 5 : 6} textAnchor="middle" className="cnum"
          style={{ fontSize: grande ? 15 : 21, fontWeight: 800, fill: valor == null && !texto ? 'var(--text-mute)' : cor, letterSpacing: '-.5px' }}>
          {mostra}
        </text>
      </svg>
      <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{rotulo}</div>
        {/* ⚠️ A nota diz o denominador quando há anel: anel sem legenda vira
            enfeite dois dias depois, quando ninguém lembra do que ele é. */}
        {(nota || temAnel) && (
          <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>
            {nota ?? `${Math.round(frac * 100)}% de ${de?.toLocaleString('pt-BR')}`}
          </div>
        )}
      </div>
    </div>
  )
}
