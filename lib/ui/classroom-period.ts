'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ClassroomUsage } from '@/lib/mock/classroom'

// Busca o uso do ClassRoom por usuário no período (banco local) p/ o classroomVM.
export function useClassroomPeriod(): { map: ClassroomUsage | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<ClassroomUsage | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/classroom-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: { nexusUserId: string; videos: number; courses: number; created: number }[] }) => {
        if (!alive) return
        const m: ClassroomUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { videos: u.videos, courses: u.courses, created: u.created })
        setMap(m)
      })
      .catch(() => { if (alive) { setMap(new Map()); setErro(true) } })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { map, loading, erro }
}
