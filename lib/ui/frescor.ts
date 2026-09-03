'use client'
import { useEffect, useState } from 'react'

type Fonte = { nome: string; ate: string | null }

/**
 * Até quando o painel foi alimentado — a frase do canto do cabeçalho.
 *
 * ⚠️⚠️ Substitui **"Atualizado há 12 min"**, que era texto fixo no JSX e dizia a
 * mesma coisa num painel fresco e num painel morto. O `scripts/tc-vigia.sh`
 * deste repositório já a citava como o exemplo do problema.
 *
 * ⚠️ Mostra a fonte MAIS ATRASADA, não a mais recente: um painel é tão fresco
 * quanto o espelho mais velho que ele soma, e a média esconderia exatamente a
 * fonte parada. Em 03/09/2026 são oito fontes em dia e o ponto em 25/06.
 */
export function useFrescor(): { texto: string; detalhe: string } {
  const [fontes, setFontes] = useState<Fonte[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/frescor', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { fontes: Fonte[] }) => alive && setFontes(d.fontes))
      .catch(() => alive && setErro(true))
    return () => { alive = false }
  }, [])

  if (erro) return { texto: 'frescor dos dados: não foi possível ler', detalhe: '' }
  if (!fontes) return { texto: 'verificando os espelhos…', detalhe: '' }

  const comDado = fontes.filter((f): f is { nome: string; ate: string } => !!f.ate)
  if (!comDado.length) return { texto: 'nenhum espelho com dado', detalhe: '' }

  const atrasada = comDado.reduce((a, b) => (a.ate <= b.ate ? a : b))
  const br = (d: string) => d.split('-').reverse().join('/')
  const diasAtras = Math.floor((Date.now() - new Date(`${atrasada.ate}T12:00:00`).getTime()) / 86400_000)
  const quando = diasAtras <= 0 ? 'hoje' : diasAtras === 1 ? 'ontem' : `há ${diasAtras} dias`

  return {
    texto: `Dados até ${br(atrasada.ate)} (${quando}) · ${atrasada.nome}`,
    detalhe: comDado
      .slice()
      .sort((a, b) => a.ate.localeCompare(b.ate))
      .map((f) => `${f.nome}: ${br(f.ate)}`)
      .join('\n'),
  }
}
