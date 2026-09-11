'use client'
import { PainelPessoas } from '../../../PainelPessoas'
import { envolvidosDoSetor, type Envolvidos } from '@/lib/ui/envolvidos-setor'
import type { DeptMetrics } from '@/lib/ui/dept-period'

/** As listas que um clique num indicador abre. */
export type ChavePainel = keyof Envolvidos

const COMO: Record<ChavePainel, { titulo: string; cor: string; sufixo: string; nota?: string }> = {
  atrasos: { titulo: 'Quem se atrasou', cor: 'var(--n-amber)', sufixo: 'atrasos', nota: 'atrasos não abonados' },
  minutos: { titulo: 'Minutos de atraso, por pessoa', cor: 'var(--n-blue)', sufixo: 'minutos', nota: 'minutos somados' },
  advertencias: { titulo: 'Quem recebeu advertência', cor: 'var(--n-orange)', sufixo: 'advertências', nota: 'a partir do 2º atraso do mês' },
  suspensoes: { titulo: 'Suspensões e medidas de LGPD', cor: 'var(--n-purple)', sufixo: 'medidas' },
}

/** Quantas pessoas tem cada lista — para o indicador só virar botão se houver quem mostrar. */
export function contagens(m: DeptMetrics): Record<ChavePainel, number> {
  const e = envolvidosDoSetor(m)
  return { atrasos: e.atrasos.length, minutos: e.minutos.length, advertencias: e.advertencias.length, suspensoes: e.suspensoes.length }
}

export function PainelDoIndicador({ chave, m, onFechar }: { chave: ChavePainel; m: DeptMetrics; onFechar: () => void }) {
  const c = COMO[chave]
  return (
    <PainelPessoas titulo={c.titulo} nota={c.nota} periodo={m.label}
      pessoas={envolvidosDoSetor(m)[chave]} cor={c.cor} sufixo={c.sufixo}
      mostrarNumero aoFechar={onFechar} />
  )
}
