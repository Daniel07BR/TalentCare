'use client'
import { useEffect, useState, useCallback } from 'react'
import Avatar from '../Avatar'
import { CRITERIOS, criterioDe, ancoraDe, competenciaLabel } from '@/lib/avaliacoes/criterios'

type Nota = { criterio: string; nota: number | null; justificativa: string | null }
type Av = {
  id: string; competencia: string; media: number | null; versao: number
  comentario: string | null; publishedAt: string | null
  avaliador: string; avaliadorCargo: string | null
  notas: Nota[]
  ciencia: { cienteEm: string; comentario: string | null; versaoCiente: number; lidoEm: string | null } | null
  precisaCienciaNova: boolean
  versoes: { versao: number; motivo: string | null; media: number | null; publishedAt: string | null }[]
}
type Dados = {
  pessoa: { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean } | null
  souEu: boolean
  esperadas: string[]
  avaliacoes: Av[]
}

export default function MinhaAvaliacaoPage() {
  const [d, setD] = useState<Dados | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(() => {
    fetch('/api/minha-avaliacao', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Dados | null) => {
        setD(j)
        if (j?.avaliacoes[0] && aberta === null) setAberta(j.avaliacoes[0].competencia)
      })
  }, [aberta])

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Carregando…</div>

  const atual = d.avaliacoes.find((a) => a.competencia === aberta) ?? d.avaliacoes[0] ?? null

  async function darCiencia(av: Av) {
    setEnviando(true)
    await fetch(`/api/avaliacoes/${d!.pessoa!.id}/ciencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competencia: av.competencia, comentario: texto }),
    })
    setEnviando(false)
    setTexto('')
    carregar()
  }

  // Série do gráfico: meses esperados, do mais velho ao mais novo. Mês SEM
  // avaliação aparece como buraco de propósito — escondê-lo faria o gráfico
  // mentir por omissão sobre a regularidade da avaliação.
  const serie = [...d.esperadas].reverse().map((c) => ({
    competencia: c,
    media: d.avaliacoes.find((a) => a.competencia === c)?.media ?? null,
  }))
  const comNota = serie.filter((s) => s.media != null)

  return (
    <div className="tc-anim" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
          {d.souEu ? 'A sua avaliação' : `Avaliações de ${d.pessoa?.nome}`}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Meu desempenho</h1>
      </div>

      {d.pessoa && (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar id={d.pessoa.id} hasAvatar={d.pessoa.hasAvatar} initials={d.pessoa.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={54} radius={15} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{d.pessoa.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{d.pessoa.cargo} · {d.pessoa.setor}</div>
          </div>
          {comNota.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>Média de {comNota.length} {comNota.length === 1 ? 'mês' : 'meses'}</div>
              <div className="cnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: 'var(--accent)' }}>
                {(comNota.reduce((a, s) => a + (s.media ?? 0), 0) / comNota.length).toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {d.avaliacoes.length === 0 ? (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma avaliação publicada ainda</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Quando o seu gestor publicar a avaliação do mês, ela aparece aqui — com a nota de cada
            critério e o motivo. Você vai poder registrar ciência e responder.
          </div>
        </div>
      ) : (
        <>
          {/* Evolução — mês sem avaliação fica em branco, de propósito. */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Evolução</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 16 }}>
              Média de cada mês. Coluna vazia = mês sem avaliação publicada.
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 110 }}>
              {serie.map((s) => (
                <div key={s.competencia} onClick={() => s.media != null && setAberta(s.competencia)}
                  title={`${competenciaLabel(s.competencia)}${s.media != null ? ` · ${s.media.toFixed(1)}` : ' · sem avaliação'}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', cursor: s.media != null ? 'pointer' : 'default' }}>
                  <span className="cnum" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3 }}>{s.media != null ? s.media.toFixed(1) : ''}</span>
                  <div style={{
                    width: '100%', height: s.media != null ? `${Math.max(4, (s.media / 10) * 80)}px` : 3,
                    background: s.media != null ? ancoraDe(s.media).color : 'var(--border-soft)',
                    borderRadius: '4px 4px 0 0',
                    outline: s.competencia === atual?.competencia ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 1,
                  }} />
                  <span style={{ fontSize: 9.5, color: 'var(--text-mute)', marginTop: 5, whiteSpace: 'nowrap' }}>
                    {s.competencia.slice(5)}/{s.competencia.slice(2, 4)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {atual && <Detalhe av={atual} souEu={d.souEu} texto={texto} setTexto={setTexto} enviando={enviando} onCiencia={() => darCiencia(atual)} />}
        </>
      )}
    </div>
  )
}

function Detalhe({ av, souEu, texto, setTexto, enviando, onCiencia }: {
  av: Av; souEu: boolean; texto: string; setTexto: (s: string) => void
  enviando: boolean; onCiencia: () => void
}) {
  const precisaResponder = souEu && (!av.ciencia || av.precisaCienciaNova)
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{competenciaLabel(av.competencia)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>
            Avaliada por {av.avaliador}{av.avaliadorCargo ? ` · ${av.avaliadorCargo}` : ''}
            {av.publishedAt ? ` · ${new Date(av.publishedAt).toLocaleDateString('pt-BR')}` : ''}
            {av.versao > 1 ? ` · versão ${av.versao}` : ''}
          </div>
        </div>
        <div className="cnum" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1.4px', color: av.media != null ? ancoraDe(av.media).color : 'var(--text-mute)' }}>
          {av.media != null ? av.media.toFixed(1) : '—'}
        </div>
      </div>

      {CRITERIOS.map((c) => {
        const n = av.notas.find((x) => x.criterio === c.key)
        if (!n) return null
        return (
          <div key={c.key} style={{ padding: '11px 0', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{criterioDe(c.key)?.label}</div>
              </div>
              {n.nota != null ? (
                <>
                  <div style={{ width: 130, height: 6, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${n.nota * 10}%`, background: ancoraDe(n.nota).color, borderRadius: 4 }} />
                  </div>
                  <span className="cnum" style={{ width: 28, textAlign: 'right', fontSize: 15, fontWeight: 700, color: ancoraDe(n.nota).color }}>{n.nota}</span>
                </>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>não se aplica</span>
              )}
            </div>
            {n.justificativa && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.55, paddingLeft: 2, borderLeft: '2px solid var(--border-soft)', paddingInlineStart: 9 }}>
                {n.justificativa}
              </div>
            )}
          </div>
        )
      })}

      {av.comentario && (
        <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-mute)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px' }}>Recado do mês</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{av.comentario}</div>
        </div>
      )}

      {av.versoes.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-mute)' }}>
          <b style={{ color: 'var(--text-dim)' }}>Esta avaliação foi corrigida.</b> O que ela dizia antes continua registrado:
          {av.versoes.map((v) => (
            <div key={v.versao} style={{ paddingTop: 4 }}>· v{v.versao} · média {v.media?.toFixed(1) ?? '—'} — {v.motivo}</div>
          ))}
        </div>
      )}

      {/* ⚠️ O comentário fica AO LADO da nota, e não muda a nota. Deixar a
          reação alterar o número transformaria a avaliação em negociação. */}
      {av.ciencia && !av.precisaCienciaNova && (
        <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            ✓ Você deu ciência em {new Date(av.ciencia.cienteEm).toLocaleDateString('pt-BR')}
            {av.ciencia.lidoEm && <span style={{ fontWeight: 500, color: 'var(--text-mute)' }}> · o avaliador leu a sua resposta</span>}
          </div>
          {av.ciencia.comentario && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{av.ciencia.comentario}</div>}
        </div>
      )}

      {precisaResponder && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          {av.precisaCienciaNova && (
            <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 9 }}>
              Esta avaliação foi corrigida depois da sua ciência. Confirme que leu a versão nova.
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>O que você tem a dizer</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 9, lineHeight: 1.55 }}>
            Opcional. O seu avaliador vai ler, e o texto fica registrado junto da avaliação — ele
            não altera a nota, fica ao lado dela.
          </div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
            placeholder="Concorda? Discorda de algum ponto? Quer contar algo que o mês não mostrou?"
            style={{ width: '100%', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
          <button onClick={onCiencia} disabled={enviando} className="tc-btn"
            style={{ marginTop: 11, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '10px 22px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            {enviando ? 'Registrando…' : texto.trim() ? 'Li e quero responder isto' : 'Li e estou ciente'}
          </button>
        </div>
      )}
    </div>
  )
}
