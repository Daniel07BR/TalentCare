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
  /* ⚠️ TABELA (pedido do Daniel, 14/10/2026: "ficou muito grande… os resultados de cada item em colunas e
     os totais na frente dos nomes"): uma linha por pessoa, o TOTAL logo depois do nome, uma coluna por
     assunto e a 1ª linha com o total do SETOR. O detalhe (porte da folha, tipo da conferência) vai na
     dica do número — é o que deixava a versão em blocos alta. */
  const pessoas = d.pessoas.filter((p) => p.concluidos > 0).map((p) => ({
    ...p,
    porFamilia: new Map(agruparIndicadores(p.tipos.map((t) => ({ tarefa: t.tipo, n: t.n }))).map((f) => [f.chave, f])),
  }))
  const dica = (f?: { nome: string; total: number; partes: { nome: string; n: number }[] }) =>
    f ? `${f.nome}: ${f.total}${f.partes.length ? ` (${f.partes.map((x) => `${x.nome} ${x.n}`).join(' · ')})` : ''}` : undefined
  const num: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  const cab: React.CSSProperties = { ...num, fontSize: 10.5, fontWeight: 700, color: 'var(--n-text-3)', textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: '1px solid var(--n-border)' }

  return (
    <Cartao titulo={NOME_INDICADORES} Icone={ClipboardList} className={className}
      sub={<><b style={{ color: 'var(--n-green)' }}>{d.total.concluidos.toLocaleString('pt-BR')}</b> trabalhos concluídos no período · registrados no Fluxo</>}
      acao={<LinkAcao onClick={() => abrir('servicos')}>Ver detalhes</LinkAcao>}>
      {d.total.concluidos === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum trabalho concluído no período.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...cab, textAlign: 'left' }}>Pessoa</th>
                  <th style={{ ...cab, color: 'var(--n-text)' }}>Total</th>
                  {familias.map((f) => <th key={f.chave} style={cab} title={f.nome}>{f.curto}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'var(--n-card-2)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--n-text)' }}>Setor</td>
                  <td style={{ ...num, fontWeight: 800, color: 'var(--n-green)' }}>{d.total.concluidos.toLocaleString('pt-BR')}</td>
                  {familias.map((f) => (
                    <td key={f.chave} style={{ ...num, fontWeight: 700, color: 'var(--n-text)' }} title={dica(f)}>{f.total.toLocaleString('pt-BR')}</td>
                  ))}
                </tr>
                {pessoas.map((p) => (
                  <tr key={p.id ?? p.nome} style={{ borderTop: '1px solid var(--n-border)' }}>
                    <td style={{ padding: '4px 8px', minWidth: 150 }}>
                      <button type="button" disabled={!p.id} onClick={() => p.id && router.push(`/funcionarios/${p.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: p.id ? 'pointer' : 'default', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 32 }}>
                        {p.id
                          ? <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-text-3)" size={24} />
                          : <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--n-border)', flex: 'none' }} />}
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: p.id ? 'var(--n-text)' : 'var(--n-text-3)' }}>{p.nome}</span>
                      </button>
                    </td>
                    <td style={{ ...num, fontWeight: 800, color: 'var(--n-text)' }}>{p.concluidos}</td>
                    {familias.map((f) => {
                      const x = p.porFamilia.get(f.chave)
                      return (
                        <td key={f.chave} style={{ ...num, color: x ? 'var(--n-text-2)' : 'var(--n-text-3)' }} title={dica(x)}>
                          {x ? x.total : <span style={{ opacity: 0.5 }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.5 }}>
            Folha, vale, FGTS, DCTF, pró-labore e e-Social contam pela <b>competência</b>; férias, admissões,
            rescisões e homologações pela <b>data</b> em que foram feitas — as réguas do painel do DP no Fluxo. Passe o mouse
            num número para ver o detalhe (porte da folha, tipo da conferência).
          </div>
        </>
      )}
    </Cartao>
  )
}
