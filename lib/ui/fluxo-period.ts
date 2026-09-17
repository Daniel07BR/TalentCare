'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { FluxoUsage, FluxoSetor } from '@/lib/mock/fluxo'

// Busca os CHAMADOS do Fluxo no período (do banco local, /api/fluxo-metrics).
// Devolve as DUAS visões que a tela usa e que não se somam: `map` (por pessoa) e
// `setores` (por setor, nas duas faces do chamado). `desde` é o dia mais antigo
// do espelho — a tela avisa, senão o filtro de Ano parece bug: chamado entre
// setores só existe desde 21/08/2026.
export function useFluxoPeriod(): { map: FluxoUsage | null; setores: FluxoSetor[]; desde: string | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<FluxoUsage | null>(null)
  const [setores, setSetores] = useState<FluxoSetor[]>([])
  const [desde, setDesde] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/fluxo-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: ({ nexusUserId: string } & Record<string, number>)[]; byDept: FluxoSetor[]; desde: string | null }) => {
        if (!alive) return
        const m: FluxoUsage = new Map()
        for (const u of d.byUser ?? []) {
          m.set(u.nexusUserId, {
            chamadosAbertos: u.chamadosAbertos, chamadosAssumidos: u.chamadosAssumidos,
            chamadosConcluidos: u.chamadosConcluidos, segundosResolucao: u.segundosResolucao,
            tarefasAbertas: u.tarefasAbertas, tarefasAssumidas: u.tarefasAssumidas,
            tarefasConcluidas: u.tarefasConcluidas,
          })
        }
        setMap(m)
        setSetores(d.byDept ?? [])
        setDesde(d.desde ?? null)
      })
      .catch(() => {
        if (!alive) return
        setErro(true)
        setMap(new Map())
        setSetores([])
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { map, setores, desde, loading, erro }
}
