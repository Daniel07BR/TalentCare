'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Pencil, Info, History, ArrowLeftRight } from 'lucide-react'
import { diaBr } from '@/lib/disc/calculo'
import { EIXOS, NAO_E, POLOS, TIPOS, type EixoDaPersonalidade, type LetraDaPersonalidade } from '@/lib/personalidade/perfis'
import { COR_DO_EIXO, corDaLetra, linhaDaPersonalidade, tituloDoTipo, validarPersonalidade } from '@/lib/personalidade/calculo'
import type { PersonalidadeDaPessoa } from './usePersonalidade'
import d from '../disc/disc.module.css'
import p from './personalidade.module.css'

/* ============================================================
   A JANELA DA PERSONALIDADE — o irmão da janela do DISC (22/10/2026).

   Pedido do Daniel: "na entrevista a pessoa faz um teste de perfil, precisamos
   colocar no talent care assim como feito no disc um espaço para esse teste".
   O conteúdo é o mesmo que a chefia lê no relatório da entrevista, no Fluxo:
   o tipo, o que ele é, e em cada eixo "no trabalho / atenção / como lidar".

   Entra de dois jeitos: o encarregado lança à mão (quem já está na casa e fez
   o teste — o da casa ou o 16Personalities), ou chega sozinho do Fluxo quando
   a Recepção vincula o candidato contratado ao funcionário.
   ============================================================ */

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

function Lista({ itens, marca }: { itens: string[]; marca: string }) {
  return <ul className={d.lista} style={{ '--marca': marca } as React.CSSProperties}>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)', margin: '0 0 8px' }}>{children}</div>
}

export function TipoColorido({ tipo, tamanho = 44 }: { tipo: string; tamanho?: number }) {
  return (
    <span style={{ display: 'inline-flex', fontSize: tamanho, fontWeight: 900, letterSpacing: '.06em', lineHeight: 1 }}>
      {tipo.split('').map((l, i) => <span key={i} style={{ color: corDaLetra(i) }}>{l}</span>)}
    </span>
  )
}

export function Regua({ eixo, letra, pct, semNomes }: { eixo: EixoDaPersonalidade; letra: string; pct: number; semNomes?: boolean }) {
  const primeiro = letra === eixo.polos[0] ? pct : 100 - pct
  const cor = COR_DO_EIXO[eixo.chave]
  return (
    <div>
      <div className={p.regua} style={{ background: cor }}>
        <i className={p.marcador} style={{ left: `${100 - primeiro}%`, borderColor: cor }} />
      </div>
      {!semNomes && (
        <div className={p.lados}>
          {eixo.polos.map((l) => (l === letra ? <b key={l}>{POLOS[l].nome}</b> : <span key={l}>{POLOS[l].nome}</span>))}
        </div>
      )}
    </div>
  )
}

function Formulario({ pessoaId, inicial, onCancelar, onSalvo }: {
  pessoaId: string; inicial: { tipo: string; pct: number[] } | null; onCancelar: (() => void) | null; onSalvo: () => void
}) {
  const [letras, setLetras] = useState<string[]>(inicial ? inicial.tipo.split('') : ['', '', '', ''])
  const [pct, setPct] = useState<string[]>(inicial ? inicial.pct.map(String) : ['', '', '', ''])
  const [dia, setDia] = useState(hojeSP())
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const tipo = letras.join('')
  const prev = tipo.length === 4 && pct.every((x) => x.trim()) ? validarPersonalidade(tipo, pct) : null

  const salvar = async () => {
    if (tipo.length !== 4) { setErro('Escolha uma letra em cada um dos quatro pares.'); return }
    const ok = validarPersonalidade(tipo, pct)
    if (!ok.ok) { setErro(ok.erro); return }
    setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/personalidade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pessoaId, tipo: ok.r.tipo, pct: ok.r.pct, aplicadoEm: dia, observacao: obs }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(j.error ?? 'Não foi possível salvar.'); return }
      onSalvo()
    } catch {
      setErro('Não foi possível salvar. Verifique a conexão e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{inicial ? 'Registrar nova aplicação' : 'Registrar o resultado da personalidade'}</div>
        <div style={{ fontSize: 12, color: 'var(--n-text-3)', marginTop: 3, lineHeight: 1.45 }}>
          Em cada par, clique na letra que o teste deu e digite a porcentagem dela (50 a 100). Vale o teste da casa
          ou o 16Personalities — do 16Personalities, ignore o -A / -T do fim. {inicial && 'O resultado anterior não se apaga: fica no histórico.'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {EIXOS.map((eixo, i) => {
          const cor = COR_DO_EIXO[eixo.chave]
          return (
            <div key={eixo.chave} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 12, border: `1.5px solid ${cor}`, background: `color-mix(in srgb, ${cor} 8%, transparent)` }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{eixo.nome} <span style={{ fontWeight: 500, color: 'var(--n-text-3)', fontSize: 12 }}>· {eixo.pergunta.toLowerCase()}</span></span>
              <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label={eixo.nome}>
                {eixo.polos.map((l) => {
                  const sel = letras[i] === l
                  return (
                    <button key={l} type="button" role="radio" aria-checked={sel}
                      onClick={() => setLetras(letras.map((x, j) => (j === i ? l : x)))}
                      style={{ flex: 1, minHeight: 36, borderRadius: 9, border: `1.5px solid ${sel ? cor : 'var(--n-border)'}`, background: sel ? cor : 'var(--n-card)', color: sel ? '#fff' : 'var(--n-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
                      {l} · {POLOS[l].nome}
                    </button>
                  )
                })}
              </div>
              <input className={d.campo} type="number" inputMode="numeric" min={50} max={100} step={1} value={pct[i]}
                placeholder="%" aria-label={`Porcentagem de ${eixo.nome}`}
                onChange={(e) => setPct(pct.map((x, j) => (j === i ? e.target.value : x)))}
                style={{ fontSize: 17, fontWeight: 800, textAlign: 'center' }} />
            </div>
          )
        })}
      </div>
      {prev?.ok && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <TipoColorido tipo={prev.r.tipo} tamanho={26} />
          <span style={{ fontSize: 14, fontWeight: 800 }}>{tituloDoTipo(prev.r.tipo)}</span>
          <span style={{ fontSize: 12, color: 'var(--n-text-3)' }}>{linhaDaPersonalidade(prev.r)}</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
          Data da aplicação
          <input className={d.campo} type="date" value={dia} max={hojeSP()} onChange={(e) => setDia(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
          Observação (opcional)
          <input className={d.campo} type="text" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: 16Personalities, feito em 2025" />
        </label>
      </div>
      {erro && <div role="alert" style={{ fontSize: 12.5, color: 'var(--n-red)', background: 'var(--n-red-soft)', padding: '8px 12px', borderRadius: 9 }}>{erro}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onCancelar && <button type="button" className={d.acao} onClick={onCancelar} style={{ background: 'var(--n-card-2)', color: 'var(--n-text)' }}>Cancelar</button>}
        <button type="button" className={d.acao} onClick={salvar} disabled={salvando}
          style={{ background: 'var(--n-blue)', color: '#fff', opacity: salvando ? 0.7 : 1, cursor: salvando ? 'wait' : 'pointer' }}>
          {salvando ? 'Salvando…' : 'Salvar resultado'}
        </button>
      </div>
    </div>
  )
}

export function JanelaPersonalidade({ dados, onFechar, onSalvo }: { dados: PersonalidadeDaPessoa; onFechar: () => void; onSalvo: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const atual = dados.atual
  const tipo = atual ? TIPOS[atual.tipo] : undefined
  const [editando, setEditando] = useState(!atual)
  const [verHistorico, setVerHistorico] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  return (
    <div className={d.fundo} onClick={onFechar}>
      <div ref={ref} className={d.janela} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pers-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={d.topo}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', fontWeight: 600 }}>Teste de perfil · Personalidade</div>
            <div id="pers-titulo" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginTop: 2 }}>{dados.pessoa.nome}</div>
            {atual && (
              <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 4 }}>
                Aplicado em <b style={{ color: 'var(--n-text-2)' }}>{diaBr(atual.aplicadoEm)}</b> · registrado por {atual.registradoPorNome}
                {atual.observacao && <> · {atual.observacao}</>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
            {dados.podeRegistrar && atual && !editando && (
              <button type="button" className={d.acao} onClick={() => setEditando(true)} style={{ background: 'var(--n-card-2)', color: 'var(--n-text)', minHeight: 36 }}>
                <Pencil size={14} /> Nova aplicação
              </button>
            )}
            <button type="button" onClick={onFechar} aria-label="Fechar"
              style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--n-border)', background: 'var(--n-card)', color: 'var(--n-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={d.corpo}>
          {editando && dados.podeRegistrar ? (
            <Formulario pessoaId={dados.pessoa.id} inicial={atual}
              onCancelar={atual ? () => setEditando(false) : null}
              onSalvo={() => { setEditando(false); onSalvo() }} />
          ) : atual ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {atual.fluxoRef && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: 'var(--n-text-2)', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, padding: '10px 14px' }}>
                  <ArrowLeftRight size={15} style={{ flex: 'none', marginTop: 2, color: 'var(--n-blue)' }} />
                  <span>Veio da <b>entrevista de emprego</b>, no Fluxo: a Recepção ligou o candidato a esta pessoa depois da contratação.</span>
                </div>
              )}
              <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 18px' }}>
                  <TipoColorido tipo={atual.tipo} tamanho={48} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{tipo?.titulo ?? atual.tipo}</div>
                    {tipo && <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>{tipo.essencia}</div>}
                  </div>
                </div>
                {tipo && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tipo.forcas.map((f) => <span key={f} className={p.forca}>{f}</span>)}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>{linhaDaPersonalidade(atual)}</div>
              </div>

              <div className={p.eixos}>
                {EIXOS.map((eixo, i) => {
                  const letra = atual.tipo[i] as LetraDaPersonalidade
                  const polo = POLOS[letra]
                  if (!polo) return null
                  const cor = COR_DO_EIXO[eixo.chave]
                  return (
                    <div key={eixo.chave} className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${cor}` }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {eixo.nome}: <b style={{ color: cor }}>{atual.pct[i]}% {polo.nome}</b>
                      </div>
                      <Regua eixo={eixo} letra={letra} pct={atual.pct[i]} />
                      <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>{polo.descricao}</div>
                      <div className={p.tres}>
                        <div><Titulo>No trabalho</Titulo><Lista itens={polo.noTrabalho} marca={cor} /></div>
                        <div><Titulo>Atenção</Titulo><Lista itens={polo.atencao} marca="#e11d48" /></div>
                        <div><Titulo>Como lidar</Titulo><Lista itens={polo.comoLidar} marca="#16a34a" /></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {dados.historico.length > 0 && (
                <div className={d.bloco}>
                  <button type="button" onClick={() => setVerHistorico(!verHistorico)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--n-text)', cursor: 'pointer' }}>
                    <History size={15} /> Aplicações anteriores ({dados.historico.length}) {verHistorico ? '▴' : '▾'}
                  </button>
                  {verHistorico && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {dados.historico.map((h) => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                          <b style={{ minWidth: 80 }}>{diaBr(h.aplicadoEm)}</b>
                          <TipoColorido tipo={h.tipo} tamanho={16} />
                          <span>{tituloDoTipo(h.tipo)}</span>
                          <span style={{ color: 'var(--n-text-3)' }}>{linhaDaPersonalidade(h)} · por {h.registradoPorNome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--n-text-3)', lineHeight: 1.5 }}>
                <Info size={14} style={{ flex: 'none', marginTop: 1 }} />
                <span>
                  {NAO_E} Teste da casa no modelo dos 16 tipos; não é o 16Personalities (o resultado de lá também pode ser
                  lançado, e os nomes dos tipos aqui são os da casa). Visível só para a chefia do setor, a Diretoria e o
                  T.I, e fora da pontuação e do PDF da ficha.
                </span>
              </div>
            </div>
          ) : (
            <div className={d.bloco} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Ainda não há resultado de personalidade registrado para esta pessoa.</div>
          )}
        </div>
      </div>
    </div>
  )
}
