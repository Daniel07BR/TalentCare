'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Notas } from '@/lib/disc/calculo'

export type LinhaDisc = {
  id: string; d: number; i: number; s: number; c: number
  aplicadoEm: string; observacao: string | null; registradoPorNome: string; criadoEm: string
}
export type DiscDaPessoa = {
  pessoa: { id: string; nome: string }
  atual: LinhaDisc | null
  historico: LinhaDisc[]
  podeRegistrar: boolean
}

export const notasDe = (l: LinhaDisc): Notas => ({ D: l.d, I: l.i, S: l.s, C: l.c })

/**
 * O DISC de uma pessoa, para a ficha.
 * ⚠️ `negado` é o caso NORMAL de quem não é da régua (a própria pessoa, um
 * colega): a ficha não mostra nada, nem um aviso. Aviso diria "existe um DISC
 * seu que você não pode ver", e isso já é uma informação.
 */
export function useDisc(id: string) {
  const [dados, setDados] = useState<DiscDaPessoa | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')
  const carregar = useCallback(() => {
    let vivo = true
    fetch(`/api/disc?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403 || r.status === 404) { if (vivo) setEstado('negado'); return }
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as DiscDaPessoa
        if (vivo) { setDados(d); setEstado('ok') }
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [id])
  useEffect(() => carregar(), [carregar])
  return { dados, estado, recarregar: carregar }
}
