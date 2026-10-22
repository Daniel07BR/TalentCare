'use client'
import { useCallback, useEffect, useState } from 'react'
import type { resumoDaBusca, resumoDaConferencia } from '@/lib/testes/atencao'
import { useAoMudaremTestes } from './eventos'

export type LinhaAtencao = {
  id: string; aplicadoEm: string; codigo: string | null; observacao: string | null
  registradoPorNome: string; fluxoRef: string | null
  busca: ReturnType<typeof resumoDaBusca>
  conferencia: ReturnType<typeof resumoDaConferencia>
}
export type AtencaoDaPessoa = {
  pessoa: { id: string; nome: string }
  atual: LinhaAtencao | null
  historico: LinhaAtencao[]
  podeRegistrar: boolean
}

/** A atenção de uma pessoa, para a ficha. ⚠️ `negado` é o caso normal de quem não é da régua. */
export function useAtencao(id: string) {
  const [dados, setDados] = useState<AtencaoDaPessoa | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')
  const carregar = useCallback(() => {
    let vivo = true
    fetch(`/api/atencao?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403 || r.status === 404) { if (vivo) setEstado('negado'); return }
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as AtencaoDaPessoa
        if (vivo) { setDados(d); setEstado('ok') }
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [id])
  useEffect(() => carregar(), [carregar])
  useAoMudaremTestes(carregar)
  return { dados, estado, recarregar: carregar }
}
