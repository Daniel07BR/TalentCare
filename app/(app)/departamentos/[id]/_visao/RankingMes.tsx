'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import Avatar from '../../../Avatar'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import s from '../../../_visao/visao.module.css'
import { Cartao, Chip, LinkAcao } from '../../../_visao/ui'
import { num, rankingDoMes } from './derivar'
import type { SecaoProps } from './tipos'

const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()
type P = { suspensoesAtraso?: number | null; lgpdSuspensoes?: number | null }
/** Suspensões da pessoa no período: por atraso + de LGPD (mesma soma do azulejo do topo). */
const susp = (p: P) => (p.suspensoesAtraso ?? 0) + (p.lgpdSuspensoes ?? 0)
const tituloSusp = (p: P) => [
  p.suspensoesAtraso ? `${p.suspensoesAtraso} por atraso` : '',
  p.lgpdSuspensoes ? `${p.lgpdSuspensoes} de LGPD` : '',
].filter(Boolean).join(' · ')

/** As pessoas do setor pela pontuação do mês, com as ocorrências ao lado. */
export function RankingMes({ m }: SecaoProps) {
  const router = useRouter()
  const [todos, setTodos] = useState(false)
  const lista = rankingDoMes(m)
  const vis = todos ? lista : lista.slice(0, 7)
  const max = Math.max(1, ...lista.map((p) => p.pontuacao ?? 0))
  return (
    <Cartao titulo="Ranking do mês" Icone={Trophy}
      sub={`As pessoas do setor • pontuação de ${competenciaLabel(m.pontuacaoDoMes.competencia)}${m.pontuacaoDoMes.parcial ? ' (parcial)' : ''}`}
      acao={lista.length > 7 && <LinkAcao onClick={() => setTodos((v) => !v)}>{todos ? 'Ver menos' : 'Ver todos'}</LinkAcao>}>
      {lista.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Ninguém do setor pontuou neste mês.</div>
      ) : (
        <div role="table" aria-label="Ranking do mês">
          <div role="row" style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1.4fr) minmax(60px,1fr) 46px 128px', gap: 10, fontSize: 10.5, color: 'var(--n-text-3)', fontWeight: 600, padding: '0 6px 6px' }}>
            <span>#</span><span>Pessoa</span><span /><span style={{ textAlign: 'right' }}>Pontos</span><span style={{ textAlign: 'right' }}>Ocorrências</span>
          </div>
          {vis.map((p, i) => (
            <div key={p.id} role="row" tabIndex={0} className={s.linhaClicavel}
              onClick={() => router.push(`/funcionarios/${p.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/funcionarios/${p.id}`) }}
              style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1.4fr) minmax(60px,1fr) 46px 128px', gap: 10, alignItems: 'center', padding: '6px', borderTop: '1px solid var(--n-border-2)', minHeight: 44 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-text-3)' }}>{i + 1}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-blue)" size={28} />
                <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
              </span>
              <span style={{ height: 8, background: 'var(--n-card-2)', borderRadius: 99, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${((p.pontuacao ?? 0) / max) * 100}%`, background: 'var(--n-blue)', borderRadius: 99 }} />
              </span>
              <span className="cnum" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>{p.pontuacao === null ? '—' : num(p.pontuacao)}</span>
              <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* ⚠️⚠️ A SUSPENSÃO PRIMEIRO, e em ROXO — a cor de suspensão em todo o
                    sistema (o azulejo do topo, a ficha, o relatório completo). Faltava
                    aqui: o topo do Fiscal acendia "Suspensões 2" e a linha de quem
                    levou mostrava só adv/atr (pedido do dono, 11/09/2026). */}
                {susp(p) > 0 && <span title={tituloSusp(p)}><Chip tom="purple">{susp(p)} susp</Chip></span>}
                {p.advertencias > 0 && <Chip tom="red">{p.advertencias} adv</Chip>}
                {p.atrasos > 0 && <Chip tom="amber">{p.atrasos} atr</Chip>}
                {p.advertencias === 0 && p.atrasos === 0 && susp(p) === 0 && <span style={{ color: 'var(--n-text-3)', fontSize: 12 }}>—</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Cartao>
  )
}
