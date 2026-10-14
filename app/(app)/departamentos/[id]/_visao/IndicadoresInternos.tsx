'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import Avatar from '../../../Avatar'
import { Cartao, LinkAcao } from '../../../_visao/ui'
import { agruparIndicadores, NOME_INDICADORES } from '@/lib/servicos/indicadores'
import type { ComDetalhe } from './tipos'

/* ============================================================
   INDICADORES INTERNOS do setor — o resumo (14/10/2026).

   Pedido do Daniel, na página do DP: *"no lugar de Atividade do período e Últimas saídas, coloque um
   único card com o resumo dos indicadores internos que acabamos de mapear"*. Os números são os do
   Fluxo, pelas duas réguas dele (folha, vale, FGTS, DCTF e e-Social pela COMPETÊNCIA; férias,
   admissões e rescisões pela DATA) — ver `run-fluxo-servicos-sync.mjs`.

   ⚠️ Lê `/api/servicos/resumo` no MESMO período do relatório (o filtro do topo), e agrupa com a
   MESMA regra da ficha da pessoa (`lib/servicos/indicadores.ts`): o total do setor e o da ficha não
   podem ser duas contas.
   ⚠️ A pessoa sem vínculo no TalentCare (o serviço sem autor no Fluxo) entra no total e na lista,
   com o nome que veio — tirá-la faria a soma das pessoas não bater com o total.
   ============================================================ */

type Tipo = { tipo: string; n: number }
type Resumo = {
  total: { concluidos: number }
  tipos: { tipo: string; concluidos: number }[]
  pessoas: { id: string | null; nome: string; cargo: string; hasAvatar: boolean; concluidos: number; tipos: Tipo[] }[]
}

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export function IndicadoresInternos({ m, abrir, className }: ComDetalhe & { className?: string }) {
  const router = useRouter()
  const [d, setD] = useState<Resumo | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    setD(null)
    setErro(false)
    const qs = new URLSearchParams({ period: 'custom', from: m.fromDay, to: m.toDay, dept: m.setor.id })
    fetch(`/api/servicos/resumo?${qs}`, { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((x) => { if (vivo) setD(x) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [m.setor.id, m.fromDay, m.toDay])

  const sub = 'Registrados no Fluxo · o que cada pessoa concluiu no período'
  if (!d) {
    return (
      <Cartao titulo={NOME_INDICADORES} Icone={ClipboardList} sub={sub} className={className}>
        <div style={{ fontSize: 12.5, color: erro ? 'var(--n-red)' : 'var(--n-text-2)' }}>
          {erro ? 'Não foi possível carregar os indicadores.' : 'Carregando…'}
        </div>
      </Cartao>
    )
  }

  const familias = agruparIndicadores(d.tipos.filter((t) => t.concluidos > 0).map((t) => ({ tarefa: t.tipo, n: t.concluidos })))
  const pessoas = d.pessoas.filter((p) => p.concluidos > 0)
  const maior = Math.max(1, ...pessoas.map((p) => p.concluidos))

  return (
    <Cartao titulo={NOME_INDICADORES} Icone={ClipboardList} sub={sub} className={className}
      acao={<LinkAcao onClick={() => abrir('servicos')}>Ver detalhes</LinkAcao>}>
      {d.total.concluidos === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum trabalho concluído no período.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: 'var(--n-green)', fontVariantNumeric: 'tabular-nums' }}>
              {d.total.concluidos.toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>
              trabalhos concluídos, em {familias.length} {familias.length === 1 ? 'assunto' : 'assuntos'}
            </span>
          </div>

          {/* um bloco por assunto, na ordem do trabalho do DP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap: 8, marginBottom: 16 }}>
            {familias.map((f) => (
              <div key={f.chave} style={{ background: 'var(--n-card-2, var(--surface-2))', borderRadius: 10, padding: '9px 11px', borderLeft: '3px solid var(--n-blue)' }}>
                <div style={{ fontSize: 11, color: 'var(--n-text-2)', fontWeight: 600 }}>{f.nome}</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--n-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {f.total.toLocaleString('pt-BR')}
                </div>
                {f.partes.length > 0 && (
                  <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.45 }}>
                    {f.partes.map((p, i) => (
                      <span key={p.nome}>{i > 0 && ' · '}{p.nome} <b style={{ color: 'var(--n-text-2)' }}>{p.n}</b></span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* por pessoa: o total e os assuntos dela, do maior para o menor */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-text)', marginBottom: 6 }}>Por pessoa</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pessoas.map((p) => {
              const dela = agruparIndicadores(p.tipos.map((t) => ({ tarefa: t.tipo, n: t.n }))).sort((a, b) => b.total - a.total)
              return (
                <li key={p.id ?? p.nome}>
                  <button type="button" disabled={!p.id} onClick={() => p.id && router.push(`/funcionarios/${p.id}`)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '5px 4px', background: 'none', border: 'none', borderRadius: 10, cursor: p.id ? 'pointer' : 'default', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 40 }}>
                    {p.id
                      ? <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-text-3)" size={28} />
                      : <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--n-border)', flex: 'none' }} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.id ? 'var(--n-text)' : 'var(--n-text-3)' }}>{p.nome}</span>
                        <span style={{ flex: 1, height: 5, background: 'var(--n-border)', borderRadius: 9, overflow: 'hidden', minWidth: 30 }}>
                          <span style={{ display: 'block', width: `${(p.concluidos / maior) * 100}%`, height: '100%', background: 'var(--n-green)', borderRadius: 9 }} />
                        </span>
                        <b style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 30, textAlign: 'right' }}>{p.concluidos}</b>
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dela.map((f) => `${f.nome} ${f.total}`).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.5 }}>
            Folha, vale, FGTS, DCTF, pró-labore e e-Social contam pela <b>competência</b>; férias, admissões e
            rescisões pela <b>data</b> em que foram feitas — as réguas do painel do DP no Fluxo.
          </div>
        </>
      )}
    </Cartao>
  )
}
