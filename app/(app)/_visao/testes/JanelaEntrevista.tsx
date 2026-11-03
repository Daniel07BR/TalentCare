'use client'
import { useCallback, useEffect, useState } from 'react'
import { X, CheckCircle2, UserRound } from 'lucide-react'
import type { ResultadoDoCodigo } from '@/lib/testes/codigo'
import { Previa } from './JanelaCodigo'
import { avisarTestesMudaram } from './eventos'
import d from '../disc/disc.module.css'

/* ============================================================
   PUXAR DA ENTREVISTA (03/11/2026) — a ficha busca no Fluxo o resultado dos testes que
   a pessoa fez na entrevista de emprego. Ver `app/api/testes/entrevistas/route.ts`.

   Dois passos, como o código dos testes: ESCOLHER mostra o que a entrevista traz, e só
   PUXAR grava — resultado de outro candidato se pega lendo, antes de ir para a ficha.
   ============================================================ */

type Entrevista = {
  id: string; nome: string; vaga: string; setor: string; quando: string | null; entrevistador: string; parecido: number
  resultado: {
    disc: ResultadoDoCodigo['disc'] | null
    personalidade: { tipo: string; pct: number[] } | null
    atencao: { busca: NonNullable<ResultadoDoCodigo['busca']>; conferencia: NonNullable<ResultadoDoCodigo['conferencia']> } | null
  } | null
  ligada: { em: string | null; por: string } | null
}

const dia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''

function paraPrevia(e: Entrevista): ResultadoDoCodigo | null {
  const r = e.resultado
  if (!r?.disc || !r.personalidade) return null
  return {
    versao: 2, codigo: '', disc: r.disc, tipo: r.personalidade.tipo, pct: r.personalidade.pct,
    busca: r.atencao?.busca ?? null, conferencia: r.atencao?.conferencia ?? null,
  }
}

export function JanelaEntrevista({ pessoaId, nome, onFechar }: { pessoaId: string; nome: string; onFechar: () => void }) {
  const [lista, setLista] = useState<Entrevista[] | null>(null)
  const [todas, setTodas] = useState(false)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [indo, setIndo] = useState(false)
  const [feito, setFeito] = useState<null | 'puxou' | 'desfez'>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/testes/entrevistas?id=${encodeURIComponent(pessoaId)}`, { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(j.error ?? 'Não foi possível buscar as entrevistas.'); setLista([]); return }
      setLista(j.entrevistas ?? [])
      setTodas(!!j.todas)
    } catch {
      setErro('Não foi possível buscar as entrevistas. Verifique a conexão.')
      setLista([])
    }
  }, [pessoaId])
  useEffect(() => { void carregar() }, [carregar])

  const agir = async (acao: 'vincular' | 'desfazer', entrevista: string) => {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/testes/entrevistas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pessoaId, acao, entrevista, motivo }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(j.error ?? 'Não foi possível.'); return }
      setFeito(acao === 'vincular' ? 'puxou' : 'desfez')
      avisarTestesMudaram()
    } catch {
      setErro('Não foi possível. Verifique a conexão e tente de novo.')
    } finally {
      setIndo(false)
    }
  }

  return (
    <div className={d.fundo} onClick={onFechar}>
      <div className={d.janela} style={{ width: 'min(820px, 100%)', height: 'auto', maxHeight: '90vh' }} tabIndex={-1}
        role="dialog" aria-modal="true" aria-labelledby="ent-titulo" onClick={(e) => e.stopPropagation()}>
        <div className={d.topo}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', fontWeight: 600 }}>Puxar o resultado da entrevista de emprego</div>
            <div id="ent-titulo" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', marginTop: 2 }}>{nome}</div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--n-border)', background: 'var(--n-card)', color: 'var(--n-text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div className={d.corpo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feito ? (
            <div className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--n-green)' }}>
                <CheckCircle2 size={18} /> {feito === 'puxou' ? 'Resultado ligado à ficha' : 'Resultado retirado da ficha'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--n-text-2)' }}>
                {feito === 'puxou'
                  ? 'Os botões DISC, Personalidade e Atenção já mostram o resultado da entrevista.'
                  : 'A entrevista volta a ficar livre para ser ligada à pessoa certa.'}
              </div>
              <button type="button" className={d.acao} onClick={onFechar} style={{ background: 'var(--n-blue)', color: '#fff' }}>Fechar</button>
            </div>
          ) : lista === null ? (
            <div style={{ fontSize: 13, color: 'var(--n-text-3)' }}>Buscando as entrevistas…</div>
          ) : lista.length === 0 && !erro ? (
            <div className={d.bloco} style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>
              Nenhuma entrevista {todas ? '' : 'sua '}com resultado de testes para ligar. Se esta pessoa entrevistou com outro
              gestor, é ele quem puxa. Quem ainda não fez o teste pode fazer agora: use <b>Baixar os testes</b> e lance em <b>Código dos testes</b>.
            </div>
          ) : (
            <>
              {lista.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--n-text-2)' }}>
                  {todas ? 'As entrevistas com resultado de testes.' : 'As entrevistas que você fez, com resultado de testes.'} Escolha a desta pessoa:
                </div>
              )}
              {lista.map((e) => {
                const aberta = escolhida === e.id
                const previa = paraPrevia(e)
                return (
                  <div key={e.id} className={d.bloco} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, overflow: 'hidden' }}>
                    <button type="button" onClick={() => { setEscolhida(aberta ? null : e.id); setMotivo(''); setErro(null) }} aria-expanded={aberta}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit' }}>
                      <UserRound size={17} style={{ color: 'var(--n-text-3)', flex: 'none' }} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{e.nome}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--n-text-3)' }}>
                          {[e.vaga, e.setor, e.quando ? `entrevista em ${dia(e.quando)}` : '', e.entrevistador ? `com ${e.entrevistador}` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {e.ligada
                        ? <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--n-green)', flex: 'none' }}>Já na ficha</span>
                        : e.parecido > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--n-blue)', flex: 'none' }}>Nome parecido</span>}
                    </button>
                    {aberta && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 14px 14px' }}>
                        {previa
                          ? <Previa r={previa} />
                          : <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>
                            {e.resultado ? 'Esta entrevista tem só parte dos testes: entra o que foi lançado.' : 'Pela sua régua, o resultado de candidato não aparece aqui: ele entra direto na ficha.'}
                          </div>}
                        {e.ligada ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input className={d.campo} style={{ flex: '1 1 260px' }} value={motivo} maxLength={300} onChange={(x) => setMotivo(x.target.value)}
                              placeholder={`Ligado por ${e.ligada.por || 'alguém'}. Por que desfazer?`} aria-label="Motivo para desfazer" />
                            <button type="button" className={d.acao} disabled={indo || !motivo.trim()} onClick={() => agir('desfazer', e.id)}
                              style={{ background: 'var(--n-card-2)', color: 'var(--n-text)', opacity: indo || !motivo.trim() ? 0.6 : 1 }}>
                              {indo ? 'Desfazendo…' : 'Não é esta pessoa'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className={d.acao} disabled={indo} onClick={() => agir('vincular', e.id)}
                              style={{ background: 'var(--n-blue)', color: '#fff', opacity: indo ? 0.7 : 1 }}>
                              {indo ? 'Puxando…' : `Puxar para a ficha de ${nome.split(' ')[0]}`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
          {erro && <div role="alert" style={{ fontSize: 12.5, color: 'var(--n-red)', background: 'var(--n-red-soft)', padding: '8px 12px', borderRadius: 9 }}>{erro}</div>}
        </div>
      </div>
    </div>
  )
}
