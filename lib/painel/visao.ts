/* ============================================================
   O PAINEL PRINCIPAL NOVO — as contas de TELA, sem React (11/09/2026).

   ⚠️⚠️ Nada aqui é régua nova. Os números saem das MESMAS funções que a página
   atual usa (`buildDashboard`, `classroomVM`, `radioVM`… e as mesmas rotas); este
   arquivo só dá a eles a forma do desenho novo — as linhas por setor, os grupos
   de escolaridade/geração/gênero com as pessoas de cada um, a janela de
   comparação dos selos e a geometria da curva.

   ⚠️ Mora em `lib/` (e não junto das seções) para o ensaio
   `scripts/ensaio-painel-novo.ts` poder importá-lo e provar que o que a página
   nova mostra é o que a atual mostra — e que o que cada clique revela soma o
   número clicado.
   ============================================================ */
import type { TalentData, Employee } from '@/lib/mock/data'
import type { KpiPessoa } from '@/lib/mock/dashboard'
import { workforce, quadroEm, genOf, gNorm, ageOf, type GenSeg } from '@/lib/mock/demographics'
import { personLevels } from '@/lib/education-edit'
import { diasEntre } from '@/lib/serie-periodo'

/** Uma linha de setor num cartão de sistema. `id: null` = não abre janela. */
export type Linha = { id: string | null; nome: string; cor: string; valor: number }

/* ── Sistemas ─────────────────────────────────────────────────────────────── */

/** WhatsApp: as linhas do cartão atual — só quem teve atendimento, maior primeiro.
 *
 *  ⚠️⚠️ O `id` aqui é o NOME DA FILA, não o id de um setor. A barra conta pela
 *  FILA do atendimento (`whatsapp_daily.dept`, o setor que o OneCode conhece), e a
 *  janela de um SETOR conta pelas ATENDENTES do setor — medido em 11/09/2026, 30
 *  dias: Recepção 127 na fila × 246 pelas atendentes. Por decisão do dono, a barra
 *  abre a janela da MESMA FILA (`?fila=` em `/api/whatsapp-overview`), com o mesmo
 *  número da barra. */
export function linhasWhatsapp(rows: { name: string; color: string | null; abertos: number }[]): Linha[] {
  return rows
    .filter((x) => x.abertos > 0)
    .sort((a, b) => b.abertos - a.abertos)
    .map((x) => ({ id: x.name, nome: x.name, cor: x.color ?? 'var(--n-green)', valor: x.abertos }))
}

/** ClassRoom: cursos CRIADOS por setor, na ordem do cartão atual (maior primeiro).
 *  Entram os setores com qualquer atividade no ClassRoom — por isso aparecem
 *  linhas com 0 criado (o setor assistiu, mas não criou). */
export function linhasClassroom(deptBars: { id: string; nome: string; color: string; created: number }[]): Linha[] {
  return [...deptBars].sort((a, b) => b.created - a.created)
    .map((d) => ({ id: d.id, nome: d.nome, cor: d.color, valor: d.created }))
}

/** Barras que já vêm prontas da função do sistema (Rádio, CIDE, Gerência). */
export function linhasDe<T extends { id: string; nome: string; color: string }>(bars: T[], valor: (b: T) => number): Linha[] {
  return bars.map((d) => ({ id: d.id, nome: d.nome, cor: d.color, valor: valor(d) }))
}

export const somaLinhas = (l: Linha[]) => l.reduce((a, x) => a + x.valor, 0)

/* ── Demografia — retrato de HOJE, não acompanha o filtro ─────────────────── */

/** Um grupo clicável (formação, geração, gênero) e quem está nele. */
export type Grupo = { chave: string; rotulo: string; cor: string; quantos: number; pessoas: KpiPessoa[] }

function pessoaDe(data: TalentData, e: Employee, detalhe?: string): KpiPessoa {
  return {
    id: e.id, nome: e.nome, cargo: e.cargo, hasAvatar: e.hasAvatar, valor: 1, detalhe,
    setor: data.departments.find((d) => d.id === e.dept)?.nome ?? data.deptMeta[e.dept] ?? '—',
  }
}
const porNome = (a: KpiPessoa, b: KpiPessoa) => a.nome.localeCompare(b.nome)
const idade = (e: Employee, dia?: string) => { const a = ageOf(e.birthDate, dia); return a != null ? `${a} anos` : 'sem data de nascimento' }

/**
 * Escolaridade: as fatias da rosca (de `buildDashboard`) com quem está em cada.
 * ⚠️ MULTI-CONTAGEM, como a rosca: quem tem MBA e Pós entra nas duas — a soma
 * das listas é a soma das fatias, não o quadro de 86.
 */
export function gruposEscolaridade(data: TalentData, fatias: { label: string; count: number; color: string }[]): Grupo[] {
  const perf = workforce(data)
  return fatias.map((f) => ({
    chave: f.label, rotulo: f.label, cor: f.color, quantos: f.count,
    pessoas: perf.filter((e) => personLevels(e.eduCursos, e.escolaridade).includes(f.label)).map((e) => pessoaDe(data, e)).sort(porNome),
  }))
}

/** Gerações: os segmentos de `generationsVM` com quem está em cada, mais velho primeiro.
 *  `dia`: o retrato do fim do período (o mesmo `dia` passado a `generationsVM`). */
export function gruposGeracao(data: TalentData, segs: GenSeg[], dia?: string): Grupo[] {
  const perf = dia ? quadroEm(data, dia) : workforce(data)
  return segs.map((s) => ({
    chave: s.key, rotulo: s.label, cor: s.color, quantos: s.count,
    pessoas: perf.filter((e) => genOf(e.birthDate).key === s.key)
      .sort((a, b) => (ageOf(b.birthDate, dia) ?? -1) - (ageOf(a.birthDate, dia) ?? -1) || a.nome.localeCompare(b.nome))
      .map((e) => pessoaDe(data, e, idade(e, dia))),
  }))
}

/** Gênero: masculino, feminino e — se houver — não informado. */
export function gruposGenero(data: TalentData, dia?: string): Grupo[] {
  const perf = dia ? quadroEm(data, dia) : workforce(data)
  const g = (chave: 'M' | 'F' | '?', rotulo: string, cor: string): Grupo => {
    const pessoas = perf.filter((e) => gNorm(e.gender) === chave).map((e) => pessoaDe(data, e, idade(e, dia))).sort(porNome)
    return { chave, rotulo, cor, quantos: pessoas.length, pessoas }
  }
  return [g('M', 'Masculino', 'var(--n-blue)'), g('F', 'Feminino', 'var(--n-pink)'), g('?', 'Não informado', 'var(--n-text-3)')]
}

/* ── O selo de variação (só Atrasos — a advertência é derivada, ver a página) ── */

const soma = (s: string, n: number) => {
  const x = new Date(`${s}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10)
}
/** Janelas acima disto não ganham percentual — a regra da casa ("nenhum
 *  percentual em janela longa", a mesma fronteira de `lib/serie-periodo.ts`). */
export const DIAS_MAX_COMPARACAO = 124
/** Base abaixo disto não ganha percentual: de 3 para 6 é "+100%", e isso é
 *  ruído com cara de tendência. */
export const BASE_MIN_COMPARACAO = 10

export type JanelaComparacao = {
  /** O trecho MEDIDO da janela atual (o ponto pode terminar antes do filtro). */
  atualDe: string; atualAte: string
  /** A janela anterior: o mesmo número de dias, recuado em semanas inteiras. */
  de: string; ate: string
  dias: number
}

/**
 * A janela com que o selo compara — ou `null` quando a comparação seria desonesta.
 *
 * ⚠️⚠️ DIAS MEDIDOS CONTRA DIAS MEDIDOS. O ponto entra por import à mão e termina
 * antes de hoje (em 11/09/2026, em 08/09): "30 dias" mede 28 dias, e comparar com
 * os 30 dias anteriores inteiros inventaria uma queda. Então a janela atual é
 * cortada onde o ponto termina, e a anterior tem o MESMO número de dias.
 *
 * ⚠️ Recuada em SEMANAS INTEIRAS (28, 35…), não "colada" no início: assim as duas
 * têm os mesmos dias da semana — atraso só acontece em dia útil, e 28 dias
 * corridos podem ter 19 ou 20 dias úteis. O FERIADO quem trata é
 * `diasComExpediente` (a página só mostra o selo quando os dois lados têm o mesmo
 * número de dias com expediente).
 *
 * `null` quando: a janela não foi medida; começa antes do ponto; passa de 4
 * meses; ou a anterior sai da cobertura do ponto.
 */
export function janelaDeComparacao(
  fromDay: string, toDay: string,
  pontoDesde: string | null, pontoAte: string | null, janelaComPonto: boolean,
): JanelaComparacao | null {
  if (!janelaComPonto || !pontoDesde || !pontoAte) return null
  if (fromDay < pontoDesde) return null
  const atualAte = toDay < pontoAte ? toDay : pontoAte
  if (atualAte < fromDay) return null
  const dias = diasEntre(fromDay, atualAte)
  if (dias > DIAS_MAX_COMPARACAO) return null
  const passo = Math.ceil(dias / 7) * 7
  const de = soma(fromDay, -passo)
  if (de < pontoDesde) return null
  return { atualDe: fromDay, atualAte, de, ate: soma(atualAte, -passo), dias }
}

/**
 * Quantos dias da janela tiveram EXPEDIENTE — dia com algum registro de ponto na
 * casa inteira (`porDia` de `/api/assiduidade-metrics`, da Diretoria).
 *
 * ⚠️⚠️ É o que separa o feriado do dia limpo (achado do crítico, 11/09/2026). Em
 * "7 dias" o selo mostrava Atrasos ▼27% em verde — 19 × 26 —, mas a janela atual
 * tinha 2 dias de expediente (07/09 foi feriado) e a anterior 3: por dia, piorou
 * 9%. Medido de out/2025 a set/2026: TODO dia útil sem registro nenhum na casa é
 * feriado ou recesso (20/11, Natal/Ano-Novo, Sexta Santa, Tiradentes e a ponte,
 * 1º/5, Corpus Christi, 9/7 — o estadual —, 7/9), e o Carnaval tem registro
 * porque a casa trabalhou. Então o próprio ponto responde, inclusive o feriado
 * municipal e a ponte, que uma lista fixa não pegaria.
 */
export function diasComExpediente(porDia: { day: string }[], de: string, ate: string): number {
  return new Set(porDia.filter((d) => d.day >= de && d.day <= ate).map((d) => d.day)).size
}

/**
 * Os números do selo, com AS MESMAS PESSOAS nos dois lados.
 *
 * ⚠️⚠️ Achado do crítico (11/09/2026): contar as duas janelas com "o quadro de
 * hoje" é assimétrico — quem entrou depois do começo da janela anterior soma
 * atrasos no presente e zero no passado, e o selo pende sempre para "piorou". No
 * Trimestre dava ▲9% (336 × 307); com as mesmas pessoas, ▲6%. Entra quem está
 * no quadro hoje (a população do cartão) E já estava na casa no primeiro dia da
 * janela anterior. Quem saiu fica fora das duas, quem entrou também.
 */
export function compararMesmasPessoas(
  data: TalentData, desde: string,
  atual: Map<string, { atrasos: number; advertencias: number }>,
  anterior: Map<string, { atrasos: number; advertencias: number }>,
) {
  const gente = workforce(data).filter((e) => !!e.hireISO && e.hireISO.slice(0, 10) <= desde)
  const conta = (m: Map<string, { atrasos: number; advertencias: number }>) => gente.reduce((a, e) => {
    const x = m.get(e.nexusUserId ?? e.id)
    return { atrasos: a.atrasos + (x?.atrasos ?? 0), advertencias: a.advertencias + (x?.advertencias ?? 0) }
  }, { atrasos: 0, advertencias: 0 })
  return { pessoas: gente.length, atual: conta(atual), anterior: conta(anterior) }
}

export type Selo = { seta: '▲' | '▼' | '='; texto: string; piorou: boolean | null }

/** O selo: variação em % contra a janela anterior. `null` = não se mostra. */
export function seloVariacao(atual: number | null, anterior: number | null): Selo | null {
  if (atual == null || anterior == null || anterior < BASE_MIN_COMPARACAO) return null
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return { seta: '=', texto: '0%', piorou: null }
  return { seta: pct > 0 ? '▲' : '▼', texto: `${Math.abs(pct)}%`, piorou: pct > 0 }
}

/* ── A curva de saídas ───────────────────────────────────────────────────── */

/**
 * A geometria da curva de turnover — em SAÍDAS, não em %.
 *
 * ⚠️ O conceito desenhava um eixo de 0 a 12% com um ponto por dia, e turnover de
 * um dia não existe. A série de sempre (`buildDashboard`) é a de saídas por dia,
 * semana ou mês; o eixo começa no ZERO (a curva de antes começava em 85% do
 * mínimo, o que faz uma saída parecer um salto).
 */
export function curvaDeSaidas(vals: number[], w: number, h: number, pad = 8) {
  const max = Math.max(1, ...vals)
  const n = vals.length
  const x = (i: number) => (n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad))
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad)
  const pts = vals.map((v, i) => [x(i), y(v)] as [number, number])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = pts.length ? `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L ${pts[0][0].toFixed(1)} ${h - pad} Z` : ''
  const marcas = [...new Set([0, Math.round(max / 2), max])].map((v) => ({ v, y: y(v) }))
  return { pts, line, area, max, marcas }
}

/* ── Assiduidade e disciplina: o mapa de atrasos da casa ─────────────────── */

/** [dia, índice da chave, atrasos, abonados, minutos, até 5 min, até 30, mais de 30] — `/api/assiduidade-mapa`. */
export type LinhaPonto = [string, number, number, number, number, number, number, number]

/** Um dia do calendário — o formato de `CalendarioOcorrencias` (`DiaOcorrencia`). */
export type DiaDoMapa = { day: string; atrasos: number; abonados: number; minutos: number; pessoas: number; ate5: number; ate30: number; mais30: number }
export type QuemNoDia = { day: string; id: string; atrasos: number; abonados: number; minutos: number }
export type QuemDoMapa = Record<string, { nome: string; cargo: string; setor: string; hasAvatar: boolean; saiu: boolean }>

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * O mapa da CASA, das linhas do ponto: a cor de cada dia e quem está atrás dela.
 *
 * ⚠️⚠️ A MESMA REGRA do mapa do setor (`/api/dept-metrics`): `pessoas` é o número
 * de LINHAS do dia (quem teve atraso ou atraso abonado), e a lista do dia são
 * essas mesmas linhas — o quadro e a lista não podem discordar.
 *
 * ⚠️ População: todo mundo fora da Diretoria, INCLUSIVE quem já saiu — um atraso
 * de quem saiu aconteceu, e apagá-lo reescreveria o passado (a mesma escolha do
 * setor). Por isso a soma do calendário pode passar do cartão "Atrasos", que é do
 * quadro ativo; a tela diz. Linha de chave que não é de ninguém do dataset fica fora.
 */
export function mapaDaCasa(data: TalentData, chaves: string[], linhas: LinhaPonto[]) {
  const dir = (e: Employee) => semAcento(data.deptMeta[e.dept] || '').includes('diretoria')
  const porChave = new Map(data.employees.filter((e) => !dir(e)).map((e) => [e.nexusUserId ?? e.id, e]))
  const nomeSetor = (e: Employee) => data.departments.find((d) => d.id === e.dept)?.nome ?? data.deptMeta[e.dept] ?? '—'

  const dias = new Map<string, DiaDoMapa>()
  const quemNoDia: QuemNoDia[] = []
  const quem: QuemDoMapa = {}
  for (const [day, k, atrasos, abonados, minutos, ate5, ate30, mais30] of linhas) {
    const e = porChave.get(chaves[k])
    if (!e) continue
    const d = dias.get(day) ?? { day, atrasos: 0, abonados: 0, minutos: 0, pessoas: 0, ate5: 0, ate30: 0, mais30: 0 }
    d.atrasos += atrasos; d.abonados += abonados; d.minutos += minutos; d.pessoas += 1
    d.ate5 += ate5; d.ate30 += ate30; d.mais30 += mais30
    dias.set(day, d)
    quemNoDia.push({ day, id: e.id, atrasos, abonados, minutos })
    quem[e.id] ??= { nome: e.nome, cargo: e.cargo, setor: nomeSetor(e), hasAvatar: e.hasAvatar, saiu: e.status === 'Desligado' }
  }
  return { dias: [...dias.values()].sort((a, b) => a.day.localeCompare(b.day)), quemNoDia, quem }
}

/** A escala de cor da CASA (pessoas por dia): 1–4, 5–7, 8–10, 11 ou mais.
 *  ⚠️ A do setor (1, 2, 3, 4+) satura aqui: medido em 2026, nos dias com atraso
 *  a mediana é 7 pessoas na casa, o 3º quartil 10 e o máximo 19 — quase todo dia
 *  seria "4 ou mais". Os degraus saem desses quartis. */
export const LIMITES_CASA: [number, number, number] = [5, 8, 11]

type MapaAssid = Map<string, { atrasos: number; abonados: number; minutos: number; advertencias: number }>

/** Minutos e abonados do QUADRO ATIVO (a população do cartão "Atrasos"). */
export function somaAssiduidade(data: TalentData, assidMap: MapaAssid) {
  let minutos = 0, abonados = 0
  for (const e of workforce(data)) {
    const a = assidMap.get(e.nexusUserId ?? e.id)
    minutos += a?.minutos ?? 0; abonados += a?.abonados ?? 0
  }
  return { minutos, abonados }
}

/** Quem somou minutos de atraso na janela, e quantos — soma o número do cartão. */
export function listaMinutos(data: TalentData, assidMap: MapaAssid): KpiPessoa[] {
  return workforce(data)
    .map((e) => {
      const a = assidMap.get(e.nexusUserId ?? e.id)
      const n = a?.atrasos ?? 0
      return { ...pessoaDe(data, e, n ? `${n} atraso${n === 1 ? '' : 's'}` : undefined), valor: a?.minutos ?? 0 }
    })
    .filter((p) => p.valor > 0)
    .sort((a, b) => b.valor - a.valor)
}
