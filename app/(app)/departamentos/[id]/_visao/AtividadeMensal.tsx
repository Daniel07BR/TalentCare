'use client'
import { BarChart3 } from 'lucide-react'
import { Cartao } from './ui'
import { mesCurto, num, variacaoMensal } from './derivar'
import type { SecaoProps } from './tipos'

const W = 560, H = 190, P = { t: 12, r: 12, b: 26, l: 44 }

/** A série do servidor (para no último mês FECHADO), como área azul. */
export function AtividadeMensal({ m }: SecaoProps) {
  const s = m.serie
  const v = variacaoMensal(s)
  const cabeca = (
    v && (
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: v.pct < 0 ? 'var(--n-red)' : 'var(--n-green)' }}>
          {v.pct > 0 ? '+' : ''}{v.pct}%
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{v.mes} vs. {v.anterior}</div>
      </div>
    )
  )
  /* ⚠️ Menos de 3 meses não é tendência: dois pontos ligados por uma reta
     parecem uma, e convencem. Mesma regra do relatório atual. */
  if (s.length < 3) {
    return (
      <Cartao titulo="Atividade mês a mês" Icone={BarChart3}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', lineHeight: 1.6 }}>
          {s.length === 0
            ? 'O trabalho deste setor não passa pelas fontes medidas — não há série de atividade, e isso não é falha de registro.'
            : `Só ${s.length} ${s.length === 1 ? 'mês' : 'meses'} com registro — ainda não dá para desenhar tendência.`}
        </div>
      </Cartao>
    )
  }
  const max = Math.max(1, ...s.map((x) => x.atividade))
  const teto = Math.ceil(max / 1000) * 1000 || max
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / (s.length - 1)
  const y = (val: number) => P.t + (1 - val / teto) * (H - P.t - P.b)
  const linha = s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.atividade).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(s.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  const passo = Math.ceil(s.length / 8)

  return (
    <Cartao titulo="Atividade mês a mês" Icone={BarChart3} sub={`Ações registradas nos sistemas · desde ${mesCurto(s[0].mes)}`} acao={cabeca}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Atividade do setor mês a mês" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="n-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--n-blue)" stopOpacity=".28" />
            <stop offset="100%" stopColor="var(--n-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, .25, .5, .75, 1].map((f) => (
          <g key={f}>
            <line x1={P.l} x2={W - P.r} y1={y(teto * f)} y2={y(teto * f)} stroke="var(--n-border-2)" />
            <text x={P.l - 8} y={y(teto * f) + 3.5} textAnchor="end" style={{ fontSize: 10, fill: 'var(--n-text-3)' }}>{num(Math.round(teto * f))}</text>
          </g>
        ))}
        <path d={area} fill="url(#n-area)" />
        <path d={linha} fill="none" stroke="var(--n-blue)" strokeWidth="2.4" strokeLinejoin="round" />
        {s.map((p, i) => (
          <g key={p.mes}>
            <circle cx={x(i)} cy={y(p.atividade)} r="3.6" fill="var(--n-card)" stroke="var(--n-blue)" strokeWidth="2"><title>{`${mesCurto(p.mes)}: ${num(p.atividade)}`}</title></circle>
            {(i % passo === 0 || i === s.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--n-text-3)' }}>{mesCurto(p.mes)}</text>
            )}
          </g>
        ))}
      </svg>
    </Cartao>
  )
}
