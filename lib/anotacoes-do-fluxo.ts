import 'server-only'
import type { SeloDoDia } from '@/app/(app)/CalendarioOcorrencias'

/* ============================================================
   AS ANOTAÇÕES DOS DIAS, LIDAS DO FLUXO NA HORA (04/11/2026).

   Pedido do Daniel: o calendário da ficha reflete atraso, saída mais cedo e falta, e o clique no dia mostra o que há no
   sistema. A fonte é `plane/fluxo/talent_anotacoes.py`, a mesma da janela da pessoa no Controle de faltas.

   ⚠️⚠️ O motivo pode ser dado de saúde (LGPD art. 11): aqui NÃO se guarda cópia, nem em espelho nem em log. A marca do dia
   não leva motivo; o texto só vem na rota do dia, que confere `podeVer`.
   ⚠️ Fluxo fora do ar é `null`, e a tela diz. Calendário sem marca não pode se ler como "não houve nada".
   ============================================================ */

export type Anotacao = {
  id: string; tipo: string; dia: string; em: string; titulo: string; frase: string; texto: string; detalhe: string; por: string; riscado: boolean
}
type Resposta = { selos: SeloDoDia[]; anotacoes?: Anotacao[] }

async function ler(nexusUserId: string, de: string, ate: string, comTexto: boolean): Promise<Resposta | null> {
  const base = process.env.FLUXO_BASE_URL
  const chave = process.env.FLUXO_API_KEY
  if (!base || !chave) return null
  const qs = new URLSearchParams({ pessoa: nexusUserId, de, ate, ...(comTexto ? { comTexto: '1' } : {}) })
  try {
    const r = await fetch(`${base}/api/integrations/talent-anotacoes?${qs}`, {
      headers: { 'X-API-Key': chave }, cache: 'no-store', signal: AbortSignal.timeout(6000),
    })
    return r.ok ? ((await r.json()) as Resposta) : null
  } catch {
    return null
  }
}

export const selosDoFluxo = async (nexusUserId: string | null, de: string, ate: string): Promise<SeloDoDia[] | null> =>
  (nexusUserId ? (await ler(nexusUserId, de, ate, false))?.selos ?? null : [])

export const anotacoesDoDia = async (nexusUserId: string, dia: string): Promise<Anotacao[] | null> =>
  (await ler(nexusUserId, dia, dia, true))?.anotacoes ?? null
