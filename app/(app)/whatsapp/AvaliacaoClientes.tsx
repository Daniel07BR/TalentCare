'use client'
import { useMemo, useState } from 'react'
import Avatar from '../Avatar'

/* ============================================================
   A AVALIAÇÃO DOS CLIENTES, por atendente (11/09/2026).

   Pedido do dono: "coloque para a pessoa a pontuação da nota que ela recebeu em
   formato de estrela, mas deixe exposto em cada usuário quantos atendimentos a
   pessoa fez, solicitou avaliação e quantos foram avaliados. Preciso desses
   dados para mudar a cultura da empresa."

   ⚠️⚠️ POR QUE OS TRÊS NÚMEROS, e não só a estrela. Medido em 11/09/2026 (jun–set,
   conferido pelo crítico): o atendente pede avaliação em ~10% dos atendimentos
   (Pessoal 31%, Fiscal 5%, Contábil 3%, as outras filas 0) e o cliente responde a
   ~13% dos pedidos (68 notas em 512); 65 das 69 notas são 5. Então:
   - "Pediu avaliação" mede o ATENDENTE — é o número que muda a cultura;
   - "Avaliados" mede o CLIENTE — não se cobra do atendente;
   - a estrela sozinha sairia quase sempre 5 e premiaria quem pede pouco (a
     ausência que elogia) — por isso vem sempre com quantas notas a formam.

   ⚠️ Regra (a) da casa: dia que o Painel não conferiu é "—", não "0 pedidos".

   ⚠️⚠️ OS QUATRO NÚMEROS SAEM DA MESMA CONTAGEM: "Atendimentos" é o que o Painel
   CONFERIU no OneCode (finalizados, sem grupo), e não o `finalizados` do espelho
   daqui. Medido em 11/09: o espelho perdeu 15–24% dos finalizados de jun–set (o
   dia parcial apagava o dia cheio — consertado na origem; o histórico espera
   decisão do dono). Com o finalizado do espelho, a linha diria "10 atendimentos,
   pediu em 12 de 14" — os números brigando entre si.
   ============================================================ */

export type LinhaAvaliacao = {
  dept: string; name: string; abertos: number; finalizados: number
  verificados: number | null; pedidos: number | null; avaliados: number | null; notaSum: number | null
}
type Pessoa = { id: string; hasAvatar: boolean; color: string; dept: string }
type Ordem = 'atend' | 'pedido' | 'nota'

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const fmtNota = (x: number) => x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** Cinco estrelas preenchidas até a média (4,5 = quatro e meia). */
export function Estrelas({ media, tamanho = 14 }: { media: number; tamanho?: number }) {
  const cheia = Math.max(0, Math.min(5, media)) / 5 * 100
  const linha = (cor: string) => (
    <span style={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
          <path fill={cor} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" />
        </svg>
      ))}
    </span>
  )
  return (
    <span role="img" aria-label={`${fmtNota(media)} de 5 estrelas`} style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      {linha('var(--surface-3)')}
      <span style={{ position: 'absolute', inset: 0, width: `${cheia}%`, overflow: 'hidden' }}>{linha('#f5a524')}</span>
    </span>
  )
}

export default function AvaliacaoClientes({ linhas, desde, pessoaDe, filtro, onAbrir, subtitulo }: {
  linhas: LinhaAvaliacao[]
  /** Primeiro dia conferido pelo Painel (`null` = ainda nenhum). */
  desde: string | null
  pessoaDe: (nome: string) => Pessoa | undefined
  /** Aba ativa do relatório: só quem é daquele setor (ou `null` = todos). */
  filtro: string | null
  onAbrir: (id: string) => void
  subtitulo: string
}) {
  const [ordem, setOrdem] = useState<Ordem>('atend')

  // Soma as filas por onde a pessoa passou — a avaliação é da pessoa, não da fila.
  const pessoas = useMemo(() => {
    const m = new Map<string, { name: string; fin: number; ver: number | null; ped: number | null; aval: number | null; soma: number | null }>()
    const mais = (a: number | null, b: number | null) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0))
    for (const l of linhas) {
      if (filtro) { const p = pessoaDe(l.name); if (!p || p.dept !== filtro) continue }
      const x = m.get(l.name) ?? { name: l.name, fin: 0, ver: null, ped: null, aval: null, soma: null }
      x.fin += l.finalizados
      x.ver = mais(x.ver, l.verificados); x.ped = mais(x.ped, l.pedidos)
      x.aval = mais(x.aval, l.avaliados); x.soma = mais(x.soma, l.notaSum)
      m.set(l.name, x)
    }
    /* ⚠️ Só quem tem dia CONFERIDO na janela. A linha com "—" em tudo não informa
       nada — e duplicava gente cuja grafia mudou ("bruna cunha", linha antiga do
       espelho, ao lado de "Bruna Cunha"; achado do crítico). */
    const arr = [...m.values()].filter((x) => (x.ver ?? 0) > 0)
    const media = (x: typeof arr[number]) => (x.aval && x.soma != null ? x.soma / x.aval : -1)
    const taxa = (x: typeof arr[number]) => (x.ver ? (x.ped ?? 0) / x.ver : -1)
    return arr.sort((a, b) =>
      /* ⚠️ Com um mínimo de 10 atendimentos: "1 pedido em 1" (100%) ficava acima de
         "23 em 30" (77%) — amostra de um no topo do ranking (achado do crítico). */
      ordem === 'pedido' ? Number((b.ver ?? 0) >= 10) - Number((a.ver ?? 0) >= 10) || taxa(b) - taxa(a) || (b.ped ?? 0) - (a.ped ?? 0)
      : ordem === 'nota' ? media(b) - media(a) || (b.aval ?? 0) - (a.aval ?? 0)
      : (b.ver ?? -1) - (a.ver ?? -1) || b.fin - a.fin)
  }, [linhas, filtro, pessoaDe, ordem])

  const tot = pessoas.reduce((t, x) => ({
    fin: t.fin + x.fin, ver: t.ver + (x.ver ?? 0), ped: t.ped + (x.ped ?? 0), aval: t.aval + (x.aval ?? 0), soma: t.soma + (x.soma ?? 0),
  }), { fin: 0, ver: 0, ped: 0, aval: 0, soma: 0 })
  const desdeBr = desde ? `${desde.slice(8, 10)}/${desde.slice(5, 7)}/${desde.slice(0, 4)}` : null
  const cols = 'minmax(170px,1.6fr) 90px minmax(120px,1fr) minmax(120px,1fr) minmax(150px,1.1fr)'

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Avaliação dos clientes</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
            {subtitulo} · quantos atendimentos cada pessoa finalizou, em quantos pediu a avaliação ao cliente, quantos o cliente avaliou e a nota (de 1 a 5). Conta os atendimentos conferidos um a um no OneCode (atendimento em grupo fica fora).
            {desdeBr && <> Conferido no OneCode desde <b>{desdeBr}</b>; antes disso, “—”.</>}
          </div>
        </div>
        {desde && pessoas.length > 1 && (
          <div role="group" aria-label="Ordenar" style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {([['atend', 'Mais atendimentos'], ['pedido', 'Mais pedem avaliação'], ['nota', 'Melhor nota']] as [Ordem, string][]).map(([k, t]) => (
              <button key={k} type="button" className={'seg' + (ordem === k ? ' on' : '')} onClick={() => setOrdem(k)} style={{ fontSize: 11.5, padding: '5px 10px' }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {!desde ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
          A avaliação dos clientes ainda não está sendo conferida no OneCode. Quando a conferência começar, os números aparecem aqui.
        </div>
      ) : pessoas.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum atendimento conferido neste período{desdeBr ? ` (a conferência começa em ${desdeBr})` : ''}.</div>
      ) : (
        <>
          {/* O resumo do grupo — a pergunta da cultura em uma linha. */}
          {tot.ver > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 14 }}>
              <span><b style={{ color: 'var(--text)' }}>{pct(tot.ped, tot.ver)}%</b> dos atendimentos pediram avaliação ({tot.ped.toLocaleString('pt-BR')} de {tot.ver.toLocaleString('pt-BR')})</span>
              <span><b style={{ color: 'var(--text)' }}>{tot.ped ? `${pct(tot.aval, tot.ped)}%` : '—'}</b> dos pedidos foram avaliados ({tot.aval.toLocaleString('pt-BR')})</span>
              {tot.aval > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  nota média <Estrelas media={tot.soma / tot.aval} /> <b style={{ color: 'var(--text)' }}>{fmtNota(tot.soma / tot.aval)}</b>
                </span>
              )}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 660 }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '0 6px 8px', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
                <span>Atendente</span>
                <span style={{ textAlign: 'right' }} title="Finalizados conferidos no OneCode (sem atendimento em grupo)">Atendimentos</span>
                <span style={{ textAlign: 'right' }} title="Em quantos atendimentos a pessoa enviou o pedido de avaliação — é a escolha do atendente ao finalizar">Pediu avaliação</span>
                <span style={{ textAlign: 'right' }} title="Quantos clientes deram nota — depende do cliente, não do atendente">Avaliados</span>
                <span>Nota do cliente</span>
              </div>
              {pessoas.map((x) => {
                const emp = pessoaDe(x.name)
                const media = x.aval && x.soma != null ? x.soma / x.aval : null
                return (
                  <div key={x.name} className={emp ? 'tc-row' : undefined}
                    onClick={emp ? () => onAbrir(emp.id) : undefined}
                    title={emp ? 'Ver o dia a dia de atendimento' : 'Atendente sem ficha no TalentCare'}
                    style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid var(--border)', cursor: emp ? 'pointer' : 'default' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      {emp ? <Avatar id={emp.id} hasAvatar={emp.hasAvatar} initials={initialsOf(x.name)} color={emp.color} size={26} />
                        : <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(x.name)}</span>}
                      <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      title={x.ver == null ? 'Nenhum dia deste período foi conferido no OneCode' : 'Finalizados conferidos no OneCode (sem atendimento em grupo)'}>
                      {x.ver == null ? <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>—</span> : x.ver.toLocaleString('pt-BR')}
                    </span>
                    {/* ⚠️ "—" quando nenhum dia da janela foi conferido: não é "não pediu". */}
                    <span style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}
                      title={x.ver == null ? 'Nenhum dia deste período foi conferido no OneCode' : `Pediu avaliação em ${x.ped ?? 0} dos ${x.ver} atendimentos`}>
                      {x.ver == null || x.ver === 0 ? <span style={{ color: 'var(--text-mute)' }}>—</span> : (
                        <><b>{(x.ped ?? 0).toLocaleString('pt-BR')}</b> <span style={{ color: 'var(--text-mute)' }}>· {pct(x.ped ?? 0, x.ver)}%</span></>
                      )}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}
                      title={x.ped ? `${x.aval ?? 0} dos ${x.ped} pedidos foram avaliados pelo cliente` : undefined}>
                      {x.ver == null || x.ver === 0 ? <span style={{ color: 'var(--text-mute)' }}>—</span> : (
                        <><b>{(x.aval ?? 0).toLocaleString('pt-BR')}</b>{x.ped ? <span style={{ color: 'var(--text-mute)' }}> · {pct(x.aval ?? 0, x.ped)}%</span> : null}</>
                      )}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      {media != null ? (
                        <>
                          <Estrelas media={media} />
                          <b style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{fmtNota(media)}</b>
                          <span style={{ fontSize: 11, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>{x.aval} {x.aval === 1 ? 'nota' : 'notas'}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{x.ver ? 'sem nota no período' : '—'}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
