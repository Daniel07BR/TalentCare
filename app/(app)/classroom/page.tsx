'use client'
import { useEffect } from 'react'
import { usePeriod } from '@/lib/ui/period'
import Resumo from './Resumo'

/* O corpo da página mora em `Resumo.tsx` desde 11/09/2026: o relatório do setor
   abre o MESMO resumo numa janela, recortado para o setor — ver
   `lib/ui/recorte-setor.tsx`. */
export default function Page() {
  const { setPeriod } = usePeriod()
  /* ⚠️ Resumo do ClassRoom abre por padrão no acumulado do ano corrente — e este
     efeito fica AQUI, na rota, e não no resumo: dentro da janela do relatório do
     setor ele trocaria o filtro da tela de trás sem ninguém pedir. */
  useEffect(() => { setPeriod('Ano') }, [setPeriod])
  return <Resumo />
}
