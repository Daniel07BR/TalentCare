'use client'
import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'
import { useRecorteSetor, useEmJanela } from '@/lib/ui/recorte-setor'
import Avatar from '../Avatar'
import { usePainelDaPessoa } from '../PainelDaPessoa'
import EsqueletoResumo from '../EsqueletoResumo'
import Donut, { type DonutSeg } from '../Donut'
import { textoDoLote, LOTE_MINIMO, type Lote } from '@/lib/acessorias-lote'

/* ============================================================
   ACESSÓRIAS — o resumo (30/09/2026). Abre ao clicar no cartão do setor e é a
   página /acessorias. Pedido do dono: "assim como em todos os demais sistemas
   no TalentCare, o card precisa dar clique para eu ver o relatório completo".

   ⚠️⚠️ Só VOLUME (decisão do dono) e FORA DA NOTA: processos iniciados e
   concluídos e entregas feitas. Nunca "atrasadas" — em 30/09/2026 o escritório
   implantava o Acessórias. Clicar na pessoa abre o painel dela, com as entregas
   DIA A DIA: é lá que a baixa em lote aparece como lote.
   ============================================================ */

type Linha = { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean; iniciados: number; concluidos: number; entregas: number; solicitacoes: number; lotes: Lote[] }

/* Baixa em lote: o número CONTA, a tela avisa (decisão do dono, 01/10/2026). */
const Aviso = ({ lotes }: { lotes: Lote[] }) =>
  lotes.length ? <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--warning, #b45309)', marginTop: 2 }}>{textoDoLote(lotes)}</div> : null
type Servico = { tipo: string; n: number }
type Dados = {
  atualizadoEm: string | null
  total: { iniciados: number; concluidos: number; entregas: number; solicitacoes: number }
  pessoas: Linha[]
  servicos?: { obrigacoes: Servico[]; processos: Servico[]; entregasEmLote: number }
}

/* A pizza de um tipo de serviço: os 6 maiores com cor (a paleta tem 6), o resto em
   "Outros" — e a LISTA COMPLETA ao lado, para nenhum tipo sumir dentro de "Outros". */
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
function Pizza({ titulo, sub, itens, unidade }: { titulo: string; sub: string; itens: Servico[]; unidade: string }) {
  const total = itens.reduce((a, i) => a + i.n, 0)
  const seg: DonutSeg[] = itens.slice(0, 6).map((i, k) => ({ id: i.tipo, nome: i.tipo, value: i.n, color: CORES[k] }))
  const resto = itens.slice(6).reduce((a, i) => a + i.n, 0)
  if (resto) seg.push({ id: '__outros', nome: `Outros (${itens.length - 6} tipos)`, value: resto, color: 'var(--text-mute)' })
  const corDe = (k: number) => (k < 6 ? CORES[k] : 'var(--text-mute)')
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{sub}</div>
      {total === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nada no período.</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Donut segments={seg} total={total} centerLabel={unidade} />
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto' }}>
            {itens.map((i, k) => (
              <li key={i.tipo} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: corDe(k) }} />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.tipo}>{i.tipo}</span>
                <b className="cnum" style={{ textAlign: 'right' }}>{i.n.toLocaleString('pt-BR')}</b>
                <span className="cnum" style={{ width: 38, textAlign: 'right', color: 'var(--text-mute)', fontSize: 11 }}>{Math.round((i.n / total) * 100)}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

const COR = 'var(--n-pink, #ec4899)'
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export default function AcessoriasResumo() {
  const setor = useRecorteSetor()
  const emJanela = useEmJanela()
  const abrirPessoa = usePainelDaPessoa()
  const { fromDay, toDay, label } = usePeriod()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!fromDay || !toDay) return
    let vivo = true
    setDados(null)
    const qs = new URLSearchParams({ period: 'custom', from: fromDay, to: toDay })
    if (setor) qs.set('dept', setor.id)
    fetch(`/api/acessorias-metrics?${qs}`)
      .then(async (r) => { if (!r.ok) throw new Error(r.status === 403 ? 'Você não tem acesso a estes números.' : 'Não foi possível carregar.'); return r.json() })
      .then((d) => { if (vivo) { setDados(d); setErro(null) } })
      .catch((e) => { if (vivo) setErro(e.message) })
    return () => { vivo = false }
  }, [setor, fromDay, toDay])

  if (erro) return <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{erro}</div>
  if (!dados) return <EsqueletoResumo />

  const kpis = [
    { label: 'Processos concluídos', value: dados.total.concluidos },
    { label: 'Processos iniciados', value: dados.total.iniciados },
    { label: 'Entregas de obrigação', value: dados.total.entregas },
    { label: 'Pessoas com volume', value: dados.pessoas.length },
  ]
  const top = dados.pessoas.slice(0, 5)
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 } as const

  return (
    <div className="tc-anim" style={emJanela ? undefined : { maxWidth: 1280, margin: '0 auto' }}>
      {!emJanela && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Integração · dados reais · {label}</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarCheck size={24} color={COR} /> Acessórias
          </h1>
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 14 }}>
        Só volume, e fora da nota: o escritório está implantando o Acessórias.
        {dados.atualizadoEm && <> Cópia atualizada em {new Date(dados.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</>}
        {' '}Clique na pessoa para ver as entregas dia a dia.
        {dados.pessoas.some((p) => p.lotes.length > 0) && <> <b>Baixa em lote</b> = {LOTE_MINIMO} ou mais baixas da mesma pessoa no mesmo dia, quase todas com atraso — conta no volume, mas não é produção daquele dia.</>}
      </div>

      <div className="tc-card" style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Top 5 · quem mais concluiu processo e entregou obrigação</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18 }}>Processos concluídos + entregas feitas, no período</div>
        {top.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sem volume no Acessórias neste período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top.length}, 1fr)`, gap: 12 }}>
            {top.map((p, i) => (
              <div key={p.id} className="tc-row" onClick={() => abrirPessoa('acessorias', p.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', cursor: 'pointer', padding: '14px 8px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)' }}>
                <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color={COR} size={52} />
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1}. {p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.setor}</div>
                </div>
                <div className="cnum" style={{ fontSize: 24, fontWeight: 800, color: COR }}>{(p.concluidos + p.entregas).toLocaleString('pt-BR')}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{p.concluidos} processos · {p.entregas} entregas</div>
                <Aviso lotes={p.lotes} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tc-card" style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: COR }}>{k.value.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      {dados.servicos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
          <Pizza titulo="Serviço feito · obrigações entregues" unidade="entregas" itens={dados.servicos.obrigacoes}
            sub={`Por tipo de obrigação, no período${dados.servicos.entregasEmLote ? ` · inclui ${dados.servicos.entregasEmLote} de baixa em lote` : ''}`} />
          <Pizza titulo="Serviço feito · processos concluídos" unidade="processos" itens={dados.servicos.processos}
            sub="Por modelo de processo, no período (os passos de dentro não têm data na API)" />
        </div>
      )}

      <div className="tc-card" style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Por pessoa</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Só quem tem volume no período — quem não usa o Acessórias não aparece com zero</div>
        {dados.pessoas.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sem volume no período.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* ⚠️ Cada coluna com largura FIXA e o título no MESMO lado do número (01/10/2026,
                o dono viu os títulos à esquerda e os números à direita). O alinhamento vai em
                cada `th` — no `tr` ele não chega, a folha global manda o `th` para a esquerda. */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed' }}>
              <colgroup><col /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 120 }} /></colgroup>
              <thead>
                <tr style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Pessoa</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Processos concluídos</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Processos iniciados</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Entregas</th>
                </tr>
              </thead>
              <tbody>
                {dados.pessoas.map((p) => (
                  <tr key={p.id} className="tc-row" onClick={() => abrirPessoa('acessorias', p.id)} style={{ cursor: 'pointer', borderTop: '1px solid var(--border-soft)' }}>
                    <td style={{ padding: '7px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color={COR} size={26} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{p.nome}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.cargo}{setor ? '' : ` · ${p.setor}`}</div>
                          <Aviso lotes={p.lotes} />
                        </div>
                      </div>
                    </td>
                    <td className="cnum" style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>{p.concluidos}</td>
                    <td className="cnum" style={{ padding: '7px 8px', textAlign: 'right' }}>{p.iniciados}</td>
                    <td className="cnum" style={{ padding: '7px 8px', textAlign: 'right' }}>{p.entregas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
