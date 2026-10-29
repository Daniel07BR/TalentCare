'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Headset } from 'lucide-react'
import Avatar from '../../../Avatar'
import { Cartao, forte, suave } from '../../../_visao/ui'
import { ITENS_RECEPCAO, OUTRAS_TAREFAS, atendimentos, fmt } from '../../../_visao/recepcao'
import { temOutrasTarefas, type AtendimentoDoSetor, type PessoaDaRecepcao } from '@/lib/recepcao'
import type { SecaoProps } from './tipos'

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO — o card do setor (16/10/2026).

   Pedido do Daniel: os indicadores da Recepção no setor e na ficha, "só aparecendo, sem
   entrar na nota". Três partes, de cima para baixo:
   1. os cinco números do setor no período (ligações recebidas e feitas, visitas, delivery,
      contatos do CIDE);
   2. quem fez: uma barra por pessoa com as quatro cores, e os contatos do CIDE à direita;
   3. as OUTRAS TAREFAS (29/10/2026): entrevistas, Controle de faltas, prestadores e
      marcadores — o total do setor e uma linha por pessoa, cada número na sua coluna (são
      coisas diferentes, não se somam);
   4. a Recepção vista pelos outros setores: para onde vão as ligações, quem pede, para
      quem vêm as visitas.

   ⚠️ O total do setor NÃO é a soma das barras: a visita com duas atendentes conta uma vez
   no setor e uma para cada uma. Ver `lib/recepcao.ts`.
   ⚠️ Lê `/api/recepcao/resumo` no MESMO período do relatório (o filtro do topo).
   ============================================================ */

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const BARRA = ITENS_RECEPCAO.filter((i) => i.chave !== 'contatos')

/** Foto, nome e "do <setor>" de quem fez — leva à ficha. */
function Pessoa({ p, abrir }: { p: PessoaDaRecepcao; abrir: () => void }) {
  return (
    <button type="button" onClick={abrir}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 32, minWidth: 0 }}>
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-text-3)" size={26} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--n-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
        {p.deOutroSetor && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)' }}>do {p.deOutroSetor}</span>}
      </span>
    </button>
  )
}

function Recorte({ titulo, linhas, tom }: { titulo: string; linhas: { rotulo: string; n: number; extra?: number }[]; tom: 'blue' | 'green' | 'purple' }) {
  const max = Math.max(1, ...linhas.map((l) => l.n + (l.extra ?? 0)))
  const vistas = linhas.slice(0, 6)
  const resto = linhas.slice(6).reduce((s, l) => s + l.n + (l.extra ?? 0), 0)
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', marginBottom: 8 }}>{titulo}</div>
      {linhas.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>Nada no período.</div>
      ) : (
        <>
          {vistas.map((l) => (
            <div key={l.rotulo} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr) 34px', gap: 8, alignItems: 'center', fontSize: 12, margin: '5px 0' }}
              title={l.extra != null ? `${l.rotulo}: ${l.n} ligações pedidas · ${l.extra} deliveries` : `${l.rotulo}: ${l.n}`}>
              <span style={{ color: 'var(--n-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.rotulo}</span>
              <span style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--n-card-2)' }}>
                <span style={{ width: `${(l.n / max) * 100}%`, background: forte(tom) }} />
                {l.extra != null && <span style={{ width: `${(l.extra / max) * 100}%`, background: forte('orange') }} />}
              </span>
              <span className="cnum" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--n-text)' }}>{l.n + (l.extra ?? 0)}</span>
            </div>
          ))}
          {resto > 0 && <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginTop: 4 }}>+ {resto} de outros setores</div>}
        </>
      )}
    </div>
  )
}

export function AtendimentoRecepcao({ m }: SecaoProps) {
  const router = useRouter()
  const [d, setD] = useState<AtendimentoDoSetor | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    setD(null)
    setErro(false)
    const qs = new URLSearchParams({ period: 'custom', from: m.fromDay, to: m.toDay, dept: m.setor.id })
    fetch(`/api/recepcao/resumo?${qs}`, { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((x) => { if (vivo) setD(x) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [m.setor.id, m.fromDay, m.toDay])

  const titulo = 'Atendimento da Recepção'
  const sub = 'Ligações, visitas, delivery e outras tarefas do Fluxo · contatos do CIDE · só aparece, não entra na nota'
  if (!d) {
    return (
      <Cartao titulo={titulo} Icone={Headset} sub={sub} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: erro ? 'var(--n-red)' : 'var(--n-text-2)' }}>
          {erro ? 'Não foi possível carregar o atendimento.' : 'Carregando…'}
        </div>
      </Cartao>
    )
  }

  const pessoas = d.pessoas.filter((p) => atendimentos(p) > 0 || (p.contatos?.atualizados ?? 0) > 0)
  const tarefas = d.pessoas.filter(temOutrasTarefas)
  const maxPessoa = Math.max(1, ...pessoas.map(atendimentos))
  const g = d.grupos
  const pede = new Map<string, { rotulo: string; n: number; extra: number }>()
  for (const l of g.pedeLigacao ?? []) pede.set(l.rotulo, { rotulo: l.rotulo, n: l.n, extra: 0 })
  for (const l of g.pedeDelivery ?? []) {
    const x = pede.get(l.rotulo) ?? { rotulo: l.rotulo, n: 0, extra: 0 }
    x.extra += l.n
    pede.set(l.rotulo, x)
  }
  const quemPede = [...pede.values()].sort((a, b) => b.n + b.extra - (a.n + a.extra))

  return (
    <Cartao titulo={titulo} Icone={Headset} sub={sub} style={{ marginBottom: 14 }}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))' }}>
        {ITENS_RECEPCAO.map((i) => (
          <div key={i.chave} style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: suave(i.tom), color: forte(i.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <i.Icone size={16} strokeWidth={2.2} />
              </span>
              <span style={{ fontSize: 12, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{i.rotulo}</span>
            </div>
            <div className="cnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', marginTop: 8, color: 'var(--n-text)' }}>{fmt(i.valor(d.total))}</div>
            <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 2, lineHeight: 1.4 }}>{i.nota(d.total)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)' }}>Quem fez</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--n-text-3)' }}>
            {BARRA.map((i) => (
              <span key={i.chave} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: forte(i.tom) }} />{i.curto}
              </span>
            ))}
            <span style={{ color: forte('pink') }}>número à direita = contatos do CIDE</span>
          </div>
        </div>
        {pessoas.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum atendimento registrado no período.</div>
        ) : pessoas.map((p) => {
          const total = atendimentos(p)
          const dica = [
            ...BARRA.map((i) => `${i.curto}: ${i.valor(p) ?? 0}`),
            p.naoRealizadas ? `Não realizadas: ${p.naoRealizadas}` : null,
            p.contatosEmLote ? `Contato em lote: ${p.contatosEmLote}` : null,
            p.contatos ? `Contatos do CIDE: ${p.contatos.atualizados} (${p.contatos.editados} editados, ${p.contatos.novos} novos, ${p.contatos.removidos} removidos)` : null,
          ].filter(Boolean).join('\n')
          return (
            <div key={p.id} title={dica}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 210px) minmax(0, 1fr) 48px 52px', gap: 10, alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--n-border-2)' }}>
              <Pessoa p={p} abrir={() => router.push(`/funcionarios/${p.id}`)} />
              <span style={{ display: 'flex', height: 12, borderRadius: 4, overflow: 'hidden', background: 'var(--n-card-2)' }}>
                <span style={{ display: 'flex', width: `${(total / maxPessoa) * 100}%` }}>
                  {BARRA.map((i) => {
                    const v = i.valor(p) ?? 0
                    return v > 0 ? <span key={i.chave} style={{ width: `${(v / total) * 100}%`, background: forte(i.tom) }} /> : null
                  })}
                </span>
              </span>
              <span className="cnum" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: 'var(--n-text)' }}>{total || '—'}</span>
              <span className="cnum" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: p.contatos?.atualizados ? forte('pink') : 'var(--n-text-3)' }}>
                {p.contatos?.atualizados ? p.contatos.atualizados.toLocaleString('pt-BR') : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {temOutrasTarefas(d.total) && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--n-border)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', marginBottom: 8 }}>Outras tarefas da Recepção</div>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))' }}>
            {OUTRAS_TAREFAS.map((i) => (
              <div key={i.chave} style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: suave(i.tom), color: forte(i.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <i.Icone size={16} strokeWidth={2.2} />
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{i.rotulo}</span>
                </div>
                <div className="cnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', marginTop: 8, color: 'var(--n-text)' }}>{fmt(i.valor(d.total))}</div>
                <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 2, lineHeight: 1.4 }}>{i.nota(d.total)}</div>
              </div>
            ))}
          </div>
          {tarefas.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <div style={{ minWidth: 470 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 210px) repeat(4, minmax(70px, 1fr))', gap: 10, fontSize: 11, color: 'var(--n-text-3)', paddingBottom: 4 }}>
                  <span>Quem fez</span>
                  {OUTRAS_TAREFAS.map((i) => <span key={i.chave} style={{ textAlign: 'right' }}>{i.curto}</span>)}
                </div>
                {tarefas.map((p) => (
                  <div key={p.id} title={OUTRAS_TAREFAS.map((i) => `${i.rotulo}: ${i.valor(p)}${i.chave === 'entrevistas' ? ` (${i.nota(p)})` : ''}`).join('\n')}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 210px) repeat(4, minmax(70px, 1fr))', gap: 10, alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--n-border-2)' }}>
                    <Pessoa p={p} abrir={() => router.push(`/funcionarios/${p.id}`)} />
                    {OUTRAS_TAREFAS.map((i) => {
                      const v = i.valor(p)
                      return (
                        <span key={i.chave} className="cnum" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: v ? forte(i.tom) : 'var(--n-text-3)' }}>
                          {v ? v.toLocaleString('pt-BR') : '—'}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--n-border)' }}>
        <Recorte titulo="Para onde vão as ligações recebidas" linhas={g.destinoLigacao ?? []} tom="blue" />
        <Recorte titulo="Quem pede à Recepção" linhas={quemPede} tom="green" />
        <Recorte titulo="Para quem vêm as visitas" linhas={g.visitaPara ?? []} tom="purple" />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 12, lineHeight: 1.5 }}>
        Em &quot;Quem pede&quot;, verde são ligações pedidas e laranja, delivery. Uma visita com duas atendentes conta uma vez
        no setor e uma para cada atendente, por isso as barras somam mais que o total. Passe o mouse numa pessoa para ver o detalhe.
        {d.ate && <> Dados do Fluxo até {d.ate.split('-').reverse().join('/')}.</>}
      </div>
    </Cartao>
  )
}
