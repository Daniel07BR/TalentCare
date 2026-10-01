'use client'
import { useEffect, useState } from 'react'
import { CalendarCheck, X } from 'lucide-react'
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

type Linha = { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean; iniciados: number; concluidos: number; entregas: number; solicitacoes: number; lotes: Lote[]; atividades?: Atividade[] }
type Atividade = { acao: string; tipo: string; n: number }

/* Baixa em lote: o número CONTA, a tela avisa (decisão do dono, 01/10/2026). */
const Aviso = ({ lotes }: { lotes: Lote[] }) =>
  lotes.length ? <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--warning, #b45309)', marginTop: 2 }}>{textoDoLote(lotes)}</div> : null
type Servico = { tipo: string; n: number }
type Detalhe = 'obrigacao' | 'processo' | 'iniciado'
type Dados = {
  atualizadoEm: string | null
  total: { iniciados: number; concluidos: number; entregas: number; solicitacoes: number }
  pessoas: Linha[]
  servicos?: { obrigacoes: Servico[]; processos: Servico[]; iniciados?: Servico[]; entregasEmLote: number }
}

/* A pizza de um tipo de serviço: os 6 maiores com cor (a paleta tem 6), o resto em
   "Outros" — e a LISTA COMPLETA ao lado, para nenhum tipo sumir dentro de "Outros". */
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
function Pizza({ titulo, sub, itens, unidade, onAbrir }: { titulo: string; sub: string; itens: Servico[]; unidade: string; onAbrir: (tipo: string) => void }) {
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
          {/* Clicar numa cor abre QUEM fez aquela atividade. "Outros" junta vários tipos: abra pela lista. */}
          <Donut segments={seg} total={total} centerLabel={unidade} onSegmentClick={(g) => { if (g.id !== '__outros') onAbrir(g.id) }} />
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto' }}>
            {itens.map((i, k) => (
              <li key={i.tipo} className="tc-row" onClick={() => onAbrir(i.tipo)} title={`Ver quem fez: ${i.tipo}`}
                style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', gap: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer', borderRadius: 6, padding: '2px 4px', margin: '0 -4px' }}>
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
  const [aberta, setAberta] = useState<{ detalhe: Detalhe; tipo: string } | null>(null)

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
        /* ⚠️⚠️ UMA PIZZA POR COLUNA DA TABELA (01/10/2026): sem a dos INICIADOS, quem só
           iniciou processo sumia do gráfico, e o dono leu que a pizza não batia com a lista.
           O subtítulo diz de qual coluna é a soma, para conferir na hora. */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
          <Pizza titulo="Obrigações entregues" unidade="entregas" itens={dados.servicos.obrigacoes} onAbrir={(tipo) => setAberta({ detalhe: 'obrigacao', tipo })}
            sub={`${dados.total.entregas} = soma da coluna Entregas · por tipo de obrigação${dados.servicos.entregasEmLote ? ` · inclui ${dados.servicos.entregasEmLote} de baixa em lote` : ''}`} />
          <Pizza titulo="Processos concluídos" unidade="processos" itens={dados.servicos.processos} onAbrir={(tipo) => setAberta({ detalhe: 'processo', tipo })}
            sub={`${dados.total.concluidos} = soma da coluna Processos concluídos · por modelo`} />
          <Pizza titulo="Processos iniciados" unidade="processos" itens={dados.servicos.iniciados ?? []} onAbrir={(tipo) => setAberta({ detalhe: 'iniciado', tipo })}
            sub={`${dados.total.iniciados} = soma da coluna Processos iniciados · por modelo`} />
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
                          {/* AS ATIVIDADES, não só a quantidade (pedido do dono, 01/10/2026). */}
                          {!!p.atividades?.length && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {p.atividades.slice(0, 4).map((a) => (
                                /* ⚠️ O NÚMERO fica FORA do trecho que corta: com o nome longo
                                   ("Rotina Contábil - Conciliação…") o "…" comia a quantidade. */
                                <span key={a.acao + a.tipo} title={`${a.acao}: ${a.tipo} (${a.n})`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-dim)', maxWidth: 300 }}>
                                  <span style={{ fontWeight: 600, color: COR }}>{a.acao}</span>
                                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tipo}</span>
                                  <b style={{ color: 'var(--text)', flex: 'none' }}>{a.n}</b>
                                </span>
                              ))}
                              {p.atividades.length > 4 && <span style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>+{p.atividades.length - 4} tipos</span>}
                            </div>
                          )}
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
      {aberta && <JanelaAtividade {...aberta} setorId={setor?.id ?? null} fromDay={fromDay} toDay={toDay} label={label} onFechar={() => setAberta(null)} />}
    </div>
  )
}

/* ============================================================
   A JANELA DE UMA ATIVIDADE — clique numa cor da pizza (pedido do dono, 01/10/2026):
   "abra uma janela estilizada mostrando a lista de funcionários que realizaram as
   atividades… data e hora". ⚠️ SEM o cliente: "mantenha o cliente de fora" (no
   TalentCare). ⚠️ A hora é a da última alteração no Acessórias, e só aparece quando
   cai no mesmo dia da entrega — ver `horaNoDia` na rota.
   ============================================================ */
type ItemAtividade = { id: string; pessoa: { id: string; nome: string; hasAvatar: boolean }; dia: string; hora: string | null; status: string; competencia: string | null }

function JanelaAtividade({ detalhe, tipo, setorId, fromDay, toDay, label, onFechar }: {
  detalhe: Detalhe; tipo: string; setorId: string | null; fromDay: string; toDay: string; label: string; onFechar: () => void
}) {
  const abrirPessoa = usePainelDaPessoa()
  const [itens, setItens] = useState<ItemAtividade[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams({ period: 'custom', from: fromDay, to: toDay, detalhe, tipo })
    if (setorId) qs.set('dept', setorId)
    fetch(`/api/acessorias-metrics?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Não foi possível carregar.'))))
      .then((d) => setItens(d.itens))
      .catch((e) => setErro(e.message))
  }, [detalhe, tipo, setorId, fromDay, toDay])

  /* ⚠️ Esta janela abre POR CIMA da janela do sistema, que também fecha com Esc. Captura
     o Esc antes e para nele — senão um Esc fecharia as duas. */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onFechar() } }
    window.addEventListener('keydown', h, { capture: true })
    return () => window.removeEventListener('keydown', h, { capture: true })
  }, [onFechar])

  const porPessoa = new Map<string, { nome: string; id: string; hasAvatar: boolean; n: number }>()
  for (const i of itens ?? []) {
    const c = porPessoa.get(i.pessoa.id) ?? { ...i.pessoa, n: 0 }
    c.n++; porPessoa.set(i.pessoa.id, c)
  }
  const ranking = [...porPessoa.values()].sort((a, b) => b.n - a.n)
  const br = (d: string) => d.split('-').reverse().join('/')
  const comp = (d: string | null) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '')

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="tc-anim"
        style={{ width: 'min(820px, 100%)', maxHeight: 'min(80vh, 760px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', background: `linear-gradient(120deg, color-mix(in srgb, ${COR} 12%, var(--surface)) 0%, var(--surface) 70%)`, borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${COR} 16%, transparent)`, color: COR, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><CalendarCheck size={20} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{detalhe === 'obrigacao' ? 'Obrigação entregue' : detalhe === 'iniciado' ? 'Processo iniciado' : 'Processo concluído'} · {label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.3px' }}>{tipo}</div>
            {itens && <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>{itens.length} {detalhe === 'obrigacao' ? (itens.length === 1 ? 'entrega' : 'entregas') : (itens.length === 1 ? 'processo' : 'processos')} · {ranking.length} {ranking.length === 1 ? 'pessoa' : 'pessoas'}</div>}
          </div>
          <button onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)" className="tc-btn"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer', flex: 'none' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 22px 20px' }}>
          {erro ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{erro}</div>
            : !itens ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Carregando…</div>
            : (
              <>
                {/* Quem fez, e quantas — clicar abre o painel da pessoa. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {ranking.map((p) => (
                    <button key={p.id || p.nome} type="button" onClick={() => p.id && abrirPessoa('acessorias', p.id)} className="tc-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', border: '1px solid var(--border)', borderRadius: 999, background: 'var(--surface)', cursor: p.id ? 'pointer' : 'default', fontFamily: 'inherit', color: 'inherit' }}>
                      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color={COR} size={24} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.nome}</span>
                      <b className="cnum" style={{ fontSize: 12.5, color: COR }}>{p.n}</b>
                    </button>
                  ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed' }}>
                  <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 70 }} /><col style={{ width: 210 }} /></colgroup>
                  <thead>
                    <tr style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{detalhe === 'iniciado' ? 'Quem iniciou' : 'Quem fez'}</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Data</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Hora</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{detalhe === 'processo' ? 'Início' : 'Situação'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((i) => (
                      <tr key={i.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <Avatar id={i.pessoa.id} hasAvatar={i.pessoa.hasAvatar} initials={iniciais(i.pessoa.nome)} color={COR} size={22} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.pessoa.nome}</span>
                          </div>
                        </td>
                        <td className="cnum" style={{ padding: '6px 8px' }}>{br(i.dia)}</td>
                        <td className="cnum" style={{ padding: '6px 8px', color: i.hora ? 'var(--text)' : 'var(--text-mute)' }} title={i.hora ? 'Hora registrada no Acessórias' : 'O Acessórias só guarda a hora da última alteração, e ela foi em outro dia'}>{i.hora ?? '—'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i.status}{i.competencia ? ` · comp. ${comp(i.competencia)}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 10 }}>
                  A hora é a última alteração registrada no Acessórias; aparece só quando foi no mesmo dia da entrega. Sem o nome do cliente, de propósito.
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  )
}
