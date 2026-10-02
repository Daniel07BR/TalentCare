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

// ── LINHA DOS NÍVEIS: o resultado de cada mês, sem número ────────────────────
/* ⚠️⚠️ SEM NÚMERO (Daniel, 02/10/2026 — orientação dos psicólogos que acompanham a
   empresa: "não são a favor de nota em número"). Era a média 0–10 sobre as faixas;
   agora o eixo SÃO os quatro níveis, de baixo para cima, e cada mês é um ponto na
   faixa do nível dele. Lê-se a evolução sem ler número nenhum. */
const ORDEM_NIVEIS: NivelKey[] = ['abaixo', 'parte', 'atende', 'acima']
export function LinhaNivel({ pontos, rotulo = 'Resultado' }: { pontos: { competencia: string; nivel: NivelKey | null }[]; rotulo?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 220, E = 78, D = 16, T = 10, B = 26
  const faixa = (H - T - B) / 4
  const x = (i: number) => E + (pontos.length === 1 ? (W - E - D) / 2 : (i / (pontos.length - 1)) * (W - E - D))
  const y = (k: NivelKey) => T + (3 - ORDEM_NIVEIS.indexOf(k)) * faixa + faixa / 2
  // Mês sem avaliação QUEBRA a linha — ligar por cima dele inventaria o nível do meio.
  const trechos: { i: number; k: NivelKey }[][] = [[]]
  pontos.forEach((pt, i) => { if (pt.nivel) trechos[trechos.length - 1].push({ i, k: pt.nivel }); else trechos.push([]) })
  const hp = hover != null ? pontos[hover] : null
  const passo = (W - E - D) / Math.max(1, pontos.length - 1)

  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${rotulo} mês a mês`} style={{ display: 'block', overflow: 'visible' }}>
        {ORDEM_NIVEIS.map((k, idx) => (
          <g key={k}>
            <rect x={E} y={T + (3 - idx) * faixa} width={W - E - D} height={faixa - 2} rx={6} fill={cor(k)} opacity={0.1} />
            <text x={E - 10} y={y(k) + 4} fontSize={11.5} fontWeight={700} textAnchor="end" fill="var(--n-text-2)">{nivelUi(k)!.curto}</text>
          </g>
        ))}
        {pontos.map((pt, i) => (
          <text key={pt.competencia} x={x(i)} y={H - 6} fontSize={10.5} textAnchor="middle" fill={hover === i ? 'var(--n-text)' : 'var(--n-text-3)'} fontWeight={hover === i ? 700 : 400}>
            {pontos.length > 12 && i % 2 === 1 ? '' : mesCurto(pt.competencia)}
          </text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--n-text-3)" strokeDasharray="3 3" />}
        {trechos.filter((t) => t.length > 1).map((t, n) => (
          <polyline key={n} points={t.map((q) => `${x(q.i)},${y(q.k)}`).join(' ')} fill="none" stroke="var(--n-text)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {pontos.map((pt, i) => pt.nivel && (
          <circle key={i} cx={x(i)} cy={y(pt.nivel)} r={hover === i ? 7 : 5.5} fill={cor(pt.nivel)} stroke="var(--n-card)" strokeWidth={2} />
        ))}
        {pontos.map((pt, i) => (
          <rect key={`h${i}`} x={x(i) - passo / 2} y={0} width={passo} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hp && (
        <div className={p.dica} style={{ top: 0, left: `min(calc(${(x(hover!) / W) * 100}% + 12px), calc(100% - 190px))` }}>
          <b style={{ textTransform: 'capitalize' }}>{competenciaLabel(hp.competencia)}</b>
          {hp.nivel
            ? <div className={p.dicaLinha}><span className={p.quadrado} style={{ background: cor(hp.nivel) }} /><span>{nivelUi(hp.nivel)!.label}</span></div>
            : <span style={{ color: 'var(--n-text-3)' }}>Sem avaliação publicada</span>}
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

// ── MAPA DOS PONTOS: uma linha por ponto, um quadro por mês ───────────────────
export function MapaPontos({ meses, linhas, rotuloLarg = 120 }: {
  meses: string[]
  linhas: { label: string; celulas: Record<string, { nivel: NivelKey | null } | undefined> }[]
  rotuloLarg?: number
}) {
  return (
    <div className={p.mapa}>
      <div className={p.mapaGrade} style={{ gridTemplateColumns: `${rotuloLarg}px repeat(${meses.length}, minmax(48px, 1fr))` }}>
        <span />
        {meses.map((c) => <span key={c} className={p.mapaCab}>{mesCurto(c)}</span>)}
        {linhas.map((l) => (
          <span key={l.label} style={{ display: 'contents' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-text)' }}>{l.label}</span>
            {meses.map((c) => {
              const v = l.celulas[c]
              const n = nivelUi(v?.nivel)
              return n
                ? <span key={c} className={p.celula} style={{ ['--c' as string]: cor(n.key) }} title={`${competenciaLabel(c)}: ${n.label}`}>{n.curto}</span>
                : <span key={c} className={`${p.celula} ${p.celulaVazia}`} title={`${competenciaLabel(c)}: ${v ? 'não se aplica' : 'sem avaliação'}`}>—</span>
            })}
          </span>
        ))}
      </div>
    </div>
  )
}
