'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, ArrowRight } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'
import { useRecorteSetor } from '@/lib/ui/recorte-setor'
import Avatar from '../Avatar'
import EsqueletoResumo from '../EsqueletoResumo'
import Donut, { type DonutSeg } from '../Donut'

/* ============================================================
   SERVIÇOS DO SETOR — a janela de resumo (01/10/2026).

   Pedido do Daniel, depois de o Legal reclamar: o cartão "Serviços do setor"
   levava direto à tela da planilha, e todo outro cartão de "Sistemas e
   produtividade" abre uma janela. Agora abre aqui — quem concluiu, o que ficou
   em aberto, os tipos de serviço — e a planilha fica a um botão.

   ⚠️ Só existe DENTRO de um setor (a planilha é do setor). Sem o nome do
   cliente — ver a rota `/api/servicos/resumo`.
   ============================================================ */

type Pessoa = { id: string | null; nome: string; cargo: string; hasAvatar: boolean; ativo: boolean; concluidos: number; abertos: number; minutos: number; tipos: { tipo: string; n: number }[] }
type Dados = {
  setor: string
  total: { concluidos: number; abertos: number; desconsiderados: number; minutos: number; semDono: number }
  ultimoDiaComDado: string | null
  pessoas: Pessoa[]
  tipos: { tipo: string; concluidos: number; abertos: number }[]
  envios: { arquivo: string; diaDe: string; diaAte: string; enviadoEm: string; por: string | null }[]
}

const COR = 'var(--chart-4)'
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
const br = (d: string) => d.split('-').reverse().join('/')
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

const Numero = ({ valor, rotulo, cor }: { valor: string | number; rotulo: string; cor: string }) => (
  <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
    <div className="cnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: cor }}>{valor}</div>
    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{rotulo}</div>
  </div>
)

export default function ServicosResumo() {
  const setor = useRecorteSetor()
  const router = useRouter()
  const { fromDay, toDay, label } = usePeriod()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!setor || !fromDay || !toDay) return
    let vivo = true
    setDados(null)
    const qs = new URLSearchParams({ period: 'custom', from: fromDay, to: toDay, dept: setor.id })
    fetch(`/api/servicos/resumo?${qs}`)
      .then(async (r) => { if (!r.ok) throw new Error(r.status === 403 ? 'Você não tem acesso a estes números.' : 'Não foi possível carregar.'); return r.json() })
      .then((d) => { if (vivo) { setDados(d); setErro(null) } })
      .catch((e) => { if (vivo) setErro(e.message) })
    return () => { vivo = false }
  }, [setor, fromDay, toDay])

  if (!setor) return <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>A planilha de serviços é de cada setor — abra pelo relatório do setor.</div>
  if (erro) return <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{erro}</div>
  if (!dados) return <EsqueletoResumo />

  const t = dados.total
  const abrirPlanilha = () => router.push(`/servicos?setor=${setor.id}`)
  const vazio = t.concluidos + t.abertos === 0

  /* A pizza dos tipos concluídos: os 6 maiores com cor, o resto em "Outros" — e a
     lista completa ao lado, para nenhum tipo sumir dentro de "Outros". */
  const concluidosPorTipo = dados.tipos.filter((x) => x.concluidos > 0)
  const seg: DonutSeg[] = concluidosPorTipo.slice(0, 6).map((x, k) => ({ id: x.tipo, nome: x.tipo, value: x.concluidos, color: CORES[k] }))
  const resto = concluidosPorTipo.slice(6).reduce((a, x) => a + x.concluidos, 0)
  if (resto) seg.push({ id: '__outros', nome: `Outros (${concluidosPorTipo.length - 6} tipos)`, value: resto, color: 'var(--text-mute)' })
  const maxPessoa = Math.max(1, ...dados.pessoas.map((p) => p.concluidos + p.abertos))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* De onde vêm os números — e o caminho para atualizar. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <FileSpreadsheet size={18} style={{ color: COR, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 240, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {dados.envios.length > 0
            ? dados.envios.map((e) => (
                <div key={e.arquivo + e.enviadoEm}>
                  Planilha <b style={{ color: 'var(--text)' }}>{e.arquivo}</b>, de {br(e.diaDe)} a {br(e.diaAte)}
                  {' '}— enviada {e.por ? `por ${e.por} ` : ''}em {new Date(e.enviadoEm).toLocaleDateString('pt-BR')}.
                </div>
              ))
            : <>Nenhuma planilha do {dados.setor} cobre <b style={{ color: 'var(--text)' }}>{label}</b>.{dados.ultimoDiaComDado && <> A mais recente vai até {br(dados.ultimoDiaComDado)}.</>}</>}
        </div>
        <button type="button" onClick={abrirPlanilha} className="tc-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          Abrir a planilha do setor <ArrowRight size={14} />
        </button>
      </div>

      {vazio ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '30px 0', textAlign: 'center' }}>
          Nenhum serviço registrado neste período. Para lançar o mês, envie a planilha do Gestta pelo botão acima.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Numero valor={t.concluidos.toLocaleString('pt-BR')} rotulo="Serviços concluídos" cor="var(--success)" />
            <Numero valor={t.abertos.toLocaleString('pt-BR')} rotulo="Em aberto" cor="var(--warning)" />
            <Numero valor={dados.pessoas.filter((p) => p.concluidos > 0).length} rotulo="Pessoas que concluíram" cor={COR} />
            {/* Sem tempo na tela (Daniel, 01/10/2026) — só quantidades. */}
          </div>
          {t.semDono > 0 && (
            <div style={{ fontSize: 12, color: 'var(--warning)' }}>
              {t.semDono} {t.semDono === 1 ? 'serviço está' : 'serviços estão'} com um nome que ainda não foi ligado a ninguém do TalentCare — resolva na planilha do setor.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 16, alignItems: 'start' }}>
            {/* QUEM — barra de concluídos e de abertos por pessoa. */}
            <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Quem fez</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 14px' }}>
                Concluídos e em aberto por pessoa · <span style={{ color: 'var(--success)' }}>■</span> concluídos <span style={{ color: 'var(--warning)' }}>■</span> em aberto
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dados.pessoas.map((p) => (
                  <div key={p.id ?? p.nome} className={p.id ? 'tc-row' : undefined}
                    onClick={p.id ? () => router.push(`/funcionarios/${p.id}`) : undefined}
                    title={p.id ? 'Abrir a ficha' : 'Nome do arquivo ainda sem vínculo no TalentCare'}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 'var(--radius-sm)', cursor: p.id ? 'pointer' : 'default' }}>
                    <Avatar id={p.id ?? ''} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color={COR} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.nome}{!p.ativo && <span style={{ fontWeight: 500, color: 'var(--text-mute)' }}> · saiu</span>}
                        </span>
                        <span className="cnum" style={{ flex: 'none' }}>
                          <b style={{ color: 'var(--success)' }}>{p.concluidos}</b>
                          {p.abertos > 0 && <span style={{ color: 'var(--warning)' }}> · {p.abertos} em aberto</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)', marginTop: 5 }}>
                        <div style={{ width: `${(p.concluidos / maxPessoa) * 100}%`, background: 'var(--success)' }} />
                        <div style={{ width: `${(p.abertos / maxPessoa) * 100}%`, background: 'var(--warning)' }} />
                      </div>
                      {p.tipos.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.tipos.slice(0, 3).map((x) => `${x.tipo} (${x.n})`).join(' · ')}{p.tipos.length > 3 ? ` · +${p.tipos.length - 3} tipos` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* O QUÊ — os tipos de serviço concluídos. */}
            <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Tipos de serviço</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 14px' }}>{dados.tipos.length} {dados.tipos.length === 1 ? 'tipo' : 'tipos'} no período · a pizza conta os concluídos</div>
              {seg.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <Donut segments={seg} total={t.concluidos} centerLabel="concluídos" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {dados.tipos.map((x, k) => (
                  <div key={x.tipo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: k ? '1px solid var(--border-soft)' : 'none', fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, flex: 'none', background: x.concluidos === 0 ? 'var(--surface-3)' : k < 6 ? CORES[k] : 'var(--text-mute)' }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.tipo}>{x.tipo}</span>
                    <b className="cnum" style={{ color: 'var(--success)' }}>{x.concluidos}</b>
                    {x.abertos > 0 && <span className="cnum" style={{ color: 'var(--warning)', fontSize: 11.5 }}>+{x.abertos} em aberto</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
