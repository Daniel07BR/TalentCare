'use client'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Avatar from '../../../Avatar'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import { Chip } from '../../../_visao/ui'
import s from '../../../_visao/visao.module.css'

/** Uma linha do dia, já com nome e foto (vindos de `quemDoMapa`). */
export type Linha = NonNullable<DeptMetrics['assiduidade']['quemNoDia']>[number]
  & NonNullable<DeptMetrics['assiduidade']['quemDoMapa']>[string]
const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

/** "2026-08-12" → "terça, 12 de agosto". */
const diaLongo = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/* O que o quadro do mapa escondia: QUEM chegou tarde naquele dia, e quanto.
   Abre embaixo do calendário, e não num modal — o calendário continua à vista
   para clicar no dia seguinte sem fechar nada. */
export function DiaDoMapa({ dia, linhas, onFechar, aoClicar }: {
  dia: string; linhas: Linha[]; onFechar: () => void
  /** O que o clique na pessoa faz. Sem ele, a ficha (o relatório do setor); o
   *  painel principal passa o painel da pessoa (assiduidade). */
  aoClicar?: (id: string) => void
}) {
  const router = useRouter()
  const vai = (id: string) => (aoClicar ? aoClicar(id) : router.push(`/funcionarios/${id}`))
  const minutos = linhas.reduce((a, l) => a + l.minutos, 0)
  return (
    <div role="region" aria-label={`Atrasos de ${diaLongo(dia)}`}
      style={{ marginTop: 14, border: '1px solid var(--n-border)', borderRadius: 12, background: 'var(--n-card-2)', padding: '12px 12px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{diaLongo(dia)}</div>
          <div style={{ fontSize: 11, color: 'var(--n-text-3)' }}>
            {linhas.length} {linhas.length === 1 ? 'pessoa' : 'pessoas'}{minutos > 0 && ` · ${minutos} min somados`}
          </div>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar o dia" title="Fechar"
          style={{ background: 'none', border: 'none', color: 'var(--n-text-3)', cursor: 'pointer', padding: 4, display: 'flex', minHeight: 32 }}>
          <X size={16} />
        </button>
      </div>
      {linhas.map((l) => (
        <div key={l.id} role="button" tabIndex={0} className={s.linhaClicavel}
          onClick={() => vai(l.id)} onKeyDown={(e) => { if (e.key === 'Enter') vai(l.id) }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px', minHeight: 44 }}>
          <Avatar id={l.id} hasAvatar={l.hasAvatar} initials={iniciais(l.nome)} color="var(--n-amber)" size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l.nome}{l.saiu && <span style={{ fontSize: 10.5, color: 'var(--n-text-3)', fontWeight: 500 }}> · já saiu</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--n-text-3)' }}>{l.cargo}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {/* ⚠️ Atraso sem minuto medido é "sem minuto", não "0 min": a chegada
                foi tarde, só não se sabe quanto. */}
            <div className="cnum" style={{ fontSize: 14, fontWeight: 800, color: 'var(--n-orange)' }}>
              {l.atrasos > 0 ? (l.minutos > 0 ? `${l.minutos} min` : 'sem minuto') : '—'}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
              {l.atrasos > 1 && <Chip tom="amber">{l.atrasos} atrasos</Chip>}
              {l.abonados > 0 && <Chip tom="green">{l.abonados === 1 ? 'abonado' : `${l.abonados} abonados`}</Chip>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
