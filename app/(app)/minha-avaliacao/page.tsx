'use client'
import { useEffect, useState, useCallback } from 'react'
import Avatar from '../Avatar'
import { CRITERIOS, criterioDe, NIVEIS, competenciaLabel } from '@/lib/avaliacoes/criterios'

const nivelPor = (k: string | null) => NIVEIS.find((n) => n.key === k) ?? null
import { significado, METODO_RESUMO, itensDoCombinado, type ReguaDoSetor } from '@/lib/avaliacoes/metodo'
import { BotaoTermo } from '../avaliacoes/TermoImpresso'
import { MetodoCientifico } from '../avaliacoes/MetodoCientifico'

type Nota = { criterio: string; nivel: string | null; justificativa: string | null }
type Av = {
  id: string; competencia: string; media: number | null; nivel: string | null; versao: number
  comentario: string | null; combinado: string | null; publishedAt: string | null
  avaliador: string; avaliadorCargo: string | null
  regua: ReguaDoSetor
  concluidaEm: string | null
  soPdf: boolean
  notas: Nota[]
  ciencia: { cienteEm: string; comentario: string | null; versaoCiente: number; lidoEm: string | null } | null
  precisaCienciaNova: boolean
  versoes: { versao: number; motivo: string | null; nivel: string | null; publishedAt: string | null }[]
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
    nivel: nivelPor(d.avaliacoes.find((a) => a.competencia === c)?.nivel ?? null),
  }))
  const comNota = serie.filter((s) => s.nivel != null)

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
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-mute)' }}>
              {comNota.length} {comNota.length === 1 ? 'mês avaliado' : 'meses avaliados'}
            </div>
          )}
        </div>
      )}

      {/* A base científica nasce ABERTA aqui: é na página de quem é avaliado que a
          resistência mora (02/10/2026). */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{METODO_RESUMO}</p>
        <MetodoCientifico abertoDeInicio />
      </div>

      {d.avaliacoes.length === 0 ? (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhuma avaliação publicada ainda</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Quando o seu gestor publicar a avaliação do mês, ela aparece aqui — com o nível de cada
            ponto e o motivo. Você vai poder registrar ciência e responder.
          </div>
        </div>
      ) : (
        <>
          {/* Evolução — mês sem avaliação fica em branco, de propósito. */}
          <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Evolução</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 16 }}>
              O resultado de cada mês. Quadro vazio = mês sem avaliação publicada.
            </div>
            {/* ⚠️ Sem altura de barra: a altura É o número (02/10/2026). Cada mês é um
                quadro na cor do nível, com o nome curto dele. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(58px, 1fr))', gap: 6 }}>
              {serie.map((s) => (
                <button key={s.competencia} type="button" onClick={() => s.nivel && setAberta(s.competencia)}
                  title={`${competenciaLabel(s.competencia)} · ${s.nivel ? s.nivel.label : 'sem avaliação'}`}
                  style={{ all: 'unset', cursor: s.nivel ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: '100%', height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: s.nivel ? `color-mix(in srgb, ${s.nivel.color} 16%, var(--surface))` : 'var(--surface-2)',
                    color: s.nivel ? s.nivel.color : 'var(--text-mute)',
                    border: s.competencia === atual?.competencia ? `2px solid ${s.nivel?.color ?? 'var(--accent)'}` : '1px solid var(--border-soft)',
                  }}>{s.nivel ? s.nivel.curto : ''}</span>
                  <span style={{ fontSize: 9.5, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>{s.competencia.slice(5)}/{s.competencia.slice(2, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          {atual && <Detalhe av={atual} pessoaId={d.pessoa!.id} souEu={d.souEu} texto={texto} setTexto={setTexto} enviando={enviando} onCiencia={() => darCiencia(atual)} />}
        </>
      )}
    </div>
  )
}

function Detalhe({ av, pessoaId, souEu, texto, setTexto, enviando, onCiencia }: {
  av: Av; pessoaId: string; souEu: boolean; texto: string; setTexto: (s: string) => void
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <BotaoTermo avaliadoId={pessoaId} competencia={av.competencia} />
          {nivelPor(av.nivel) && (
            <div style={{ fontSize: 17, fontWeight: 800, color: nivelPor(av.nivel)!.color }}>{nivelPor(av.nivel)!.label}</div>
          )}
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
              {nivelPor(n.nivel) ? (
                /* O NOME do nível, num selo da cor dele — sem barra: a largura da barra era o número. */
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: nivelPor(n.nivel)!.color, background: `color-mix(in srgb, ${nivelPor(n.nivel)!.color} 14%, var(--surface))` }}>{nivelPor(n.nivel)!.label}</span>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>não se aplica</span>
              )}
            </div>
            {/* O que o nível escolhido SIGNIFICA no setor — a régua que a pessoa conhecia. */}
            {n.nivel && (
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>{significado(av.regua, c.key, n.nivel)}</div>
            )}
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

      {av.concluidaEm && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-dim)' }}>
          🔒 Concluída em {new Date(av.concluidaEm).toLocaleDateString('pt-BR')} com o documento assinado
          {(av.soPdf ? [['pdf', 'ver o PDF']] : [['frente', 'ver frente'], ['verso', 'ver verso']]).map(([lado, rotulo]) => (
            <span key={lado}>{' · '}<a href={`/api/avaliacoes/${pessoaId}/documento?competencia=${av.competencia}&lado=${lado}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{rotulo}</a></span>
          ))}
        </div>
      )}

      {av.combinado && (
        <div style={{ marginTop: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-mute)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px' }}>Combinados para o próximo mês</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65 }}>
            {itensDoCombinado(av.combinado).map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </div>
      )}

      {av.versoes.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-mute)' }}>
          <b style={{ color: 'var(--text-dim)' }}>Esta avaliação foi corrigida.</b> O que ela dizia antes continua registrado:
          {av.versoes.map((v) => (
            <div key={v.versao} style={{ paddingTop: 4 }}>· v{v.versao}{nivelPor(v.nivel) ? ` · ${nivelPor(v.nivel)!.label}` : ''} — {v.motivo}</div>
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
            não altera o resultado, fica ao lado dele.
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
