'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'
import Avatar from '../../../Avatar'
import { dur } from './derivar'

/* ============================================================
   A JANELA DOS CHAMADOS ENTRE SETORES (11/09/2026).

   Pedido do dono: o cartão "Chamados entre setores" mostrava só contadores —
   "não dá para clicar e ver as pessoas e quantidades de chamados que atenderam
   ou abriram, e nem de qual departamento eram os chamados que atenderam e nem
   para qual abriram. Dê opção de clique logo no card da página".

   As DUAS FACES, em abas, e elas não se somam (o mesmo chamado é "pediu" de um
   setor e "recebeu" de outro):
   - Pediu aos outros → PARA QUAL setor, QUEM pediu, e a lista;
   - Recebeu para atender → DE QUAL setor veio, QUEM atendeu (concluiu, e em
     quanto tempo de expediente), e a lista.

   ⚠️ Os números vêm de `/api/chat-setor`, sob demanda, com as mesmas regras do
   cartão. Se a lista e o cartão divergirem (o espelho do cartão atualiza de hora
   em hora; esta lista é de agora), a janela DIZ — não esconde a diferença.
   ============================================================ */

export type FaceChamados = 'pediu' | 'recebeu'
type Pessoa = { nome: string; id: string | null; hasAvatar: boolean; fotoId: string | null } | null
type Item = {
  id: string; numero: number; assunto: string; situacao: string; melhoriaDe: string | null
  origem: { id: string | null; nome: string }; destino: { id: string | null; nome: string }
  pediu: Pessoa; assumiu: Pessoa; abertoEm: string; fechadoEm: string | null; segundosUteis: number | null
}
type Resp = { pediu: Item[]; pediuConcluidos: Item[]; recebeu: Item[]; concluiu: Item[]; cancelados: Item[] }
export type CartaoChamados = { pediu: number; pediuConcluidos: number; recebeu: number; recebeuConcluidos: number; cancelados: number }

const SITUACAO: Record<string, string> = {
  aberto: 'na fila', assumido: 'em atendimento', feito: 'aguardando quem pediu confirmar',
  concluido: 'concluído', cancelado: 'cancelado',
}
const COR_SITUACAO: Record<string, string> = { concluido: 'var(--n-green)', cancelado: 'var(--n-red)', feito: 'var(--n-amber)' }
const dataBr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—')
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** Conta por uma chave e ordena do maior para o menor. */
function contar<T>(xs: T[], chave: (x: T) => string | null): { k: string; n: number; x: T }[] {
  const m = new Map<string, { k: string; n: number; x: T }>()
  for (const x of xs) { const k = chave(x); if (!k) continue; const v = m.get(k) ?? { k, n: 0, x }; v.n++; m.set(k, v) }
  return [...m.values()].sort((a, b) => b.n - a.n || a.k.localeCompare(b.k))
}

export default function JanelaChamados({ setor, face, cartao, onTrocar, onFechar }: {
  setor: { id: string; nome: string }
  face: FaceChamados
  /** Os números do cartão, para dizer se a lista de agora diverge deles. */
  cartao: CartaoChamados
  onTrocar: (f: FaceChamados) => void
  onFechar: () => void
}) {
  const { query, label } = usePeriod()
  const router = useRouter()
  const painel = useRef<HTMLDivElement>(null)
  const [d, setD] = useState<Resp | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setD(null); setErro(null)
    fetch(`/api/chat-setor?id=${encodeURIComponent(setor.id)}&${query}`, { cache: 'no-store' })
      .then(async (r) => { const j = await r.json(); if (!vivo) return; if (!r.ok) setErro(j.error ?? 'Não consegui ler os chamados.'); else setD(j) })
      .catch(() => vivo && setErro('A rede falhou.'))
    return () => { vivo = false }
  }, [setor.id, query])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    painel.current?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  const abrirFicha = (p: Pessoa) => { if (p?.id) router.push(`/funcionarios/${p.id}`) }

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'min(3vh, 24px) min(2vw, 24px)', zIndex: 60 }}>
      <div ref={painel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="chamados-titulo" onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--n-bg)', color: 'var(--n-text)', border: '1px solid var(--n-border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(15,23,42,.28)', width: 'min(1200px, 100%)', height: 'min(88vh, 900px)', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 22px 12px', background: 'var(--n-card)', borderBottom: '1px solid var(--n-border-2)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-2)', fontWeight: 500 }}>Chat Interno · <b style={{ color: 'var(--n-text)' }}>{setor.nome}</b></div>
            <div id="chamados-titulo" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.4px', marginTop: 2 }}>Chamados entre setores</div>
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 3 }}>
              Período: <b style={{ color: 'var(--n-text-2)' }}>{label}</b> · o setor é o da função gravada no chamado · as duas faces não se somam
            </div>
            <div role="tablist" style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {([['pediu', 'Pediu aos outros', cartao.pediu], ['recebeu', 'Recebeu para atender', cartao.recebeu]] as [FaceChamados, string, number][]).map(([f, t, n]) => (
                <button key={f} role="tab" aria-selected={face === f} type="button" onClick={() => onTrocar(f)}
                  style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${face === f ? 'var(--n-blue)' : 'var(--n-border)'}`, background: face === f ? 'var(--n-blue-soft)' : 'var(--n-card-2)', color: face === f ? 'var(--n-blue)' : 'var(--n-text-2)' }}>
                  {t} · {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)" style={{ flex: 'none', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--n-card-2)', border: '1px solid var(--n-border)', borderRadius: 10, color: 'var(--n-text-2)', cursor: 'pointer' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20 }}>
          {erro ? <div style={{ fontSize: 13, color: 'var(--n-red)' }}>{erro}</div>
            : !d ? <div style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Buscando os chamados no Chat Interno…</div>
            : face === 'pediu' ? <Pediu d={d} cartao={cartao} abrirFicha={abrirFicha} />
            : <Recebeu d={d} cartao={cartao} abrirFicha={abrirFicha} />}
        </div>
      </div>
    </div>
  )
}

/* ── As peças ────────────────────────────────────────────────────────────── */

const bloco: React.CSSProperties = { background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 14, padding: '16px 18px', minWidth: 0 }
const tituloBloco: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, marginBottom: 2 }
const subBloco: React.CSSProperties = { fontSize: 11.5, color: 'var(--n-text-3)', marginBottom: 12 }

function Numero({ n, rotulo, cor }: { n: React.ReactNode; rotulo: string; cor?: string }) {
  return (
    <div style={{ background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
      <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: cor ?? 'var(--n-text)' }}>{n}</div>
      <div style={{ fontSize: 11.5, color: 'var(--n-text-2)', marginTop: 2 }}>{rotulo}</div>
    </div>
  )
}

/** "A lista tem X e o cartão Y" — dito, e não escondido. */
function Diverge({ lista, cartao, oque }: { lista: number; cartao: number; oque: string }) {
  if (lista === cartao) return null
  return (
    <div style={{ fontSize: 11.5, color: 'var(--n-text-2)', background: 'var(--n-amber-soft)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, lineHeight: 1.5 }}>
      {oque}: a lista de agora tem <b>{lista}</b> e o cartão, <b>{cartao}</b>. O cartão sai do espelho, que atualiza de hora em hora; esta lista é lida agora no Chat Interno.
    </div>
  )
}

function Barras({ linhas, cor }: { linhas: { k: string; n: number }[]; cor: string }) {
  const max = Math.max(1, ...linhas.map((l) => l.n))
  if (!linhas.length) return <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum no período.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {linhas.map((l) => (
        <div key={l.k} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) minmax(0, 1fr) 36px', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.k}</span>
          <span style={{ height: 10, background: 'var(--n-card-2)', borderRadius: 20, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(l.n / max) * 100}%`, background: cor, borderRadius: 20 }} /></span>
          <span className="cnum" style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{l.n}</span>
        </div>
      ))}
    </div>
  )
}

function LinhaPessoa({ p, n, extra, abrirFicha }: { p: Pessoa; n: number; extra?: string; abrirFicha: (p: Pessoa) => void }) {
  if (!p) return null
  const Raiz = p.id ? 'button' : 'div'
  return (
    <Raiz type={p.id ? 'button' : undefined} onClick={p.id ? () => abrirFicha(p) : undefined}
      title={p.id ? 'Abrir a ficha' : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 6px', background: 'none', border: 'none', borderRadius: 8, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: p.id ? 'pointer' : 'default' }}>
      {p.fotoId ? <Avatar id={p.fotoId} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-purple)" size={26} />
        : <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--n-card-2)', color: 'var(--n-text-2)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{iniciais(p.nome)}</span>}
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
      {extra && <span style={{ fontSize: 11, color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>{extra}</span>}
      <span className="cnum" style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{n}</span>
    </Raiz>
  )
}

function Lista({ itens, lado, abrirFicha }: { itens: Item[]; lado: 'destino' | 'origem'; abrirFicha: (p: Pessoa) => void }) {
  if (!itens.length) return <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum chamado no período.</div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(130px, 1fr)', gap: 10, padding: '0 6px 8px', borderBottom: '1px solid var(--n-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--n-text-3)' }}>
          <span>Chamado</span><span>{lado === 'destino' ? 'Para o setor' : 'Veio do setor'}</span><span>Quem pediu</span><span>Quem atendeu</span><span>Situação</span>
        </div>
        {itens.map((t) => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(130px, 1fr)', gap: 10, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid var(--n-border-2)', fontSize: 12.5 }}>
            <span style={{ minWidth: 0 }}>
              <b style={{ color: 'var(--n-text-3)', fontWeight: 600 }}>#{t.numero}</b> {t.assunto}
              <span style={{ display: 'block', fontSize: 11, color: 'var(--n-text-3)' }}>aberto em {dataBr(t.abertoEm)}{t.melhoriaDe ? ` · melhoria no ${t.melhoriaDe}` : ''}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              {lado === 'destino' ? <ArrowRight size={13} color="var(--n-text-3)" /> : <ArrowLeft size={13} color="var(--n-text-3)" />}{t[lado].nome}
            </span>
            <PessoaCurta p={t.pediu} abrirFicha={abrirFicha} />
            {t.assumiu ? <PessoaCurta p={t.assumiu} abrirFicha={abrirFicha} /> : <span style={{ color: 'var(--n-text-3)' }}>ninguém ainda</span>}
            <span style={{ color: COR_SITUACAO[t.situacao] ?? 'var(--n-text-2)', fontWeight: 600 }}>
              {SITUACAO[t.situacao] ?? t.situacao}
              {t.situacao === 'concluido' && <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--n-text-3)' }}>em {dataBr(t.fechadoEm)}{t.segundosUteis ? ` · ${dur(t.segundosUteis, 10)} de expediente` : ''}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PessoaCurta({ p, abrirFicha }: { p: Pessoa; abrirFicha: (p: Pessoa) => void }) {
  if (!p) return <span>—</span>
  return p.id
    ? <button type="button" onClick={() => abrirFicha(p)} title="Abrir a ficha" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--n-blue)', cursor: 'pointer', textAlign: 'left' }}>{p.nome}</button>
    : <span>{p.nome}</span>
}

function Pediu({ d, cartao, abrirFicha }: { d: Resp; cartao: CartaoChamados; abrirFicha: (p: Pessoa) => void }) {
  const porDestino = useMemo(() => contar(d.pediu, (t) => t.destino.nome), [d])
  const porPessoa = useMemo(() => contar(d.pediu, (t) => t.pediu?.nome ?? null), [d])
  /* ⚠️ A lista junta os ABERTOS e os CONCLUÍDOS no período (achado do crítico): o
     pedido aberto antes da janela e concluído nela entrava no número "Pedidos
     concluídos" e não aparecia em lugar nenhum. O mesmo que a aba "Recebeu" faz. */
  const lista = useMemo(() => {
    const m = new Map<string, Item>()
    for (const t of [...d.pediu, ...d.pediuConcluidos]) m.set(t.id, t)
    return [...m.values()].sort((a, b) => b.abertoEm.localeCompare(a.abertoEm) || b.numero - a.numero)
  }, [d])
  return (
    <>
      <Diverge lista={d.pediu.length} cartao={cartao.pediu} oque="Pedidos" />
      <Diverge lista={d.pediuConcluidos.length} cartao={cartao.pediuConcluidos} oque="Pedidos concluídos" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Numero n={d.pediu.length} rotulo="Pediu aos outros" cor="var(--n-blue)" />
        <Numero n={d.pediuConcluidos.length} rotulo="Pedidos concluídos no período" cor="var(--n-green)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14, marginBottom: 14 }}>
        <section style={bloco}>
          <div style={tituloBloco}>Para qual setor pediu</div>
          <div style={subBloco}>Os chamados que este setor abriu, por setor de destino</div>
          <Barras linhas={porDestino} cor="var(--n-blue)" />
        </section>
        <section style={bloco}>
          <div style={tituloBloco}>Quem pediu</div>
          <div style={subBloco}>Quantos chamados cada pessoa abriu para outros setores</div>
          {porPessoa.map((x) => <LinhaPessoa key={x.k} p={x.x.pediu} n={x.n} abrirFicha={abrirFicha} />)}
        </section>
      </div>
      <section style={bloco}>
        <div style={tituloBloco}>Os chamados</div>
        <div style={subBloco}>Os que o setor abriu ou teve concluídos no período, do mais recente ao mais antigo</div>
        <Lista itens={lista} lado="destino" abrirFicha={abrirFicha} />
      </section>
    </>
  )
}

function Recebeu({ d, cartao, abrirFicha }: { d: Resp; cartao: CartaoChamados; abrirFicha: (p: Pessoa) => void }) {
  const porOrigem = useMemo(() => contar(d.recebeu, (t) => t.origem.nome), [d])
  // Quem ATENDEU: o crédito da conclusão é de quem assumiu (a regra do Chat).
  const quemConcluiu = useMemo(() => {
    const c = contar(d.concluiu, (t) => t.assumiu?.nome ?? null)
    return c.map((x) => {
      const deles = d.concluiu.filter((t) => t.assumiu?.nome === x.k)
      const seg = deles.reduce((a, t) => a + (t.segundosUteis ?? 0), 0)
      return { ...x, media: deles.length ? Math.round(seg / deles.length) : 0 }
    })
  }, [d])
  const segTotal = d.concluiu.reduce((a, t) => a + (t.segundosUteis ?? 0), 0)
  // A lista: tudo o que chegou OU se encerrou no período, sem repetir.
  const lista = useMemo(() => {
    const m = new Map<string, Item>()
    for (const t of [...d.recebeu, ...d.concluiu, ...d.cancelados]) m.set(t.id, t)
    return [...m.values()].sort((a, b) => b.abertoEm.localeCompare(a.abertoEm) || b.numero - a.numero)
  }, [d])
  return (
    <>
      <Diverge lista={d.recebeu.length} cartao={cartao.recebeu} oque="Recebidos" />
      <Diverge lista={d.concluiu.length} cartao={cartao.recebeuConcluidos} oque="Concluídos" />
      <Diverge lista={d.cancelados.length} cartao={cartao.cancelados} oque="Cancelados" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Numero n={d.recebeu.length} rotulo="Recebeu para atender" cor="var(--n-purple)" />
        <Numero n={d.concluiu.length} rotulo="Concluiu" cor="var(--n-green)" />
        <Numero n={d.cancelados.length} rotulo="Cancelados (fora da média)" cor="var(--n-red)" />
        <Numero n={d.concluiu.length ? dur(Math.round(segTotal / d.concluiu.length), 10) : '—'} rotulo="Tempo médio · só expediente" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14, marginBottom: 14 }}>
        <section style={bloco}>
          <div style={tituloBloco}>De qual setor vieram</div>
          <div style={subBloco}>Os chamados que chegaram para este setor, por setor de origem</div>
          <Barras linhas={porOrigem} cor="var(--n-purple)" />
        </section>
        <section style={bloco}>
          <div style={tituloBloco}>Quem atendeu</div>
          <div style={subBloco}>Chamados concluídos no período por quem assumiu, e o tempo médio de expediente</div>
          {quemConcluiu.length === 0
            ? <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum chamado concluído no período.</div>
            : quemConcluiu.map((x) => <LinhaPessoa key={x.k} p={x.x.assumiu} n={x.n} extra={x.media ? `média ${dur(x.media, 10)}` : undefined} abrirFicha={abrirFicha} />)}
        </section>
      </div>
      <section style={bloco}>
        <div style={tituloBloco}>Os chamados</div>
        <div style={subBloco}>Os que chegaram, foram concluídos ou cancelados no período</div>
        <Lista itens={lista} lado="origem" abrirFicha={abrirFicha} />
      </section>
    </>
  )
}
