'use client'
import { CorrijaNoFluxo } from '@/lib/ui/corrija-no-fluxo'

/**
 * Nascimento e admissão da ficha — SOMENTE LEITURA desde 05/10/2026: a fonte é a ficha de RH do
 * DP no Fluxo (o editor antigo está no histórico do git). Os props ficam para o cabeçalho não mudar.
 */
export default function DadosEditor({ nexusUserId }: { nexusUserId: string | null; birthISO: string; hireISO: string }) {
  if (!nexusUserId) return null
  return <CorrijaNoFluxo oque="Nascimento e admissão" />
}
