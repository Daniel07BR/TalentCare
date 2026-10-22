'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Info, History, KeyRound, ArrowLeftRight } from 'lucide-react'
import { diaBr } from '@/lib/disc/calculo'
import { NOME_DO_ESTILO, PROVAS, nivelGeral } from '@/lib/testes/atencao'
import type { AtencaoDaPessoa, LinhaAtencao } from './useAtencao'
import { SeloNivel } from './JanelaCodigo'
import d from '../disc/disc.module.css'

/* ============================================================
   A JANELA DA ATENÇÃO (22/10/2026) — as duas provas do teste, como o
   relatório da entrevista no Fluxo mostra: nível, % de acerto, ritmo, os
   números crus, o estilo e como a prova é feita. Pedido do Daniel: "criar o
   campo com o resultado do teste de atenção".
   ============================================================ */

function Titulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)', margin: '0 0 8px' }}>{children}</div>
}

function Barra({ rotulo, pct, cor }: { rotulo: string; pct: number; cor: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: 'var(--n-text-2)' }}>{rotulo}</span><b>{pct}%</b>
      </div>
      <div style={{ height: 8, background: 'var(--n-card-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: cor, borderRadius: 99 }} />
      </div>
    </div>
  )
}

function Prova({ k, a }: { k: 'busca' | 'conferencia'; a: LinhaAtencao }) {
  const p = PROVAS[k]
  const r = k === 'busca' ? a.busca : a.conferencia
  const numeros = k === 'busca'
    ? `${a.busca.acertos} acertos · ${a.busca.erros} erros · ${a.busca.omissoes} omissões · percorreu ${a.busca.percorrido} de ${a.busca.celulas}`
    : `${a.conferencia.acertos} acertos · ${a.conferencia.erros} erros · respondeu ${a.conferencia.respondidos} de ${a.conferencia.pares}`
  return (
    <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '4px solid #059669' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{p.nome} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--n-text-3)' }}>· {p.tempo}</span></div>
        <SeloNivel nivel={r.nivel} />
      </div>
      <Barra rotulo="Acerto (qualidade)" pct={r.acerto} cor="#059669" />
      <Barra rotulo="Ritmo (velocidade)" pct={r.ritmo} cor="#2563eb" />
      <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>{numeros}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{NOME_DO_ESTILO[r.estilo]}</div>
      <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', lineHeight: 1.5 }}><b>O que mede:</b> {p.mede}</div>
      <div style={{ fontSize: 12, color: 'var(--n-text-3)', lineHeight: 1.5 }}><b>Como é:</b> {p.como}<br /><b>Os números:</b> {p.numeros}<br /><b>Nível:</b> {p.regua}</div>
    </div>
  )
}

export function JanelaAtencao({ dados, onFechar, onCodigo }: { dados: AtencaoDaPessoa; onFechar: () => void; onCodigo: (() => void) | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const a = dados.atual
  const [verHistorico, setVerHistorico] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  return (
    <div className={d.fundo} onClick={onFechar}>
      <div ref={ref} className={d.janela} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="at-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={d.topo}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', fontWeight: 600 }}>Teste de atenção · busca de números e conferência</div>
            <div id="at-titulo" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginTop: 2 }}>{dados.pessoa.nome}</div>
            {a && (
              <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 4 }}>
                Feito em <b style={{ color: 'var(--n-text-2)' }}>{diaBr(a.aplicadoEm)}</b> · registrado por {a.registradoPorNome}
                {a.observacao && <> · {a.observacao}</>}{a.codigo && <> · código {a.codigo}</>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
            {onCodigo && (
              <button type="button" className={d.acao} onClick={onCodigo} style={{ background: 'var(--n-card-2)', color: 'var(--n-text)', minHeight: 36 }}>
                <KeyRound size={14} /> Lançar código novo
              </button>
            )}
            <button type="button" onClick={onFechar} aria-label="Fechar"
              style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--n-border)', background: 'var(--n-card)', color: 'var(--n-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={d.corpo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {a ? (
            <>
              {a.fluxoRef && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: 'var(--n-text-2)', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, padding: '10px 14px' }}>
                  <ArrowLeftRight size={15} style={{ flex: 'none', marginTop: 2, color: 'var(--n-blue)' }} />
                  <span>Veio da <b>entrevista de emprego</b>, no Fluxo.</span>
                </div>
              )}
              <div className={d.bloco} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Atenção, as duas provas juntas:</span>
                <SeloNivel nivel={nivelGeral(a.busca.nivel, a.conferencia.nivel)} />
                <span style={{ fontSize: 12, color: 'var(--n-text-3)' }}>basta uma baixa para “baixa”; “alta” só com as duas altas</span>
              </div>
              <div className={d.grade} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <Prova k="busca" a={a} />
                <Prova k="conferencia" a={a} />
              </div>
              {dados.historico.length > 0 && (
                <div className={d.bloco}>
                  <button type="button" onClick={() => setVerHistorico(!verHistorico)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--n-text)', cursor: 'pointer' }}>
                    <History size={15} /> Aplicações anteriores ({dados.historico.length}) {verHistorico ? '▴' : '▾'}
                  </button>
                  {verHistorico && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {dados.historico.map((h) => (
                        <div key={h.id} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                          <b style={{ minWidth: 80 }}>{diaBr(h.aplicadoEm)}</b>
                          <span>Busca <SeloNivel nivel={h.busca.nivel} /> {h.busca.acerto}%</span>
                          <span>Conferência <SeloNivel nivel={h.conferencia.nivel} /> {h.conferencia.acerto}%</span>
                          <span style={{ color: 'var(--n-text-3)' }}>por {h.registradoPorNome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--n-text-3)', lineHeight: 1.5 }}>
                <Info size={14} style={{ flex: 'none', marginTop: 1 }} />
                <span>
                  Provas práticas da casa, com cronômetro — não são o Teste AC (de uso de psicólogo) e não dão laudo. A régua
                  dos níveis é inicial, a mesma do Fluxo. Visível só para a chefia do setor, a Diretoria e o T.I, e fora da
                  pontuação e do PDF da ficha.
                </span>
              </div>
            </>
          ) : (
            <div className={d.bloco} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Ainda não há resultado de atenção. Ele entra pelo código dos testes.</div>
          )}
        </div>
      </div>
    </div>
  )
}
