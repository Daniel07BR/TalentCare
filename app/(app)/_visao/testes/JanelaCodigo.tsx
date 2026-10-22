'use client'
import { useEffect, useRef, useState } from 'react'
import { X, KeyRound, CheckCircle2 } from 'lucide-react'
import { diaBr, nomeDoPerfil, predominantes } from '@/lib/disc/calculo'
import { tituloDoTipo, linhaDaPersonalidade } from '@/lib/personalidade/calculo'
import { resumoDaBusca, resumoDaConferencia, NOME_DO_NIVEL, COR_DO_NIVEL, PROVAS } from '@/lib/testes/atencao'
import type { ResultadoDoCodigo } from '@/lib/testes/codigo'
import { TipoColorido } from '../personalidade/JanelaPersonalidade'
import { FaixaDisc } from '../disc/JanelaDisc'
import { avisarTestesMudaram } from './eventos'
import d from '../disc/disc.module.css'

/* ============================================================
   LANÇAR PELO CÓDIGO DOS TESTES (22/10/2026) — o código que a página do teste
   dá no "Concluir" ("9EE2-Q9R7-0YJE-1Y5Q").

   Pedido do Daniel: "crie tbm como o gestor inserir o codigo vindo da pesquisa
   aqui no talent care". Dois passos, de propósito: CONFERIR mostra o que o
   código traz (DISC, personalidade, atenção) e só SALVAR grava — código de outra
   pessoa se pega lendo o resultado, antes de ir para a ficha.
   ============================================================ */

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

function Titulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)', margin: '0 0 8px' }}>{children}</div>
}

export function SeloNivel({ nivel }: { nivel: 'alta' | 'media' | 'baixa' }) {
  const cor = COR_DO_NIVEL[nivel]
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)`, padding: '2px 9px', borderRadius: 20 }}>
      {NOME_DO_NIVEL[nivel]}
    </span>
  )
}

function Previa({ r }: { r: ResultadoDoCodigo }) {
  const n = r.disc
  const busca = r.busca ? resumoDaBusca(r.busca) : null
  const conf = r.conferencia ? resumoDaConferencia(r.conferencia) : null
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <div className={`${d.bloco} ${d.cores}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Titulo>DISC</Titulo>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{nomeDoPerfil(predominantes(n))}</div>
        <FaixaDisc n={n} altura={22} />
        <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>D {n.D} · I {n.I} · S {n.S} · C {n.C}</div>
      </div>
      <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Titulo>Personalidade</Titulo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TipoColorido tipo={r.tipo} tamanho={24} />
          <span style={{ fontSize: 15, fontWeight: 800 }}>{tituloDoTipo(r.tipo)}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>{linhaDaPersonalidade(r)}</div>
      </div>
      <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Titulo>Atenção</Titulo>
        {busca && conf ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span>{PROVAS.busca.nome}</span><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><SeloNivel nivel={busca.nivel} /> {busca.acerto}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span>{PROVAS.conferencia.nome}</span><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><SeloNivel nivel={conf.nivel} /> {conf.acerto}%</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Código antigo (9 caracteres): não traz a atenção.</div>
        )}
      </div>
    </div>
  )
}

export function JanelaCodigo({ pessoaId, nome, onFechar }: { pessoaId: string; nome: string; onFechar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [codigo, setCodigo] = useState('')
  const [previa, setPrevia] = useState<{ resultado: ResultadoDoCodigo; jaLancado: string | null } | null>(null)
  const [dia, setDia] = useState(hojeSP())
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [indo, setIndo] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    ref.current?.querySelector('input')?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const enviar = async (corpo: Record<string, unknown>) => {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/testes/codigo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pessoaId, codigo, ...corpo }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(j.error ?? 'Não foi possível.'); return null }
      return j as { resultado: ResultadoDoCodigo; jaLancado: string | null }
    } catch {
      setErro('Não foi possível. Verifique a conexão e tente de novo.')
      return null
    } finally {
      setIndo(false)
    }
  }

  const conferir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) { setErro('Digite o código.'); return }
    const j = await enviar({ previa: true })
    if (j) setPrevia(j)
  }
  const salvar = async () => {
    const j = await enviar({ aplicadoEm: dia, observacao: obs })
    if (j) { setSalvo(true); avisarTestesMudaram() }
  }

  return (
    <div className={d.fundo} onClick={onFechar}>
      <div ref={ref} className={d.janela} style={{ width: 'min(820px, 100%)', height: 'auto', maxHeight: '90vh' }} tabIndex={-1}
        role="dialog" aria-modal="true" aria-labelledby="cod-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={d.topo}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', fontWeight: 600 }}>Código dos testes · DISC, personalidade e atenção</div>
            <div id="cod-titulo" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginTop: 2 }}>{nome}</div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--n-border)', background: 'var(--n-card)', color: 'var(--n-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div className={d.corpo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {salvo && previa ? (
            <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--n-green)' }}>
                <CheckCircle2 size={18} /> Resultado gravado na ficha
              </div>
              <div style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Os botões DISC, Personalidade e Atenção já mostram o resultado novo; o anterior fica no histórico de cada um.</div>
              <button type="button" className={d.acao} onClick={onFechar} style={{ background: 'var(--n-blue)', color: '#fff' }}>Fechar</button>
            </div>
          ) : (
            <>
              <form onSubmit={conferir} className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>
                  Digite o código que apareceu no fim do teste (16 letras e números, como <b>K7Q2-M9XA-3B8C-D4EF</b>). Pode
                  digitar sem os traços; letra minúscula também vale.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className={d.campo} value={codigo} maxLength={24} placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="Código dos testes"
                    onChange={(e) => { setCodigo(e.target.value); setPrevia(null); setErro(null) }}
                    style={{ flex: '1 1 240px', fontSize: 18, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }} />
                  <button type="submit" className={d.acao} disabled={indo} style={{ background: previa ? 'var(--n-card-2)' : 'var(--n-blue)', color: previa ? 'var(--n-text)' : '#fff' }}>
                    <KeyRound size={15} /> {indo && !previa ? 'Conferindo…' : 'Conferir'}
                  </button>
                </div>
              </form>

              {previa && (
                <>
                  <Previa r={previa.resultado} />
                  {previa.jaLancado ? (
                    <div className={d.bloco} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>
                      Este código já está na ficha (lançado com a data de <b>{diaBr(previa.jaLancado)}</b>). Nada a gravar.
                    </div>
                  ) : (
                    <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
                          Dia em que fez o teste
                          <input className={d.campo} type="date" value={dia} max={hojeSP()} onChange={(e) => setDia(e.target.value)} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--n-text-2)' }}>
                          Observação (opcional)
                          <input className={d.campo} type="text" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: refez o teste" />
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className={d.acao} onClick={salvar} disabled={indo}
                          style={{ background: 'var(--n-blue)', color: '#fff', opacity: indo ? 0.7 : 1 }}>
                          {indo ? 'Salvando…' : 'Salvar na ficha'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {erro && <div role="alert" style={{ fontSize: 12.5, color: 'var(--n-red)', background: 'var(--n-red-soft)', padding: '8px 12px', borderRadius: 9 }}>{erro}</div>}
        </div>
      </div>
    </div>
  )
}
