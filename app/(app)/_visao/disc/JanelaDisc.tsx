'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Pencil, Info, History } from 'lucide-react'
import {
  corDe, corSuaveDe, tintaSobre, diaBr, faixa, fatias, nomeDoPerfil, predominantes, validarNotas, type Notas,
} from '@/lib/disc/calculo'
import { FATORES, LEMBRETE_DO_LIDER, O_QUE_NAO_E, PERFIS, type Fator, type Perfil } from '@/lib/disc/perfis'
import { notasDe, type DiscDaPessoa } from './useDisc'
import d from './disc.module.css'

/* ============================================================
   A JANELA DO DISC — o que o encarregado precisa para liderar esta pessoa.

   Pedido do dono (22/09/2026): "uma janela na tela com a pontuação do
   funcionário, sua predominância, o que significa, como lidar com aquele
   perfil, como elogiar, como cobrar". Os textos são a NOSSA versão do material
   do treinamento (`lib/disc/perfis.ts`).

   ⚠️ EMPATE: os perfis empatados viram os primeiros botões da escolha de
   perfil, os dois marcados como predominantes, e a janela abre no primeiro.
   Os outros dois perfis também se abrem: quem tem D 40 e S 38 é quase
   empate, e o gestor precisa ler o S também.
   ============================================================ */

type Aba = 'quem' | 'falar' | 'elogiar' | 'cobrar' | 'motiva' | 'desenvolver'
const ABAS: { k: Aba; rotulo: string }[] = [
  { k: 'quem', rotulo: 'Quem é' },
  { k: 'falar', rotulo: 'Como falar' },
  { k: 'elogiar', rotulo: 'Como elogiar' },
  { k: 'cobrar', rotulo: 'Como cobrar' },
  { k: 'motiva', rotulo: 'Motiva e trava' },
  { k: 'desenvolver', rotulo: 'Pontos de atenção' },
]

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

function Letra({ f, size = 24 }: { f: Fator; size?: number }) {
  return (
    <span className={d.letra} style={{ background: corDe(f), color: tintaSobre(f), width: size, height: size, fontSize: size * 0.5 }}>{f}</span>
  )
}

function Lista({ itens }: { itens: string[] }) {
  return <ul className={d.lista}>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)', margin: '0 0 8px' }}>{children}</div>
}

/* As quatro barras. A barra mede a NOTA (0–100), e o número entre parênteses é
   a FATIA no total, a mesma do botão. As duas leituras existem porque o teste
   dá notas, e o botão mostra proporção. */
function Barras({ n }: { n: Notas }) {
  const pr = new Set(predominantes(n))
  const pct = Object.fromEntries(fatias(n).map((x) => [x.fator, x.pct])) as Record<Fator, number>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FATORES.map((f) => (
        <div key={f}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <Letra f={f} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>
              {PERFIS[f].nome} <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}>· {PERFIS[f].apelido}</span>
            </span>
            {pr.has(f) && (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: `var(--disc-${f}-text)`, background: corSuaveDe(f), padding: '2px 8px', borderRadius: 20 }}>
                {pr.size > 1 ? 'Empate' : 'Predominante'}
              </span>
            )}
            <span className="cnum" style={{ fontSize: 16, fontWeight: 800, minWidth: 28, textAlign: 'right' }}>{n[f]}</span>
            <span style={{ fontSize: 12, color: 'var(--n-text-3)', width: 42, textAlign: 'right' }}>({Math.round(pct[f])}%)</span>
          </div>
          <div style={{ height: 10, background: 'var(--n-card-2)', borderRadius: 99, overflow: 'hidden', marginLeft: 34 }}>
            <div style={{ width: `${Math.min(100, n[f])}%`, height: '100%', background: corDe(f), borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* A faixa proporcional, com a porcentagem escrita dentro de cada cor que couber. */
export function FaixaDisc({ n, altura = 30 }: { n: Notas; altura?: number }) {
  const fs = fatias(n).filter((x) => x.pct > 0)
  return (
    <div style={{ display: 'flex', height: altura, borderRadius: 10, overflow: 'hidden', background: faixa(n) }}
      role="img" aria-label={fs.map((x) => `${PERFIS[x.fator].nome} ${Math.round(x.pct)}%`).join(', ')}>
      {fs.map((x) => (
        <div key={x.fator} style={{ width: `${x.pct}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tintaSobre(x.fator), fontSize: 12, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap' }}
          title={`${PERFIS[x.fator].nome}: ${Math.round(x.pct)}%`}>
          {x.pct >= 9 ? `${x.fator} ${Math.round(x.pct)}%` : x.pct >= 4 ? x.fator : ''}
        </div>
      ))}
    </div>
  )
}

function Conteudo({ p, aba }: { p: Perfil; aba: Aba }) {
  const marca = { '--marca': corDe(p.fator), '--marca-soft': corSuaveDe(p.fator) } as React.CSSProperties
  if (aba === 'quem') return (
    <div style={{ ...marca, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className={d.citacao}>{p.essencia}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {p.palavras.map((w) => <span key={w} style={{ fontSize: 12, fontWeight: 700, color: `var(--disc-${p.fator}-text)`, background: corSuaveDe(p.fator), padding: '4px 10px', borderRadius: 20 }}>{w}</span>)}
      </div>
      <div><Titulo>Como trabalha</Titulo><Lista itens={p.comoAge} /></div>
      <div className={d.grade} style={{ gap: 16 }}>
        <div><Titulo>Onde brilha</Titulo><Lista itens={p.forcas} /></div>
        <div><Titulo>Onde tropeça</Titulo><Lista itens={p.atencao} /></div>
      </div>
      <div><Titulo>O que entrega</Titulo><div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.entrega}</div></div>
    </div>
  )
  if (aba === 'falar') return (
    <div style={{ ...marca, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><Titulo>Para ser ouvido por este perfil</Titulo><Lista itens={p.comoFalar} /></div>
    </div>
  )
  if (aba === 'elogiar') return (
    <div style={{ ...marca, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.comoElogiar}</div>
      <div>
        <Titulo>Frases que funcionam</Titulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.elogios.map((e) => <div key={e} className={d.citacao}>“{e}”</div>)}
        </div>
      </div>
    </div>
  )
  if (aba === 'cobrar') return (
    <div style={{ ...marca, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Lista itens={p.comoCobrar} />
      <div><Titulo>Um jeito de dizer</Titulo><div className={d.citacao}>{p.cobrancaModelo}</div></div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--n-text-3)', lineHeight: 1.45 }}>
        <Info size={14} style={{ flex: 'none', marginTop: 1 }} />
        Adaptação nossa: o material do treinamento não tem esta seção. Ela junta o que ele diz que trava, o que motiva e como o perfil prefere ser tratado.
      </div>
    </div>
  )
  if (aba === 'motiva') return (
    <div className={d.grade} style={{ ...marca, gap: 16 }}>
      <div>
        <Titulo>Gera performance</Titulo>
        <ul className={d.lista} style={{ '--marca': 'var(--n-green)' } as React.CSSProperties}>{p.motiva.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <div>
        <Titulo>Trava o perfil</Titulo>
        <ul className={d.lista} style={{ '--marca': 'var(--n-red)' } as React.CSSProperties}>{p.trava.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  )
  return (
    <div style={{ ...marca, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><Titulo>Pontos cegos</Titulo><Lista itens={p.pontosCegos} /></div>
      <div><Titulo>A pergunta que o perfil precisa se fazer</Titulo><div className={d.citacao}>{p.pergunta}</div></div>
      <div><Titulo>Para crescer</Titulo><Lista itens={p.desenvolver} /></div>
      <div><Titulo>Prática da semana</Titulo><div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.pratica}</div></div>
    </div>
  )
}

function Formulario({ pessoaId, inicial, onCancelar, onSalvo }: {
  pessoaId: string; inicial: Notas | null; onCancelar: (() => void) | null; onSalvo: () => void
}) {
  const [v, setV] = useState<Record<Fator, string>>({
    D: inicial ? String(inicial.D) : '', I: inicial ? String(inicial.I) : '',
    S: inicial ? String(inicial.S) : '', C: inicial ? String(inicial.C) : '',
  })
  const [dia, setDia] = useState(hojeSP())
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const completo = FATORES.every((f) => v[f].trim() !== '')
  const prev = completo ? validarNotas(v) : null

  const salvar = async () => {
    // ⚠️ Campo vazio NÃO vira zero calado: zero é uma nota, vazio é esquecimento.
    if (!completo) { setErro('Preencha as quatro notas (use 0 se o teste deu zero).'); return }
    const ok = validarNotas(v)
    if (!ok.ok) { setErro(ok.erro); return }
    setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/disc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pessoaId, d: ok.notas.D, i: ok.notas.I, s: ok.notas.S, c: ok.notas.C, aplicadoEm: dia, observacao: obs }),
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
        <div style={{ fontSize: 15, fontWeight: 800 }}>{inicial ? 'Registrar nova aplicação' : 'Registrar o resultado do DISC'}</div>
        <div style={{ fontSize: 12, color: 'var(--n-text-3)', marginTop: 3, lineHeight: 1.45 }}>
          Digite as quatro notas como vieram no teste (0 a 100). {inicial && 'O resultado anterior não se apaga: fica no histórico.'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {FATORES.map((f) => (
          <label key={f} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 12, background: corSuaveDe(f), border: `1.5px solid ${corDe(f)}` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}><Letra f={f} size={22} />{PERFIS[f].nome}</span>
            <input className={d.campo} type="number" inputMode="numeric" min={0} max={100} step={1} value={v[f]}
              onChange={(e) => setV({ ...v, [f]: e.target.value })} aria-label={`Nota de ${PERFIS[f].nome}`}
              style={{ fontSize: 18, fontWeight: 800, textAlign: 'center' }} />
          </label>
        ))}
      </div>
      {prev?.ok && (
        <div>
          <Titulo>Como vai ficar · {nomeDoPerfil(predominantes(prev.notas))}</Titulo>
          <FaixaDisc n={prev.notas} altura={26} />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
          Data da aplicação
          <input className={d.campo} type="date" value={dia} max={hojeSP()} onChange={(e) => setDia(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
          Observação (opcional)
          <input className={d.campo} type="text" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: aplicado no treinamento de liderança" />
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

export function JanelaDisc({ dados, onFechar, onSalvo }: { dados: DiscDaPessoa; onFechar: () => void; onSalvo: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const n = dados.atual ? notasDe(dados.atual) : null
  const pr = n ? predominantes(n) : []
  // A ordem das escolhas: os predominantes primeiro, depois os outros pela nota.
  const ordem: Fator[] = n ? fatias(n).map((x) => x.fator) : FATORES
  const [perfil, setPerfil] = useState<Fator>(pr[0] ?? 'D')
  const [aba, setAba] = useState<Aba>('quem')
  const [editando, setEditando] = useState(!dados.atual)
  const [verHistorico, setVerHistorico] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const p = PERFIS[perfil]

  return (
    <div className={d.fundo} onClick={onFechar}>
      <div ref={ref} className={d.janela} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="disc-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={d.topo}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', fontWeight: 600 }}>Perfil comportamental · DISC</div>
            <div id="disc-titulo" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginTop: 2 }}>{dados.pessoa.nome}</div>
            {dados.atual && (
              <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 4 }}>
                Aplicado em <b style={{ color: 'var(--n-text-2)' }}>{diaBr(dados.atual.aplicadoEm)}</b> · registrado por {dados.atual.registradoPorNome}
                {dados.atual.observacao && <> · {dados.atual.observacao}</>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
            {dados.podeRegistrar && dados.atual && !editando && (
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
            <Formulario pessoaId={dados.pessoa.id} inicial={n}
              onCancelar={dados.atual ? () => setEditando(false) : null}
              onSalvo={() => { setEditando(false); onSalvo() }} />
          ) : n ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={d.grade}>
                <div className={d.bloco}><Titulo>Pontuação</Titulo><Barras n={n} /></div>
                <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Titulo>{pr.length > 1 ? 'Perfis predominantes · empate' : 'Perfil predominante'}</Titulo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {pr.map((f) => (
                      <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, background: corDe(f), color: tintaSobre(f), fontSize: 17, fontWeight: 800 }}>
                        <span className={d.letra} style={{ background: 'rgba(255,255,255,.85)', color: '#111', width: 28, height: 28, fontSize: 14 }}>{f}</span>
                        {PERFIS[f].nome}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>
                    {pr.length > 1
                      ? <>As duas tendências apareceram <b>na mesma medida</b>. Na prática a pessoa alterna entre elas conforme a situação; leia os {pr.length} perfis abaixo.</>
                      : <><b>{PERFIS[pr[0]].foco}.</b> {PERFIS[pr[0]].essencia}</>}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <Titulo>A mistura</Titulo>
                    <FaixaDisc n={n} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: 'var(--n-text-2)', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, padding: '10px 14px' }}>
                <Info size={15} style={{ flex: 'none', marginTop: 2, color: 'var(--n-blue)' }} />
                <span>{LEMBRETE_DO_LIDER}</span>
              </div>

              <div className={d.bloco}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }} role="tablist" aria-label="Perfil">
                  {ordem.map((f) => {
                    const sel = f === perfil
                    return (
                      <button key={f} type="button" role="tab" aria-selected={sel} className={d.chip} onClick={() => setPerfil(f)}
                        style={sel ? { borderColor: corDe(f), background: corSuaveDe(f), color: 'var(--n-text)' } : undefined}>
                        <Letra f={f} />
                        {PERFIS[f].nome}
                        {pr.includes(f) && <span style={{ fontSize: 10, fontWeight: 800, color: `var(--disc-${f}-text)` }}>★</span>}
                      </button>
                    )
                  })}
                </div>
                <div className={d.abas} role="tablist" aria-label="Tema">
                  {ABAS.map((a) => (
                    <button key={a.k} type="button" role="tab" aria-selected={aba === a.k} className={d.aba} onClick={() => setAba(a.k)}
                      style={aba === a.k ? { borderBottomColor: corDe(perfil) } : undefined}>{a.rotulo}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--n-text-3)', marginBottom: 12 }}>
                  <b style={{ color: `var(--disc-${perfil}-text)` }}>{p.nome} · {p.apelido}</b> — {p.foco}
                  {!pr.includes(perfil) && <> · não é o predominante desta pessoa ({n[perfil]} pontos)</>}
                </div>
                <Conteudo p={p} aba={aba} />
              </div>

              {dados.historico.length > 0 && (
                <div className={d.bloco}>
                  <button type="button" onClick={() => setVerHistorico(!verHistorico)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--n-text)', cursor: 'pointer' }}>
                    <History size={15} /> Aplicações anteriores ({dados.historico.length}) {verHistorico ? '▴' : '▾'}
                  </button>
                  {verHistorico && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {dados.historico.map((h) => {
                        const hn = notasDe(h)
                        return (
                          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 12 }}>
                              <b>{diaBr(h.aplicadoEm)}</b>
                              <div style={{ color: 'var(--n-text-3)' }}>{nomeDoPerfil(predominantes(hn))} · por {h.registradoPorNome}</div>
                            </div>
                            <FaixaDisc n={hn} altura={20} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', lineHeight: 1.5 }}>
                {O_QUE_NAO_E} Visível só para a chefia do setor, a Diretoria e o T.I, e fora da pontuação e do PDF da ficha.
                <br />Adaptado do material do treinamento de liderança da IN-Formação Mentoria e Assessoria (09/2026).
              </div>
            </div>
          ) : (
            <div className={d.bloco} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Ainda não há resultado DISC registrado para esta pessoa.</div>
          )}
        </div>
      </div>
    </div>
  )
}
