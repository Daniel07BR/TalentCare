'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '../../Avatar'
import {
  CRITERIOS, NIVEIS, ancoraDe, nivelDe, exigeJustificativa, mediaDe,
  competenciaLabel, competenciaAnterior,
} from '@/lib/avaliacoes/criterios'
import {
  significado, METODO_PONTOS, METODO_REFERENCIA, PERGUNTAS_GESTAO,
  type ReguaDoSetor, type Gestao,
} from '@/lib/avaliacoes/metodo'
import { BotaoTermo } from '../TermoImpresso'
import st from './avaliar.module.css'

const GESTAO_VAZIA: Gestao = { querNaEquipe: null, prontoParaMais: null, emRisco: null, anotacao: null }

type NotaEnt = { nota: number | null; justificativa: string | null }
type Dados = {
  competencia: string
  pessoa: { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean; nexusUserId: string | null }
  posso: boolean
  souEu: boolean
  aguardandoPublicacao: boolean
  regua: ReguaDoSetor
  gestaoVisivel: boolean
  avaliacao: null | {
    id: string; status: string; versao: number; media: number | null
    comentario: string | null; combinado: string | null; publishedAt: string | null; avaliadorId: string
    gestao: Gestao | null
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
  const [combinado, setCombinado] = useState('')
  const [gestao, setGestao] = useState<Gestao>(GESTAO_VAZIA)
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
        setCombinado(j?.avaliacao?.combinado ?? '')
        setGestao(j?.avaliacao?.gestao ?? GESTAO_VAZIA)
      })
  }, [id, competencia])

  useEffect(() => { carregar() }, [carregar])

  if (!d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Carregando…</div>

  const jaPublicada = d.avaliacao?.status === 'publicada'
  const somenteLeitura = !d.posso
  const lista = CRITERIOS.map((c) => ({ c, v: notas[c.key] ?? { nota: null, justificativa: null } }))
  const media = mediaDe(lista.map((l) => ({ nota: l.v.nota })))
  const pendentesJust = lista.filter((l) => exigeJustificativa(l.v.nota) && !(l.v.justificativa ?? '').trim())

  const faltaNivel = lista.filter((l) => l.v.nota === null)
  const nivelMedia = media != null ? nivelDe(media) : null

  // Clicar de novo no nível escolhido desmarca (o rascunho pode ficar pela metade).
  const setNota = (k: string, n: number | null) =>
    setNotas((p) => ({ ...p, [k]: { nota: p[k]?.nota === n ? null : n, justificativa: p[k]?.justificativa ?? null } }))
  const setJust = (k: string, j: string) =>
    setNotas((p) => ({ ...p, [k]: { nota: p[k]?.nota ?? null, justificativa: j } }))

  async function salvar(acao: 'rascunho' | 'publicar') {
    setErro(null); setOk(null); setSalvando(acao)
    const r = await fetch(`/api/avaliacoes/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competencia, acao, notas, comentario, combinado, motivo, gestao }),
    })
    const j = await r.json()
    setSalvando('')
    if (!r.ok) { setErro(j.detalhe || j.error || 'Não deu para salvar.'); return }
    setOk(acao === 'publicar' ? (j.corrigida ? 'Correção publicada.' : 'Avaliação publicada.') : 'Rascunho salvo.')
    setMotivo('')
    carregar()
  }

  const primeiro = d.pessoa.nome.split(' ')[0]
  const voltar = () => router.push(`/avaliacoes?competencia=${competencia}${sp.get('setor') ? `&setor=${sp.get('setor')}` : ''}`)

  return (
    <div className={`tc-anim ${st.pagina}`}>
      {/* A volta leva o SETOR de onde se veio — a lista abre dentro do setor (11/09/2026). */}
      <button onClick={voltar} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 16 }}>‹ Voltar às avaliações</button>

      <div className={st.grade}>
        {/* ---------- À ESQUERDA: quem e quanto (fica parada ao rolar) ---------- */}
        <aside className={st.lado}>
          <div className={`tc-card ${st.cartao} ${st.pessoa}`}>
            <Avatar id={d.pessoa.id} hasAvatar={d.pessoa.hasAvatar} initials={d.pessoa.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={84} radius={22} />
            <div>
              <h1 className={st.nome}>{d.pessoa.nome}</h1>
              <div className={st.cargo}>{d.pessoa.cargo} · {d.pessoa.setor}</div>
            </div>
            <span className={st.competencia}>Competência de <b>{competenciaLabel(competencia)}</b></span>

            <div className={st.nota}>
              <span className={st.notaRotulo}>Nota do mês</span>
              <span className="cnum" style={{ color: nivelMedia ? nivelMedia.color : 'var(--text-mute)' }}>
                <span className={st.notaValor}>{media != null ? media.toFixed(1) : '—'}</span>
              </span>
              <span className={st.notaNivel} style={{ color: nivelMedia ? nivelMedia.color : 'var(--text-mute)' }}>
                {nivelMedia ? ancoraDe(media!).label : 'escolha os níveis ao lado'}
              </span>
              <div className={st.progresso}>
                {lista.map(({ c, v }) => {
                  const nv = v.nota != null ? nivelDe(v.nota) : null
                  return (
                    <div key={c.key} className={st.progressoLinha}>
                      <span className={st.ponto} style={{ background: nv ? nv.color : 'var(--surface-3)' }} />
                      <span className={st.progressoNome}>{c.label}</span>
                      <span className={st.progressoNivel} style={{ color: nv ? nv.color : 'var(--text-mute)' }}>{nv ? nv.curto : 'falta'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={() => router.push(`/funcionarios/${d.pessoa.id}`)} className={`tc-btn ${st.botaoFicha}`}>Ver a ficha completa</button>
          </div>

          {/*
            ⚠️⚠️ O aviso mais importante da tela. O score é calculado da atividade
            registrada nos sistemas; a nota é julgamento de gente. Sem dizer isto
            aqui, o gestor lê o score como "a resposta certa" e transcreve — e a
            avaliação deixa de acrescentar qualquer coisa ao que o sistema já sabia.
          */}
          <div className={st.lembrete}>
            <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
            <span>A <b>ficha</b> mostra o que os sistemas registraram. Esta nota é <b>o que você observou</b>. Quando as duas discordam, é aí que há algo a conversar.</span>
          </div>

          {/* O MÉTODO, à vista de quem avalia (02/10/2026): é o que se responde
              quando a nota é questionada. */}
          <details className={st.metodo}>
            <summary>Como funciona esta avaliação</summary>
            <ul>
              {METODO_PONTOS.map((p) => <li key={p.titulo}><b>{p.titulo}.</b> {p.texto}</li>)}
            </ul>
            <p>{d.regua.propria
              ? `Os textos dos níveis são a régua escrita do setor ${d.regua.setor}.`
              : 'Este setor ainda usa a régua genérica; a régua escrita do setor entra quando for definida.'}</p>
            <p className={st.metodoRef}>{METODO_REFERENCIA}</p>
          </details>
        </aside>

        {/* ---------- À DIREITA: o que se avalia ---------- */}
        <main className={st.principal}>
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
            <>
              <div className={st.cabecalho}>
                <div>
                  <h2 className={st.titulo}>Avaliação de {competenciaLabel(competencia)}</h2>
                  <div className={st.subtitulo}>
                    {somenteLeitura ? 'O que o avaliador escolheu em cada ponto.' : `Escolha um nível em cada um dos ${CRITERIOS.length} pontos, pensando em como ${primeiro} trabalhou no mês.`}
                  </div>
                </div>
                {jaPublicada && (
                  <div className={st.situacao}>
                    Publicada{d.avaliacao!.versao > 1 ? ` · versão ${d.avaliacao!.versao}` : ''}
                    {d.avaliacao!.ciencia?.cienteEm ? ' · a pessoa já leu' : ' · aguardando ciência'}
                    <BotaoTermo avaliadoId={d.pessoa.id} competencia={competencia} />
                  </div>
                )}
              </div>

              {lista.map(({ c, v }, i) => {
                const precisa = exigeJustificativa(v.nota)
                const escolhido = v.nota != null ? nivelDe(v.nota) : null
                return (
                  <section key={c.key} className={`tc-card ${st.cartao} ${st.criterio}`}>
                    <div className={st.criterioTopo}>
                      <span className={st.numero}>{i + 1}</span>
                      <div>
                        <div className={st.criterioNome}>{c.label}{c.sub && <span className={st.criterioSub}> — {c.sub}</span>}</div>
                        <div className={st.criterioDesc}>{c.desc}</div>
                      </div>
                    </div>
                    <div className={st.niveis} role="radiogroup" aria-label={c.label}>
                      {NIVEIS.map((n) => {
                        const on = escolhido?.key === n.key
                        return (
                          <button key={n.key} type="button" role="radio" aria-checked={on} disabled={somenteLeitura}
                            onClick={() => setNota(c.key, n.nota)}
                            className={`${st.nivel} ${on ? st.nivelEscolhido : ''}`}
                            style={{ '--cor': n.color } as React.CSSProperties}>
                            {on && <span className={st.marca}>✓</span>}
                            <span className={st.nivelNome}>{n.curto}</span>
                            <span className={st.nivelDica}>{significado(d.regua, c.key, n.key)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* ⚠️ Abaixo e Acima pedem uma linha (decisão do dono, 02/09/2026): é o
                        que sustenta a nota seis meses depois, na conversa de aumento. */}
                    {(precisa || (v.justificativa ?? '').trim()) && (
                      <textarea
                        disabled={somenteLeitura}
                        value={v.justificativa ?? ''}
                        onChange={(e) => setJust(c.key, e.target.value)}
                        placeholder={precisa ? `"${escolhido!.label}" precisa de uma linha explicando: o que ${primeiro} fez para merecer isso?` : 'Observação (opcional)'}
                        rows={2}
                        className={`${st.campo} ${precisa && !(v.justificativa ?? '').trim() ? st.campoAlerta : ''}`} />
                    )}
                  </section>
                )
              })}

              <section className={`tc-card ${st.cartao}`}>
                <div className={st.campoRotulo}>Recado do mês <span>· opcional, {primeiro} vai ler</span></div>
                <textarea disabled={somenteLeitura} value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
                  placeholder={`O que ${primeiro} fez bem, e o que você espera no mês que vem.`}
                  className={st.campo} />

                <div className={st.campoRotulo} style={{ marginTop: 16 }}>Combinado para o próximo mês <span>· uma coisa só, {primeiro} vai ler e vai no PDF</span></div>
                <input disabled={somenteLeitura} value={combinado} onChange={(e) => setCombinado(e.target.value)}
                  placeholder={`O que ${primeiro} e você combinam para o mês que vem`} className={st.campo} />

                {/* Correção de publicada exige motivo — as duas versões ficam visíveis. */}
                {jaPublicada && !somenteLeitura && (
                  <div style={{ marginTop: 16 }}>
                    <div className={st.campoRotulo}>Motivo da correção <span>· a versão anterior continua visível para {primeiro}, junto com este motivo</span></div>
                    <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O que mudou e por quê" className={st.campo} />
                  </div>
                )}
              </section>

              {/* ⚠️⚠️ SÓ DA GESTÃO (02/10/2026): não vai para a página de quem é
                  avaliado nem para o PDF. Se o avaliador soubesse que a pessoa
                  vai ler "corre risco: sim", suavizaria — e a resposta perderia
                  o valor. A rota nem devolve isto para quem não pode ler. */}
              {d.gestaoVisivel && (
                <section className={`tc-card ${st.cartao} ${st.gestao}`}>
                  <div className={st.campoRotulo}>🔒 Só para a gestão <span>· não aparece para {primeiro} nem no PDF</span></div>
                  <div className={st.gestaoSub}>Responda pelo que você <b>faria</b>, não pelo que acha da pessoa.</div>
                  {PERGUNTAS_GESTAO.map((q) => (
                    <div key={q.key} className={st.gestaoLinha}>
                      <span>{q.texto}</span>
                      <div className={st.simNao} role="radiogroup" aria-label={q.texto}>
                        {([true, false] as const).map((v) => (
                          <button key={String(v)} type="button" role="radio" aria-checked={gestao[q.key] === v} disabled={somenteLeitura}
                            onClick={() => setGestao((g) => ({ ...g, [q.key]: g[q.key] === v ? null : v }))}
                            className={gestao[q.key] === v ? st.simNaoOn : ''}>
                            {v ? 'Sim' : 'Não'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <textarea disabled={somenteLeitura} value={gestao.anotacao ?? ''} rows={2}
                    onChange={(e) => setGestao((g) => ({ ...g, anotacao: e.target.value }))}
                    placeholder="Anotação privada para preparar a conversa (opcional)" className={st.campo} style={{ marginTop: 10 }} />
                </section>
              )}

              {erro && <Aviso cor="var(--danger)">{erro}</Aviso>}
              {ok && <Aviso cor="var(--success)">{ok}</Aviso>}

              {!somenteLeitura && (
                <div className={st.acoes}>
                  <span className={st.acoesTexto} style={{ color: pendentesJust.length || faltaNivel.length ? 'var(--warning)' : undefined }}>
                    {faltaNivel.length > 0
                      ? `Falta escolher: ${faltaNivel.map((p) => p.c.label).join(', ')}`
                      : pendentesJust.length > 0
                        ? `Falta explicar: ${pendentesJust.map((p) => p.c.label).join(', ')}`
                        : `Pronto. O rascunho fica invisível para ${primeiro}; publicar mostra a avaliação.`}
                  </span>
                  <button onClick={() => salvar('rascunho')} disabled={!!salvando} className={`tc-btn ${st.botao} ${st.botaoSecundario}`}>
                    {salvando === 'rascunho' ? 'Salvando…' : 'Salvar rascunho'}
                  </button>
                  <button onClick={() => salvar('publicar')} disabled={!!salvando || faltaNivel.length > 0 || pendentesJust.length > 0} className={`tc-btn ${st.botao} ${st.botaoPrincipal}`}>
                    {salvando === 'publicar' ? 'Publicando…' : jaPublicada ? 'Publicar correção' : 'Publicar avaliação'}
                  </button>
                </div>
              )}

              {/* Histórico de correções */}
              {d.avaliacao && d.avaliacao.versoes.length > 0 && (
                <section className={`tc-card ${st.cartao}`}>
                  <div className={st.campoRotulo}>Versões anteriores</div>
                  {d.avaliacao.versoes.map((v) => (
                    <div key={v.versao} style={{ fontSize: 12, color: 'var(--text-mute)', padding: '5px 0', display: 'flex', gap: 10 }}>
                      <b>v{v.versao}</b>
                      <span>média {v.media?.toFixed(1) ?? '—'}</span>
                      <span style={{ flex: 1 }}>{v.motivo}</span>
                      <span>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                  ))}
                </section>
              )}

              {/* O que a pessoa respondeu */}
              {d.avaliacao?.ciencia && (
                <section className={`tc-card ${st.cartao}`} style={{ borderLeft: '3px solid var(--info)' }}>
                  <div className={st.campoRotulo}>
                    {primeiro} deu ciência em {new Date(d.avaliacao.ciencia.cienteEm).toLocaleDateString('pt-BR')}
                    {d.avaliacao.ciencia.versaoCiente < d.avaliacao.versao && <span style={{ color: 'var(--warning)' }}> · da versão {d.avaliacao.ciencia.versaoCiente}, anterior à correção</span>}
                  </div>
                  {d.avaliacao.ciencia.comentario && (
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.avaliacao.ciencia.comentario}</div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

const Aviso = ({ cor, children }: { cor: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderLeft: `3px solid ${cor}`, borderRadius: 'var(--radius-sm)', padding: '10px 13px', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
    {children}
  </div>
)
