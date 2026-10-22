'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAoMudaremTestes } from '../testes/eventos'

export type LinhaPersonalidade = {
  id: string; tipo: string; pct: number[]
  aplicadoEm: string; observacao: string | null; registradoPorNome: string; fluxoRef: string | null; criadoEm: string
}
export type PersonalidadeDaPessoa = {
  pessoa: { id: string; nome: string }
  atual: LinhaPersonalidade | null
  historico: LinhaPersonalidade[]
  podeRegistrar: boolean
}

/**
 * A personalidade de uma pessoa, para a ficha — o irmão do `useDisc`.
 * ⚠️ `negado` é o caso NORMAL de quem não é da régua: a ficha não mostra nada.
 */
export function usePersonalidade(id: string) {
  const [dados, setDados] = useState<PersonalidadeDaPessoa | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')
  const carregar = useCallback(() => {
    let vivo = true
    fetch(`/api/personalidade?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403 || r.status === 404) { if (vivo) setEstado('negado'); return }
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as PersonalidadeDaPessoa
        if (vivo) { setDados(d); setEstado('ok') }
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [id])
  useEffect(() => carregar(), [carregar])
  // o código dos testes grava DISC, personalidade e atenção juntos: os três botões recarregam
  useAoMudaremTestes(carregar)
  return { dados, estado, recarregar: carregar }
}
