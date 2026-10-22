'use client'
import { useEffect } from 'react'

/* Um código grava TRÊS testes de uma vez (DISC, personalidade, atenção), e cada um tem o seu botão e o seu hook na
   ficha. O aviso faz os três recarregarem juntos — senão o DISC novo só apareceria depois de recarregar a página. */
const EVENTO = 'tc-testes-mudaram'

export const avisarTestesMudaram = () => window.dispatchEvent(new Event(EVENTO))

export function useAoMudaremTestes(recarregar: () => void) {
  useEffect(() => {
    const h = () => recarregar()
    window.addEventListener(EVENTO, h)
    return () => window.removeEventListener(EVENTO, h)
  }, [recarregar])
}
