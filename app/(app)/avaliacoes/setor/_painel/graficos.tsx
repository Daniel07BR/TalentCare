'use client'
import { useState } from 'react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import p from './painel.module.css'

/* ============================================================
   As peças do painel de avaliações (02/10/2026). HTML e SVG próprios — sem
   biblioteca de gráfico: são quatro formas simples, e cada uma carrega a regra
   do painel (o NOME do nível sempre escrito ao lado da cor; dica ao passar o
   mouse; mês sem avaliação aparece como vazio, nunca como zero).
   ============================================================ */

export type NivelKey = 'abaixo' | 'parte' | 'atende' | 'acima'
export type Contagem = Record<NivelKey, number>

export const NIVEIS_UI: { key: NivelKey; label: string; curto: string }[] = [
  { key: 'abaixo', label: 'Abaixo do esperado', curto: 'Abaixo' },
  { key: 'parte', label: 'Atende em parte', curto: 'Em parte' },
  { key: 'atende', label: 'Atende — o esperado', curto: 'Atende' },
  { key: 'acima', label: 'Acima do esperado', curto: 'Acima' },
]
export const cor = (k: NivelKey | null | undefined) => (k ? `var(--lv-${k})` : 'var(--n-text-3)')
export const nivelUi = (k: NivelKey | null | undefined) => NIVEIS_UI.find((n) => n.key === k) ?? null
export const mesCurto = (c: string) => {
  const [a, m] = c.split('-')
  return `${new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${a.slice(2)}`
}

/** O selo do nível: ponto na cor + o NOME escrito. */
export function Selo({ nivel, curto = false, grande = false }: { nivel: NivelKey | null; curto?: boolean; grande?: boolean }) {
  const n = nivelUi(nivel)
  if (!n) return <span style={{ fontSize: 12, color: 'var(--n-text-3)' }}>—</span>
  return <span className={`${p.selo} ${grande ? p.seloGrande : ''}`} style={{ ['--c' as string]: cor(n.key) }}>{curto ? n.curto : n.label}</span>
}

export function Legenda({ claro = false }: { claro?: boolean }) {
  return (
    <div className={p.legenda} style={{ color: claro ? 'var(--faixa-sub)' : 'var(--n-text-2)' }}>
      {NIVEIS_UI.map((n) => (
        <span key={n.key} className={p.legendaItem}><span className={p.quadrado} style={{ background: cor(n.key) }} />{n.curto}</span>
      ))}
    </div>
  )
}

// ── COLUNAS: quantas pessoas em cada nível, mês a mês ─────────────────────────
export function ColunasMes({ resumo }: {
  resumo: { competencia: string; niveis: Contagem; avaliados: number; quadro: number; concluidas: number }[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...resumo.map((r) => r.avaliados))
  const h = hover != null ? resumo[hover] : null
  return (
    <div className={p.colunas} onMouseLeave={() => setHover(null)}>
      {resumo.map((r, i) => (
        <div key={r.competencia} className={`${p.coluna} ${hover === i ? p.colunaAtiva : ''}`}
          onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
          aria-label={`${competenciaLabel(r.competencia)}: ${r.avaliados} de ${r.quadro} avaliados`}>
          <span className={p.colunaTotal}>{r.avaliados > 0 ? r.avaliados : ''}</span>
          <div className={p.colunaPilha}>
            {r.avaliados === 0
              ? <span className={p.vazioCol} />
              : NIVEIS_UI.filter((n) => r.niveis[n.key] > 0).map((n) => (
                <span key={n.key} style={{ height: `${(r.niveis[n.key] / max) * 100}%`, background: cor(n.key) }} />
              ))}
          </div>
          <span className={p.colunaMes}>{mesCurto(r.competencia)}</span>
        </div>
      ))}
      {h && (
        <div className={p.dica} style={{ top: 0, left: `min(calc(${((hover! + 0.5) / resumo.length) * 100}% + 14px), calc(100% - 190px))` }}>
          <b style={{ textTransform: 'capitalize' }}>{competenciaLabel(h.competencia)}</b>
          {h.avaliados === 0 ? <div style={{ color: 'var(--n-text-3)' }}>Sem avaliação publicada</div> : (
            <>
              {[...NIVEIS_UI].reverse().map((n) => (
                <div key={n.key} className={p.dicaLinha}><span className={p.quadrado} style={{ background: cor(n.key) }} /><span>{n.curto}</span><span>{h.niveis[n.key]}</span></div>
              ))}
              <div style={{ borderTop: '1px solid var(--n-border-2)', marginTop: 5, paddingTop: 5, color: 'var(--n-text-2)' }}>
                {h.avaliados} de {h.quadro} avaliados · {h.concluidas} assinadas
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── LINHA: a média ao longo do tempo, sobre as faixas dos níveis ──────────────
/* As faixas de fundo são as ÂNCORAS da escala (0–4, 4–6, 6–8, 8–10): a pessoa lê
   "está na faixa do Atende" sem precisar saber o que é 7,3. */
const FAIXAS: { key: NivelKey; de: number; ate: number }[] = [
  { key: 'abaixo', de: 0, ate: 4 }, { key: 'parte', de: 4, ate: 6 }, { key: 'atende', de: 6, ate: 8 }, { key: 'acima', de: 8, ate: 10 },
]
export function LinhaMedia({ pontos, rotulo = 'Média' }: { pontos: { competencia: string; media: number | null }[]; rotulo?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 230, E = 30, D = 70, T = 12, B = 26
  const x = (i: number) => E + (pontos.length === 1 ? (W - E - D) / 2 : (i / (pontos.length - 1)) * (W - E - D))
  const y = (v: number) => T + (1 - v / 10) * (H - T - B)
  // Mês sem avaliação QUEBRA a linha — ligar por cima dele inventaria a nota do meio.
  const trechos: { i: number; v: number }[][] = []
  pontos.forEach((pt, i) => {
    if (pt.media == null) { trechos.push([]); return }
    if (!trechos.length) trechos.push([])
    trechos[trechos.length - 1].push({ i, v: pt.media })
  })
  const ultimo = [...pontos.keys()].reverse().find((i) => pontos[i].media != null)
  const hp = hover != null ? pontos[hover] : null
  const faixaDe = (v: number) => FAIXAS.find((f) => v <= f.ate) ?? FAIXAS[3]

  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${rotulo} mês a mês`} style={{ display: 'block', overflow: 'visible' }}>
        {FAIXAS.map((f) => (
          <g key={f.key}>
            <rect x={E} y={y(f.ate)} width={W - E - D} height={y(f.de) - y(f.ate)} fill={cor(f.key)} opacity={0.09} />
            <text x={W - D + 8} y={(y(f.de) + y(f.ate)) / 2 + 4} fontSize={11} fontWeight={700} fill="var(--n-text-2)">{nivelUi(f.key)!.curto}</text>
          </g>
        ))}
        {[0, 4, 6, 8, 10].map((v) => (
          <g key={v}>
            <line x1={E} x2={W - D} y1={y(v)} y2={y(v)} stroke="var(--n-border)" strokeWidth={1} />
            <text x={E - 8} y={y(v) + 4} fontSize={10.5} textAnchor="end" fill="var(--n-text-3)">{v}</text>
          </g>
        ))}
        {pontos.map((pt, i) => (
          <text key={pt.competencia} x={x(i)} y={H - 6} fontSize={10.5} textAnchor="middle" fill={hover === i ? 'var(--n-text)' : 'var(--n-text-3)'} fontWeight={hover === i ? 700 : 400}>
            {pontos.length > 12 && i % 2 === 1 ? '' : mesCurto(pt.competencia)}
          </text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--n-text-3)" strokeDasharray="3 3" />}
        {trechos.filter((t) => t.length > 1).map((t, k) => (
          <polyline key={k} points={t.map((q) => `${x(q.i)},${y(q.v)}`).join(' ')} fill="none" stroke="var(--n-text)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {pontos.map((pt, i) => pt.media != null && (
          <circle key={i} cx={x(i)} cy={y(pt.media)} r={hover === i ? 6 : 4.5} fill={cor(faixaDe(pt.media).key)} stroke="var(--n-card)" strokeWidth={2} />
        ))}
        {ultimo != null && (
          <text x={x(ultimo)} y={y(pontos[ultimo].media!) - 11} fontSize={12} fontWeight={800} textAnchor="middle" fill="var(--n-text)">
            {pontos[ultimo].media!.toFixed(1).replace('.', ',')}
          </text>
        )}
        {pontos.map((pt, i) => (
          <rect key={`h${i}`} x={x(i) - (W - E - D) / Math.max(1, pontos.length - 1) / 2} y={0} width={(W - E - D) / Math.max(1, pontos.length - 1)} height={H}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hp && (
        <div className={p.dica} style={{ top: 0, left: `min(calc(${(x(hover!) / W) * 100}% + 12px), calc(100% - 190px))` }}>
          <b style={{ textTransform: 'capitalize' }}>{competenciaLabel(hp.competencia)}</b>
          {hp.media == null ? <span style={{ color: 'var(--n-text-3)' }}>Sem avaliação publicada</span> : (
            <div className={p.dicaLinha}>
              <span className={p.quadrado} style={{ background: cor(faixaDe(hp.media).key) }} />
              <span>{nivelUi(faixaDe(hp.media).key)!.curto}</span><span>{hp.media.toFixed(1).replace('.', ',')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── BARRAS: os três pontos num mês ────────────────────────────────────────────
export function BarrasCriterio({ criterios }: { criterios: { key: string; label: string; niveis: Contagem }[] }) {
  return (
    <div className={p.barras}>
      {criterios.map((c) => {
        const total = NIVEIS_UI.reduce((a, n) => a + c.niveis[n.key], 0)
        return (
          <div key={c.key}>
            <div className={p.barraTopo}>{c.label}<span>{total} {total === 1 ? 'pessoa' : 'pessoas'}</span></div>
            {total === 0 ? <div className={p.barra}><span style={{ flex: 1, background: 'var(--lv-vazio)' }} /></div> : (
              <>
                <div className={p.barra} role="img" aria-label={NIVEIS_UI.map((n) => `${n.curto} ${c.niveis[n.key]}`).join(', ')}>
                  {NIVEIS_UI.filter((n) => c.niveis[n.key] > 0).map((n) => (
                    <span key={n.key} title={`${n.curto}: ${c.niveis[n.key]}`} style={{ flex: c.niveis[n.key], background: cor(n.key) }} />
                  ))}
                </div>
                {/* Os números ficam FORA da cor, em texto da página — legíveis em qualquer tom. */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 5, fontSize: 11.5, color: 'var(--n-text-2)' }}>
                  {NIVEIS_UI.filter((n) => c.niveis[n.key] > 0).map((n) => (
                    <span key={n.key} className={p.legendaItem}><span className={p.quadrado} style={{ background: cor(n.key) }} />{n.curto} <b style={{ color: 'var(--n-text)' }}>{c.niveis[n.key]}</b></span>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
