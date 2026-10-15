'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ArrowRight, ClipboardList, X } from 'lucide-react'
import Avatar from '../Avatar'
import Donut, { type DonutSeg } from '../Donut'
import { agruparIndicadores, administradosDe, ehFolha, REGRA_ADMINISTRADOS } from '@/lib/servicos/indicadores'

/* ============================================================
   INDICADORES INTERNOS DO DP — a janela "Ver detalhes" quando a origem é o FLUXO (14/10/2026).

   Pedidos do Daniel no mesmo dia:
   - *"DP não usa planilha ou lançamentos do Gestta, pode tirar isso totalmente do TalentCare do DP"* —
     nada de planilha, envio ou Gestta aqui: os números chegam sozinhos do Fluxo;
   - *"em Quem fez, trocar para um indicador de total de funcionários administrados pela pessoa"* — a
     regra é `administradosDe` (folha = funcionários da empresa fechada; férias/rescisão/admissão = 1);
   - *"clicar nos usuários e ver outra janela no centro da tela, com o resumo completo dele"* e
     *"clicar nos tipos de serviço e abrir uma janela com a lista dos usuários e quantos fez"*.

   ⚠️ A janela central abre POR CIMA da "Ver detalhes" (portal no body, zIndex acima) e fecha SÓ a si
   mesma: o Esc é capturado antes do da janela de baixo, e o clique fora para no próprio fundo.
   ============================================================ */

export type TipoDaPessoa = { tipo: string; n: number; administrados: number }
export type PessoaDoResumo = {
  id: string | null; nome: string; cargo: string; hasAvatar: boolean; ativo: boolean
  concluidos: number; administrados: number; tipos: TipoDaPessoa[]
}
export type DadosDoFluxo = {
  setor: string
  total: { concluidos: number; administrados: number; folhasSemNumero: number; semDono: number }
  pessoas: PessoaDoResumo[]
  tipos: { tipo: string; concluidos: number; administrados: number }[]
}

const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const fmt = (n: number) => n.toLocaleString('pt-BR')
const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, minWidth: 0 }

const Numero = ({ valor, rotulo, cor, nota }: { valor: string; rotulo: string; cor: string; nota?: string }) => (
  <div className="tc-card" style={{ ...cartao, padding: '16px 18px' }}>
    <div className="cnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: cor }}>{valor}</div>
    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{rotulo}</div>
    {nota && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.4 }}>{nota}</div>}
  </div>
)

export default function ResumoDoFluxo({ dados, periodo }: { dados: DadosDoFluxo; periodo: string }) {
  const [pessoa, setPessoa] = useState<PessoaDoResumo | null>(null)
  const [tipo, setTipo] = useState<string | null>(null)
  const t = dados.total
  const pessoas = [...dados.pessoas]
    .filter((p) => p.concluidos > 0)
    .sort((a, b) => b.administrados - a.administrados || b.concluidos - a.concluidos || a.nome.localeCompare(b.nome))
  const maxAdm = Math.max(1, ...pessoas.map((p) => p.administrados))
  const concluidosPorTipo = dados.tipos.filter((x) => x.concluidos > 0)
  const seg: DonutSeg[] = concluidosPorTipo.slice(0, 6).map((x, k) => ({ id: x.tipo, nome: x.tipo, value: x.concluidos, color: CORES[k] }))
  const resto = concluidosPorTipo.slice(6).reduce((a, x) => a + x.concluidos, 0)
  if (resto) seg.push({ id: '__outros', nome: `Outros (${concluidosPorTipo.length - 6} tipos)`, value: resto, color: 'var(--text-mute)' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', ...cartao }}>
        <ClipboardList size={18} style={{ color: 'var(--chart-2)', flex: 'none' }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Registrados no <b style={{ color: 'var(--text)' }}>Fluxo</b>, automaticamente. Folha, vale, FGTS, DCTF, pró-labore e
          e-Social contam pela <b>competência</b>; férias, admissões, rescisões e homologações pela <b>data</b> em que foram feitas.
        </div>
      </div>

      {t.concluidos === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '30px 0', textAlign: 'center' }}>
          Nenhum trabalho concluído em {periodo.toLowerCase()}.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <Numero valor={fmt(t.administrados)} rotulo="Funcionários administrados" cor="var(--accent)"
              nota={t.folhasSemNumero ? `${t.folhasSemNumero} ${t.folhasSemNumero === 1 ? 'folha sem cadastro de funcionários não somou' : 'folhas sem cadastro de funcionários não somaram'}` : REGRA_ADMINISTRADOS} />
            <Numero valor={fmt(t.concluidos)} rotulo="Trabalhos concluídos" cor="var(--success)" />
            <Numero valor={String(pessoas.filter((p) => p.id).length)} rotulo="Pessoas que concluíram" cor="var(--chart-4)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 16, alignItems: 'start' }}>
            {/* QUEM — funcionários administrados por pessoa; clique abre o resumo dela */}
            <div className="tc-card" style={cartao}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Funcionários administrados</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 14px', lineHeight: 1.5 }}>
                {REGRA_ADMINISTRADOS} · clique na pessoa para o resumo completo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pessoas.map((p) => (
                  <button key={p.id ?? p.nome} type="button" className="tc-row" onClick={() => setPessoa(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}>
                    <Avatar id={p.id ?? ''} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--chart-4)" size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.id ? 'var(--text)' : 'var(--text-mute)' }}>
                          {p.nome}{!p.ativo && <span style={{ fontWeight: 500, color: 'var(--text-mute)' }}> · saiu</span>}
                        </span>
                        <span className="cnum" style={{ flex: 'none' }}>
                          <b style={{ color: 'var(--accent)' }}>{fmt(p.administrados)}</b>
                          <span style={{ color: 'var(--text-mute)', fontSize: 11.5 }}> func. · {fmt(p.concluidos)} trabalhos</span>
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)', marginTop: 5 }}>
                        <div style={{ width: `${(p.administrados / maxAdm) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agruparIndicadores(p.tipos.map((x) => ({ tarefa: x.tipo, n: x.n }))).sort((a, b) => b.total - a.total)
                          .map((f) => `${f.nome} ${f.total}`).join(' · ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* O QUÊ — os tipos; clique abre quem fez aquele tipo */}
            <div className="tc-card" style={cartao}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Tipos de serviço</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 14px' }}>
                {concluidosPorTipo.length} tipos no período · clique num tipo para ver quem fez
              </div>
              {seg.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <Donut segments={seg} total={t.concluidos} centerLabel="concluídos" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {concluidosPorTipo.map((x, k) => (
                  <button key={x.tipo} type="button" className="tc-row" onClick={() => setTipo(x.tipo)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px', borderTop: k ? '1px solid var(--border-soft)' : 'none', fontSize: 12.5, background: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, flex: 'none', background: k < 6 ? CORES[k] : 'var(--text-mute)' }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.tipo}>{x.tipo}</span>
                    {x.administrados > 0 && ehFolha(x.tipo) && <span className="cnum" style={{ color: 'var(--text-mute)', fontSize: 11.5 }}>{fmt(x.administrados)} func.</span>}
                    <b className="cnum" style={{ color: 'var(--success)' }}>{fmt(x.concluidos)}</b>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {pessoa && <JanelaDaPessoa pessoa={pessoa} periodo={periodo} onFechar={() => setPessoa(null)} />}
      {tipo && <JanelaDoTipo tipo={tipo} pessoas={dados.pessoas} periodo={periodo} onFechar={() => setTipo(null)} onPessoa={(p) => { setTipo(null); setPessoa(p) }} />}
    </div>
  )
}

/** A moldura das janelas centrais — por cima da "Ver detalhes", fechando só a si mesma. */
function JanelaCentral({ titulo, sub, cabeca, onFechar, children }: {
  titulo: string; sub: React.ReactNode; cabeca?: React.ReactNode; onFechar: () => void; children: React.ReactNode
}) {
  useEffect(() => {
    // ⚠️ captura: o Esc fecha esta janela e NÃO chega ao listener da "Ver detalhes" embaixo
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onFechar() } }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onFechar])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={(e) => { e.stopPropagation(); onFechar() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()} className="cpop"
        style={{ width: 'min(760px, 100%)', maxHeight: 'min(86vh, 900px)', overflowY: 'auto', background: 'var(--bg, var(--surface))', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          {cabeca}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.3px' }}>{titulo}</div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 2 }}>{sub}</div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)" className="tc-btn"
            style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </header>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** O RESUMO COMPLETO da pessoa: funcionários administrados, trabalhos, assuntos e cada tipo. */
function JanelaDaPessoa({ pessoa: p, periodo, onFechar }: { pessoa: PessoaDoResumo; periodo: string; onFechar: () => void }) {
  const router = useRouter()
  const familias = agruparIndicadores(p.tipos.map((x) => ({ tarefa: x.tipo, n: x.n })))
  return (
    <JanelaCentral titulo={p.nome} onFechar={onFechar}
      sub={<>{p.cargo} · Indicadores internos · <b>{periodo}</b></>}
      cabeca={<Avatar id={p.id ?? ''} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--chart-4)" size={44} />}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Numero valor={fmt(p.administrados)} rotulo="Funcionários administrados" cor="var(--accent)" nota={REGRA_ADMINISTRADOS} />
        <Numero valor={fmt(p.concluidos)} rotulo="Trabalhos concluídos" cor="var(--success)" />
        <Numero valor={String(familias.length)} rotulo={familias.length === 1 ? 'Assunto' : 'Assuntos'} cor="var(--chart-4)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {familias.map((f) => (
          <div key={f.chave} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', borderLeft: '3px solid var(--chart-2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>{f.nome}</div>
            <div className="cnum" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.5px' }}>{fmt(f.total)}</div>
            {f.partes.length > 0 && (
              <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3, lineHeight: 1.45 }}>
                {f.partes.map((x, i) => <span key={x.nome}>{i > 0 && ' · '}{x.nome} <b style={{ color: 'var(--text-dim)' }}>{x.n}</b></span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={cartao}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Cada tipo de serviço</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: 'var(--text-mute)', fontSize: 11 }}>
              <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>Tipo</th>
              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>Trabalhos</th>
              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>Funcionários</th>
            </tr>
          </thead>
          <tbody>
            {p.tipos.map((x) => (
              <tr key={x.tipo} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '6px 0' }}>{x.tipo}</td>
                <td className="cnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(x.n)}</td>
                <td className="cnum" style={{ textAlign: 'right', color: x.administrados ? 'var(--text)' : 'var(--text-mute)' }}>
                  {administradosDe(x.tipo, 0) || ehFolha(x.tipo) ? fmt(x.administrados) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p.id && (
        <button type="button" onClick={() => router.push(`/funcionarios/${p.id}`)} className="tc-btn"
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          Abrir a ficha de {p.nome.split(' ')[0]} <ArrowRight size={14} />
        </button>
      )}
    </JanelaCentral>
  )
}

/** QUEM FEZ um tipo de serviço, e quanto. */
function JanelaDoTipo({ tipo, pessoas, periodo, onFechar, onPessoa }: {
  tipo: string; pessoas: PessoaDoResumo[]; periodo: string; onFechar: () => void; onPessoa: (p: PessoaDoResumo) => void
}) {
  const linhas = pessoas
    .map((p) => ({ p, x: p.tipos.find((t) => t.tipo === tipo) }))
    .filter((r): r is { p: PessoaDoResumo; x: TipoDaPessoa } => !!r.x)
    .sort((a, b) => b.x.n - a.x.n || b.x.administrados - a.x.administrados)
  const total = linhas.reduce((a, r) => a + r.x.n, 0)
  const totalAdm = linhas.reduce((a, r) => a + r.x.administrados, 0)
  const contaFuncionario = ehFolha(tipo) || administradosDe(tipo, 0) > 0
  const max = Math.max(1, ...linhas.map((r) => r.x.n))
  return (
    <JanelaCentral titulo={tipo} onFechar={onFechar}
      sub={<>{fmt(total)} concluídos por {linhas.length} {linhas.length === 1 ? 'pessoa' : 'pessoas'}{contaFuncionario && <> · {fmt(totalAdm)} funcionários administrados</>} · <b>{periodo}</b></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {linhas.map(({ p, x }) => (
          <button key={p.id ?? p.nome} type="button" className="tc-row" onClick={() => onPessoa(p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}>
            <Avatar id={p.id ?? ''} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--chart-4)" size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: p.id ? 'var(--text)' : 'var(--text-mute)' }}>{p.nome}</span>
                <span className="cnum">
                  <b style={{ color: 'var(--success)' }}>{fmt(x.n)}</b>
                  {contaFuncionario && <span style={{ color: 'var(--text-mute)', fontSize: 11.5 }}> · {fmt(x.administrados)} func.</span>}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)', marginTop: 5 }}>
                <div style={{ width: `${(x.n / max) * 100}%`, height: '100%', background: 'var(--success)' }} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </JanelaCentral>
  )
}
