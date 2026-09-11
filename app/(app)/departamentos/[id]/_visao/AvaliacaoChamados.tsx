'use client'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import s from '../../../_visao/visao.module.css'
import { Cartao, Mini } from '../../../_visao/ui'
import { dur } from './derivar'
import type { SecaoProps } from './tipos'

/** A coluna do meio da 3ª linha: a avaliação mensal e os chamados entre setores. */
export function AvaliacaoChamados({ m }: SecaoProps) {
  const router = useRouter()
  const a = m.avaliacao
  const faltam = Math.max(0, a.avaliaveis - a.publicadas)
  const cs = m.chamadosDoSetor
  return (
    <div className={s.pilha}>
      <Cartao titulo="Avaliação mensal" Icone={ClipboardCheck}
        sub={`Competência de ${competenciaLabel(a.competencia)} · a avaliação é mensal e não acompanha o filtro`}
        acao={
          <button type="button" onClick={() => router.push('/avaliacoes')} title="Abrir a fila de avaliações"
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: faltam ? 'var(--n-amber-soft)' : 'var(--n-green-soft)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-2)' }}>{faltam ? 'Faltam avaliar' : 'Todos avaliados'}</span>
              <span className="cnum" style={{ display: 'block', fontSize: 22, fontWeight: 800, color: faltam ? 'var(--n-amber)' : 'var(--n-green)' }}>{faltam || a.publicadas}</span>
            </span>
            <ChevronRight size={16} color="var(--n-text-3)" />
          </button>
        }>
        <div style={{ fontSize: 12, color: 'var(--n-text-2)' }}>
          {a.publicadas} de {a.avaliaveis} publicadas{a.media !== null && <> · nota média <b style={{ color: 'var(--n-text)' }}>{a.media.toFixed(1)}</b></>}
        </div>
      </Cartao>

      <Cartao titulo="Chamados entre setores" Icone={ArrowLeftRight}
        sub="Duas faces do mesmo pedido — não se somam">
        {!cs || (cs.pediu === 0 && cs.recebeu === 0) ? (
          <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum chamado entre setores no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            <Mini valor={cs.pediu} rotulo="Pediu aos outros" tom="blue" />
            <Mini valor={cs.pediuConcluidos} rotulo="Desses, atendidos" tom="blue" />
            <Mini valor={cs.recebeu} rotulo="Recebeu para atender" tom="purple" />
            <Mini valor={cs.recebeuConcluidos} rotulo="Concluiu" tom="green" />
            <Mini valor={cs.cancelados} rotulo="Cancelados (fora da média)" tom="red" />
            <Mini valor={cs.recebeuConcluidos ? dur(Math.round(cs.segundos / cs.recebeuConcluidos), 10) : '—'} rotulo="Tempo médio · só expediente" />
          </div>
        )}
      </Cartao>
    </div>
  )
}
