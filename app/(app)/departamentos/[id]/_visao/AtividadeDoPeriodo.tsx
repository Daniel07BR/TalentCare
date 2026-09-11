'use client'
import { BarChart3 } from 'lucide-react'
import { Cartao } from './ui'
import { num } from './derivar'
import type { SecaoProps } from './tipos'

const W = 560, H = 190, P = { t: 12, r: 12, b: 26, l: 44 }
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
const POR = { dia: 'por dia', semana: 'por semana', mes: 'por mês' } as const

/* ============================================================
   A ATIVIDADE NO PERÍODO — obedece ao filtro (pedido do dono, 11/09/2026:
   "não está reagindo conforme o período"). Era sempre os últimos meses
   fechados; agora é a janela do filtro, por dia/semana/mês conforme o tamanho
   (ver `lib/serie-periodo.ts`). A série mensal fixa continua no relatório
   completo, onde a pergunta é "como o setor anda no ano".
   ============================================================ */
export function AtividadeDoPeriodo({ m }: SecaoProps) {
  const a = m.atividadeDoPeriodo
  if (!a) return <Cartao titulo="Atividade no período" Icone={BarChart3}><div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Carregando…</div></Cartao>

  const ant = a.anterior
  /* ⚠️⚠️ De igual para igual: o percentual compara SÓ as fontes que já
     registravam no início da janela anterior (`ant.atual` × `ant.total`), e
     nomeia as que ficaram de fora. Comparar tudo deu +2756% no Legal em "Ano":
     Gerência, Chat e Consultoria não existiam na janela de antes. */
  const pct = ant.comparavel && ant.total > 0 ? Math.round(((ant.atual - ant.total) / ant.total) * 100) : null
  const fora = ant.fora.map((f) => f.desde ? `${f.fonte} (desde ${ddmm(f.desde)}/${f.desde.slice(2, 4)})` : f.fonte).join(', ')
  const cabeca = (
    <div style={{ textAlign: 'right', flex: 'none', maxWidth: 200 }}>
      {pct !== null ? (
        <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: pct < 0 ? 'var(--n-red)' : 'var(--n-green)' }}>{pct > 0 ? '+' : ''}{pct}%</div>
      ) : (
        <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--n-text)' }}>{num(a.total)}</div>
      )}
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.35 }}>
        {pct !== null ? `vs. ${ddmm(ant.de)} a ${ddmm(ant.ate)}${ant.fora.length ? ' · mesmas fontes' : ''}`
          : ant.motivo === 'janela-longa' ? 'ações no período'
          : !ant.comparavel ? 'ações · sem período anterior comparável'
          : `ações · nenhuma de ${ddmm(ant.de)} a ${ddmm(ant.ate)}`}
      </div>
    </div>
  )
  const sub = `Ações registradas nos sistemas · ${m.label} · ${POR[a.granularidade]}`
  const pts = a.pontos
  if (a.total === 0) {
    return (
      <Cartao titulo="Atividade no período" Icone={BarChart3} sub={sub}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', lineHeight: 1.6 }}>
          Nenhuma ação registrada nos sistemas medidos neste período. Isso não quer dizer que o setor não trabalhou — o trabalho dele pode não passar por estes sistemas.
        </div>
      </Cartao>
    )
  }

  const max = Math.max(1, ...pts.map((p) => p.atividade))
  const passoY = max <= 10 ? 5 : max <= 100 ? 25 : max <= 1000 ? 250 : 1000
  const teto = Math.ceil(max / passoY) * passoY
  const x = (i: number) => pts.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i * (W - P.l - P.r)) / (pts.length - 1)
  const y = (v: number) => P.t + (1 - v / teto) * (H - P.t - P.b)
  // O trecho que chega a um ponto PARCIAL é tracejado: é pedaço, não queda.
  const cheio = pts.filter((p, i) => !(p.parcial && i === pts.length - 1))
  const linha = cheio.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.atividade).toFixed(1)}`).join(' ')
  const ultimoParcial = pts.length > 1 && pts[pts.length - 1].parcial
  const area = `${linha}${ultimoParcial ? ` L${x(pts.length - 1)},${y(pts[pts.length - 1].atividade)}` : ''} L${x(pts.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  const passo = Math.ceil(pts.length / 8)

  return (
    <Cartao titulo="Atividade no período" Icone={BarChart3} sub={sub} acao={cabeca}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Atividade do setor ${POR[a.granularidade]} no período`} style={{ display: 'block' }}>
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
        {pts.length > 1 && <path d={area} fill="url(#n-area)" />}
        <path d={linha} fill="none" stroke="var(--n-blue)" strokeWidth="2.4" strokeLinejoin="round" />
        {ultimoParcial && (
          <line x1={x(pts.length - 2)} y1={y(pts[pts.length - 2].atividade)} x2={x(pts.length - 1)} y2={y(pts[pts.length - 1].atividade)}
            stroke="var(--n-blue)" strokeWidth="2" strokeDasharray="4 4" />
        )}
        {pts.map((p, i) => (
          <g key={p.de}>
            <circle cx={x(i)} cy={y(p.atividade)} r={pts.length > 30 ? 2.6 : 3.6}
              fill={p.parcial ? 'var(--n-card)' : 'var(--n-blue)'} stroke="var(--n-blue)" strokeWidth="2" strokeDasharray={p.parcial ? '2 2' : undefined}>
              <title>{`${p.de === p.ate ? ddmm(p.de) : `${ddmm(p.de)} a ${ddmm(p.ate)}`}: ${num(p.atividade)} ações${p.parcial ? ' (incompleto)' : ''}`}</title>
            </circle>
            {(i % passo === 0 || i === pts.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--n-text-3)' }}>{p.rotulo}</text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 11, color: 'var(--n-text-2)', marginTop: 6 }}>
        <b style={{ color: 'var(--n-text)' }}>{num(a.total)}</b> ações no período
        {pct !== null && ant.fora.length > 0 && (
          <span style={{ color: 'var(--n-text-3)' }}> · a comparação deixa de fora o que não existia de {ddmm(ant.de)} a {ddmm(ant.ate)}: {fora}</span>
        )}
        {ant.motivo === 'janela-longa' && (
          <span style={{ color: 'var(--n-text-3)' }}> · em janela longa não há percentual: o período anterior cairia na época em que as fontes estavam começando, e o número mediria isso, não o setor</span>
        )}
        {ant.motivo === 'sem-fonte' && <span style={{ color: 'var(--n-text-3)' }}> · nenhuma fonte deste setor registrava antes de {ddmm(ant.de)}</span>}
      </div>
      {pts.some((p) => p.parcial) && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 4 }}>Ponto vazado e tracejado = período incompleto (ainda correndo, ou só um pedaço dentro do filtro).</div>
      )}
    </Cartao>
  )
}
