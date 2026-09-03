'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import { useScoreSignals } from '@/lib/ui/score-period'
import { useAssiduidadePeriod } from '@/lib/ui/assiduidade-period'
import { withRealScores } from '@/lib/mock/score'
import { personKeyOf } from '@/lib/mock/assiduidade'
import { leaderboard, comparison, cmpOptions, metricLabel, type RankMetric } from '@/lib/mock/ranking'
import Avatar from '../Avatar'

const METRICS: RankMetric[] = ['score', 'assiduidade']

export default function RankingPage() {
  const router = useRouter()
  const { label: periodLabel } = usePeriod()
  const [metric, setMetric] = useState<RankMetric>('score')
  const [dept, setDept] = useState('Todos')
  /* ⚠️ `null` = "ainda não escolhi", e o padrão sai da lista real de gente.
     Antes eram `'e3'` e `'e23'` — ids do dataset MOCK antigo, de quando as
     pessoas se chamavam e1, e2, e3. Os ids reais são cuid, `findEmployee`
     devolvia `undefined`, e o painel "Comparação lado a lado" nascia VAZIO em
     toda visita: dois seletores e mais nada abaixo deles. */
  const [cmpA, setCmpA] = useState<string | null>(null)
  const [cmpB, setCmpB] = useState<string | null>(null)

  const { signals } = useScoreSignals()
  const data = withRealScores(useTalentData(), signals)
  const assidPeriodo = useAssiduidadePeriod()
  const opts = cmpOptions(data)
  const aId = cmpA ?? opts[0]?.value ?? ''
  const bId = cmpB ?? opts[1]?.value ?? opts[0]?.value ?? ''

  const board = leaderboard(data, metric, dept, {
    janelaOk: assidPeriodo.janelaComPonto,
    motivo: assidPeriodo.motivoSemPonto,
    ocorrenciasDe: (e) => {
      const p = assidPeriodo.map?.get(personKeyOf(e))
      return p ? { atrasos: p.atrasos, advertencias: p.advertencias } : null
    },
  })
  const cmp = comparison(data, aId, bId)
  // Score é relativo ao departamento → misturar setores no ranking por score não compara.
  const scoreCrossDept = metric === 'score' && dept === 'Todos'
  const cmpCrossDept = !!cmp && metric === 'score' && cmp.aCard.dept !== cmp.bCard.dept
  const carregando = metric === 'assiduidade' && assidPeriodo.loading

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Comparativo</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Ranking &amp; Comparativo</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="Todos">Todos os setores</option>
            {[...data.departments].sort((a, b) => a.nome.localeCompare(b.nome)).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {METRICS.map((m) => <button key={m} className={'seg' + (metric === m ? ' on' : '')} onClick={() => setMetric(m)} style={{ fontSize: 12.5, padding: '7px 13px' }}>{metricLabel(m)}</button>)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Leaderboard</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            Ordenado por {metricLabel(metric)}{dept !== 'Todos' ? ` · ${data.deptMeta[dept] ?? ''}` : ''}
            {' · '}<span style={{ color: 'var(--text-mute)' }}>{periodLabel}</span>
            {board.rows.length > 0 && <> · <b style={{ color: 'var(--text)' }}>{board.rows.length}</b> {board.rows.length === 1 ? 'pessoa medida' : 'pessoas medidas'}</>}
          </div>

          {/* ⚠️⚠️ QUEM NÃO É MEDIDO NÃO É O ÚLTIMO COLOCADO — ESTÁ FORA DA LISTA.
              A assiduidade é `100 − atrasos·2 − advertências·5`: sem registro de
              ponto a conta dá 0 e 0 e devolve **100**. Em 03/09/2026 os 22
              primeiros colocados desta tela eram exatamente as 22 pessoas que o
              ponto não cobre, e o primeiro medido de verdade aparecia em 32º.
              Eles saem da ordenação e viram esta linha — que diz quantos são e
              por quê, porque some-los em silêncio seria a outra metade do erro. */}
          {board.foraDaMedicao > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
              <b style={{ color: 'var(--text)' }}>{board.foraDaMedicao}</b> {board.foraDaMedicao === 1 ? 'pessoa está fora' : 'pessoas estão fora'} desta medição — {board.motivoFora}.
              {' '}Ficar de fora <b>não é ficar em último</b>: o sistema não tem o que dizer sobre {board.foraDaMedicao === 1 ? 'ela' : 'elas'} aqui.
            </div>
          )}

          {/* A nota satura em 0 — quem bate no piso não se distingue pelo número. */}
          {board.noPiso > 1 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>
              {board.noPiso} pessoas chegam a <b>0</b>: a nota tem piso, então o número não as separa. A <b>ordem</b> e as ocorrências ao lado de cada nome, sim.
            </div>
          )}

          {scoreCrossDept && (
            <div style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
              ⚠ O score é <b>relativo ao departamento</b> (produtividade é percentil interno). Comparar pessoas de setores diferentes não é direto — selecione um setor acima para um ranking comparável.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {carregando ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '18px 4px' }}>Carregando o ponto do período…</div>
            ) : board.rows.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '18px 4px', lineHeight: 1.55 }}>
                Ninguém a comparar nesta janela. <b>Lista vazia é a resposta certa</b> quando não há medição — a alternativa seria ordenar pessoas por um número que ninguém apurou.
              </div>
            ) : board.rows.map((r) => (
              <div key={r.id} className="tc-row" onClick={() => router.push(`/funcionarios/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 9, borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: r.medal, color: '#1a1205', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{r.rank}</span>
                <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.dept}{r.detalhe ? <span style={{ color: 'var(--text-mute)' }}> · {r.detalhe}</span> : null}
                  </div>
                </div>
                <div style={{ width: 90, height: 6, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden', flex: 'none' }}><div style={{ height: '100%', width: r.pct, background: 'var(--accent)', borderRadius: 20 }} /></div>
                <span style={{ width: 36, textAlign: 'right', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Comparação lado a lado</div>
          {cmpCrossDept && (
            <div style={{ fontSize: 11.5, color: 'var(--warning)', background: 'rgba(245,166,35,.1)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', marginBottom: 12, lineHeight: 1.45 }}>
              ⚠ Setores diferentes — a produtividade é relativa a cada depto, então o score não é diretamente comparável.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <select value={aId} onChange={(e) => setCmpA(e.target.value)} style={{ flex: 1, height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', minWidth: 0 }}>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={bId} onChange={(e) => setCmpB(e.target.value)} style={{ flex: 1, height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', minWidth: 0 }}>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {cmp && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {[cmp.aCard, cmp.bCard].map((c, i) => (
                  <div key={i} style={{ textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div style={{ width: 44, margin: '0 auto 8px', display: 'flex', justifyContent: 'center' }}><Avatar id={c.id} hasAvatar={c.hasAvatar} initials={c.initials} color={c.color} size={44} /></div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{c.cargo}</div>
                    {/* ⚠️ Sem score, "—". Um 0 grande e vermelho no lugar de "não
                        medimos" é a acusação que a regra da casa proíbe. */}
                    <div style={{ fontSize: 26, fontWeight: 800, color: c.scoreColor }}>{c.score ?? '—'}</div>
                    {c.score == null && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>sem score aplicável</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cmp.rows.map((f) => (
                  <div key={f.label}>
                    <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 26, textAlign: 'right', fontSize: 12, fontWeight: 700, color: f.naColor }}>{f.na}</span>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', height: 7, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ width: f.naPct, background: f.naColor, borderRadius: 20 }} /></div>
                      <div style={{ flex: 1, height: 7, background: 'var(--surface-2)', borderRadius: 20, overflow: 'hidden' }}><div style={{ width: f.nbPct, background: f.nbColor, borderRadius: 20 }} /></div>
                      <span style={{ width: 26, fontSize: 12, fontWeight: 700, color: f.nbColor }}>{f.nb}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
