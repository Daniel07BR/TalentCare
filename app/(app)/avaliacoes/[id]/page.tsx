'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '../../Avatar'
import {
  CRITERIOS, ANCORAS, ancoraDe, exigeJustificativa, mediaDe,
  competenciaLabel, competenciaAnterior,
} from '@/lib/avaliacoes/criterios'

type NotaEnt = { nota: number | null; justificativa: string | null }
type Dados = {
  competencia: string
  pessoa: { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean; nexusUserId: string | null }
  posso: boolean
  souEu: boolean
  aguardandoPublicacao: boolean
  avaliacao: null | {
    id: string; status: string; versao: number; media: number | null
    comentario: string | null; publishedAt: string | null; avaliadorId: string
    notas: Record<string, NotaEnt>
    ciencia: { cienteEm: string; comentario: string | null; versaoCiente: number; lidoEm: string | null } | null
    versoes: { versao: number; motivo: string | null; media: number | null; publishedAt: string | null }[]
  }
}

export default function AvaliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const sp = useSearchParams()
  const competencia = sp.get('competencia') || competenciaAnterior()

  const [d, setD] = useState<Dados | null>(null)
  const [notas, setNotas] = useState<Record<string, NotaEnt>>({})
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'' | 'rascunho' | 'publicar'>('')
  const [ok, setOk] = useState<string | null>(null)

  const carregar = useCallback(() => {
    fetch(`/api/avaliacoes/${id}?competencia=${competencia}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Dados | null) => {
        setD(j)
        setNotas(j?.avaliacao?.notas ?? {})
        setComentario(j?.avaliacao?.comentario ?? '')
      })
  }, [id, competencia])

  useEffect(() => { carregar() }, [carregar])

  if (!d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Carregando…</div>

  const jaPublicada = d.avaliacao?.status === 'publicada'
  const somenteLeitura = !d.posso
  const lista = CRITERIOS.map((c) => ({ c, v: notas[c.key] ?? { nota: null, justificativa: null } }))
  const media = mediaDe(lista.map((l) => ({ nota: l.v.nota })))
  const preenchidos = lista.filter((l) => l.v.nota !== null).length
  const pendentesJust = lista.filter((l) => exigeJustificativa(l.v.nota) && !(l.v.justificativa ?? '').trim())

  const setNota = (k: string, n: number | null) =>
    setNotas((p) => ({ ...p, [k]: { nota: n, justificativa: p[k]?.justificativa ?? null } }))
  const setJust = (k: string, j: string) =>
    setNotas((p) => ({ ...p, [k]: { nota: p[k]?.nota ?? null, justificativa: j } }))

  async function salvar(acao: 'rascunho' | 'publicar') {
    setErro(null); setOk(null); setSalvando(acao)
    const r = await fetch(`/api/avaliacoes/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competencia, acao, notas, comentario, motivo }),
    })
    const j = await r.json()
    setSalvando('')
    if (!r.ok) { setErro(j.detalhe || j.error || 'Não deu para salvar.'); return }
    setOk(acao === 'publicar' ? (j.corrigida ? 'Correção publicada.' : 'Avaliação publicada.') : 'Rascunho salvo.')
    setMotivo('')
    carregar()
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 980, margin: '0 auto' }}>
      <button onClick={() => router.push(`/avaliacoes?competencia=${competencia}`)} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar às avaliações</button>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, marginBottom: 16, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar id={d.pessoa.id} hasAvatar={d.pessoa.hasAvatar} initials={d.pessoa.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={60} radius={16} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.4px' }}>{d.pessoa.nome}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{d.pessoa.cargo} · {d.pessoa.setor}</div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 6 }}>Competência de <b>{competenciaLabel(competencia)}</b></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>Nota do mês</div>
          <div className="cnum" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', color: media != null ? ancoraDe(media).color : 'var(--text-mute)' }}>
            {media != null ? media.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{preenchidos} de {CRITERIOS.length} critérios</div>
        </div>
        <button onClick={() => router.push(`/funcionarios/${d.pessoa.id}`)} className="tc-btn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '8px 14px', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          Ver a ficha completa
        </button>
      </div>

      {/*
        ⚠️⚠️ O aviso mais importante da tela. O score é calculado da atividade
        registrada nos 8 sistemas; a nota é julgamento de gente. Sem dizer isto
        aqui, o gestor lê o score como "a resposta certa" e transcreve — e a
        avaliação deixa de acrescentar qualquer coisa ao que o sistema já sabia.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginBottom: 16, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
        <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
        <span>
          A <b>ficha</b> mostra a atividade que os sistemas registraram. Esta nota é <b>o que você
          observou</b> — as duas ficam lado a lado no gráfico de propósito: quando elas discordam,
          é aí que há algo a conversar.
        </span>
      </div>

      {d.aguardandoPublicacao && (
        <Aviso cor="var(--warning)">Há uma avaliação em rascunho, ainda não publicada. Ela só aparece quando o avaliador publicar.</Aviso>
      )}
      {somenteLeitura && !d.aguardandoPublicacao && !d.avaliacao && (
        <Aviso cor="var(--text-mute)">Ainda não há avaliação nesta competência.</Aviso>
      )}
      {somenteLeitura && d.souEu && (
        <Aviso cor="var(--info)">Esta é a sua avaliação. Você pode registrar ciência e comentar na sua página.</Aviso>
      )}

      {(d.posso || (d.avaliacao && jaPublicada)) && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Avaliação de {competenciaLabel(competencia)}</div>
            {jaPublicada && (
              <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>
                Publicada{d.avaliacao!.versao > 1 ? ` · versão ${d.avaliacao!.versao}` : ''}
                {d.avaliacao!.ciencia?.cienteEm ? ' · a pessoa já leu' : ' · aguardando ciência'}
              </div>
            )}
          </div>

          {/* As âncoras: sem elas o 0–10 vira 8 para todo mundo em três meses. */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20, fontSize: 11, color: 'var(--text-mute)' }}>
            {ANCORAS.map((a, i) => (
              <span key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                {i === 0 ? '0' : ANCORAS[i - 1].ate + 1}–{a.ate} {a.label}
              </span>
            ))}
          </div>

          {lista.map(({ c, v }) => {
            const precisa = exigeJustificativa(v.nota)
            return (
              <div key={c.key} style={{ padding: '14px 0', borderTop: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {c.label}
                      {!c.sempre && <span style={{ fontSize: 10.5, color: 'var(--text-mute)', fontWeight: 500, marginLeft: 7 }}>pode não se aplicar</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    {Array.from({ length: 11 }, (_, n) => (
                      <button key={n} disabled={somenteLeitura} onClick={() => setNota(c.key, n)}
                        title={ancoraDe(n).label}
                        style={{
                          width: 27, height: 30, borderRadius: 6, cursor: somenteLeitura ? 'default' : 'pointer',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                          border: `1px solid ${v.nota === n ? ancoraDe(n).color : 'var(--border)'}`,
                          background: v.nota === n ? ancoraDe(n).color : 'var(--surface-2)',
                          color: v.nota === n ? '#fff' : 'var(--text-dim)',
                        }}>{n}</button>
                    ))}
                    {/* ⚠️ "Não se aplica" é um botão de verdade, e não o campo em
                        branco: um 7 inventado para preencher entra na média como
                        se fosse observação. */}
                    <button disabled={somenteLeitura} onClick={() => setNota(c.key, null)}
                      style={{
                        marginLeft: 6, padding: '0 10px', height: 30, borderRadius: 6, cursor: somenteLeitura ? 'default' : 'pointer',
                        fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                        border: `1px solid ${v.nota === null ? 'var(--text-mute)' : 'var(--border)'}`,
                        background: v.nota === null ? 'var(--surface-3, var(--surface-2))' : 'transparent',
                        color: 'var(--text-mute)',
                      }}>não se aplica</button>
                  </div>
                </div>
                {(precisa || (v.justificativa ?? '').trim()) && (
                  <div style={{ marginTop: 9 }}>
                    <textarea
                      disabled={somenteLeitura}
                      value={v.justificativa ?? ''}
                      onChange={(e) => setJust(c.key, e.target.value)}
                      placeholder={precisa ? `Nota ${v.nota} precisa de uma linha explicando — é o que sustenta essa nota daqui a seis meses.` : 'Observação (opcional)'}
                      rows={2}
                      style={{
                        width: '100%', background: 'var(--surface-2)', color: 'var(--text)',
                        border: `1px solid ${precisa && !(v.justificativa ?? '').trim() ? 'var(--warning)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '8px 11px', fontSize: 12.5,
                        fontFamily: 'inherit', resize: 'vertical',
                      }} />
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7 }}>Recado do mês <span style={{ fontWeight: 500, color: 'var(--text-mute)' }}>· opcional, a pessoa vai ler</span></div>
            <textarea disabled={somenteLeitura} value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
              placeholder="O que ela fez bem, e o que você espera dela no mês que vem."
              style={{ width: '100%', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>

          {/* Correção de publicada exige motivo — as duas versões ficam visíveis. */}
          {jaPublicada && !somenteLeitura && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>Corrigir uma avaliação já publicada</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>
                A pessoa pode já ter lido. A versão anterior <b>continua visível para ela</b>, junto com o motivo — uma nota que se reescreve em silêncio não é registro.
              </div>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O que mudou e por quê"
                style={{ width: '100%', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 11px', fontSize: 12.5, fontFamily: 'inherit' }} />
            </div>
          )}

          {erro && <Aviso cor="var(--danger)">{erro}</Aviso>}
          {ok && <Aviso cor="var(--success)">{ok}</Aviso>}

          {!somenteLeitura && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => salvar('rascunho')} disabled={!!salvando} className="tc-btn"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {salvando === 'rascunho' ? 'Salvando…' : 'Salvar rascunho'}
              </button>
              <button onClick={() => salvar('publicar')} disabled={!!salvando || preenchidos === 0} className="tc-btn"
                style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '9px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: preenchidos === 0 ? 'not-allowed' : 'pointer', opacity: preenchidos === 0 ? 0.5 : 1 }}>
                {salvando === 'publicar' ? 'Publicando…' : jaPublicada ? 'Publicar correção' : 'Publicar avaliação'}
              </button>
              <span style={{ fontSize: 11.5, color: pendentesJust.length ? 'var(--warning)' : 'var(--text-mute)' }}>
                {pendentesJust.length > 0
                  ? `Falta justificar: ${pendentesJust.map((p) => p.c.label).join(', ')}`
                  : 'Rascunho fica invisível para a pessoa. Publicar mostra a ela.'}
              </span>
            </div>
          )}

          {/* Histórico de correções */}
          {d.avaliacao && d.avaliacao.versoes.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-dim)' }}>Versões anteriores</div>
              {d.avaliacao.versoes.map((v) => (
                <div key={v.versao} style={{ fontSize: 11.5, color: 'var(--text-mute)', padding: '5px 0', display: 'flex', gap: 10 }}>
                  <b>v{v.versao}</b>
                  <span>média {v.media?.toFixed(1) ?? '—'}</span>
                  <span style={{ flex: 1 }}>{v.motivo}</span>
                  <span>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('pt-BR') : ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* O que a pessoa respondeu */}
          {d.avaliacao?.ciencia && (
            <div style={{ marginTop: 18, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--info)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                {d.pessoa.nome.split(' ')[0]} deu ciência em {new Date(d.avaliacao.ciencia.cienteEm).toLocaleDateString('pt-BR')}
                {d.avaliacao.ciencia.versaoCiente < d.avaliacao.versao && <span style={{ color: 'var(--warning)', fontWeight: 500 }}> · da versão {d.avaliacao.ciencia.versaoCiente}, anterior à correção</span>}
              </div>
              {d.avaliacao.ciencia.comentario && (
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.avaliacao.ciencia.comentario}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const Aviso = ({ cor, children }: { cor: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderLeft: `3px solid ${cor}`, borderRadius: 'var(--radius-sm)', padding: '10px 13px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
    {children}
  </div>
)
