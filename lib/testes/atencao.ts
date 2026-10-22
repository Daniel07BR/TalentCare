import { BUSCA_ALVOS, BUSCA_CELULAS, CONF_PARES, type Busca, type Conferencia } from './codigo'

/* ============================================================
   A ATENÇÃO (22/10/2026) — as duas provas práticas da página do teste: busca
   de números (3 min) e conferência (2 min). Chega SÓ pelo código (o gestor
   lança na ficha, ou vem da entrevista no Fluxo).

   ⚠️⚠️ PORTE de `resumo_da_busca` / `resumo_da_conferencia` / `REGUA_ATENCAO`
   de `apps/api/plane/fluxo/entrevistas.py`. A régua é INICIAL (sem base da
   casa) e mora nos dois sistemas: mudou lá, mude aqui — senão a mesma pessoa
   sai "Alta" no Fluxo e "Média" no TalentCare.
   Não é o Teste AC (Vetor): são provas da casa, sem laudo nem percentil.
   ============================================================ */

export type Nivel = 'alta' | 'media' | 'baixa'
export type Estilo = 'rapido-preciso' | 'cuidadoso' | 'rapido-com-erros' | 'devagar-com-erros'

const REGUA_ATENCAO = {
  busca: { alta: [90, 60], media: [75, 35] },
  conferencia: { alta: [90, 50], media: [75, 30] },
} as const
const PRECISO = 85

const pct = (parte: number, todo: number) => (todo ? Math.floor((100 * parte) / todo + 0.5) : 0)

function nivel(prova: 'busca' | 'conferencia', acerto: number, ritmo: number): Nivel {
  const r = REGUA_ATENCAO[prova]
  if (acerto >= r.alta[0] && ritmo >= r.alta[1]) return 'alta'
  if (acerto >= r.media[0] && ritmo >= r.media[1]) return 'media'
  return 'baixa'
}

function estilo(prova: 'busca' | 'conferencia', acerto: number, ritmo: number): Estilo {
  const rapido = ritmo >= REGUA_ATENCAO[prova].alta[1]
  if (acerto >= PRECISO) return rapido ? 'rapido-preciso' : 'cuidadoso'
  return rapido ? 'rapido-com-erros' : 'devagar-com-erros'
}

/** % de acerto = acertos ÷ (acertos + erros + omissões); ritmo = quanto da grade percorreu. */
export function resumoDaBusca(b: Busca) {
  const acerto = pct(b.acertos, b.acertos + b.erros + b.omissoes)
  const ritmo = pct(b.percorrido, BUSCA_CELULAS)
  return { ...b, celulas: BUSCA_CELULAS, alvos: BUSCA_ALVOS, acerto, ritmo, pontos: b.acertos - b.erros - b.omissoes,
    nivel: nivel('busca', acerto, ritmo), estilo: estilo('busca', acerto, ritmo) }
}

/** % de acerto = acertos ÷ respondidos; ritmo = respondidos ÷ 40. */
export function resumoDaConferencia(c: Conferencia) {
  const respondidos = c.acertos + c.erros
  const acerto = pct(c.acertos, respondidos)
  const ritmo = pct(respondidos, CONF_PARES)
  return { ...c, respondidos, pares: CONF_PARES, acerto, ritmo, pontos: c.acertos - c.erros,
    nivel: nivel('conferencia', acerto, ritmo), estilo: estilo('conferencia', acerto, ritmo) }
}

/** As duas juntas: basta uma baixa para "baixa"; "alta" só com as duas altas (a conta do relatório do Fluxo). */
export const nivelGeral = (a: Nivel, b: Nivel): Nivel =>
  a === 'baixa' || b === 'baixa' ? 'baixa' : a === 'alta' && b === 'alta' ? 'alta' : 'media'

export const NOME_DO_NIVEL: Record<Nivel, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const COR_DO_NIVEL: Record<Nivel, string> = { alta: '#16a34a', media: '#d97706', baixa: '#dc2626' }
export const NOME_DO_ESTILO: Record<Estilo, string> = {
  'rapido-preciso': 'Rápido e preciso',
  cuidadoso: 'Cuidadoso: preciso, num ritmo mais calmo',
  'rapido-com-erros': 'Rápido, com erros',
  'devagar-com-erros': 'Devagar e com erros',
}

/** Os textos do Guia dos testes do Fluxo (`entrevistas/atencao.tsx`) — a mesma explicação nos dois sistemas. */
export const PROVAS = {
  busca: {
    nome: 'Busca de números',
    tempo: '3 minutos',
    como: 'Uma grade com 180 números de dois algarismos parecidos (38, 83, 88, 36, 63…); a pessoa marca os iguais a três modelos — 38, 63 e 96 —, 40 escondidos na grade.',
    mede: 'Atenção concentrada e seletiva: achar o que importa no meio de coisas parecidas, sem se distrair e sem trocar 38 por 83. É a atenção de quem confere lançamentos, extratos e listas.',
    numeros: 'Acertos: alvos que marcou. Erros: marcou o que não era. Omissões: alvos que deixou passar no trecho que percorreu. % de acerto = acertos ÷ (acertos + erros + omissões); ritmo = quanto da grade percorreu.',
    regua: 'Alta: acerto ≥ 90% e percorreu ≥ 60% da grade · Média: acerto ≥ 75% e percorreu ≥ 35%',
  },
  conferencia: {
    nome: 'Conferência',
    tempo: '2 minutos',
    como: '40 pares de registros lado a lado — CNPJ, valores, datas, nomes de empresa e números de nota; metade igual, metade com uma diferença sutil. A pessoa responde Iguais ou Diferentes.',
    mede: 'Atenção a detalhes e precisão na conferência — exatamente o trabalho de bater documento com sistema, nota com lançamento.',
    numeros: 'Respondidos: quantos dos 40 pares conferiu no tempo. % de acerto = acertos ÷ respondidos; ritmo = respondidos ÷ 40.',
    regua: 'Alta: acerto ≥ 90% e respondeu ≥ 50% (20 pares) · Média: acerto ≥ 75% e respondeu ≥ 30% (12 pares)',
  },
} as const
