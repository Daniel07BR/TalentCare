import 'server-only'
import { createHash } from 'crypto'
import { lerZip } from './zip'

/* ============================================================
   O LEITOR DA PLANILHA DE SERVIÇOS DO SETOR.

   Lê o `.xlsx` direto do zip — um `.xlsx` é um zip de XML, e o que precisamos
   dele (duas abas de células simples) não justifica arrastar uma biblioteca de
   planilha inteira para o bundle. Ver `docs/BIBLIOTECAS-GRAFICAS.md` no Nexus:
   declarar não pesa, importar pesa.

   ⚠️⚠️ ESTE ARQUIVO SÓ LÊ E CONFERE. Ele não grava nada e não decide de quem é
   cada linha — quem faz o vínculo é `lib/servicos/vinculo.ts`, e quem grava é a
   rota, depois de a pessoa ver a prévia. O `docs/PERIODO-E-DEPLOY.md` manda
   ensaiar a seco antes de um sync de diretório pelo mesmo motivo: importação
   que escreve antes de mostrar o que vai fazer é importação que ninguém confere.
   ============================================================ */


export type LinhaServico = {
  nomeOrigem: string
  dia: string            // AAAA-MM-DD
  status: 'concluida' | 'aberta' | 'desconsiderada'
  tarefa: string
  cliente: string | null
  minutos: number
}

export type LinhaPontos = {
  nomeOrigem: string
  competencia: string    // AAAA-MM
  pontos: number
}

export type PlanilhaLida = {
  hash: string
  servicos: LinhaServico[]
  pontos: LinhaPontos[]
  /** A janela que o ARQUIVO cobriu — não a que alguém pediu. */
  diaDe: string | null
  diaAte: string | null
  /** Competência mais antiga e mais nova da aba de pontos. */
  pontosDe: string | null
  pontosAte: string | null
  avisos: string[]
}

/* ── XML mínimo ─────────────────────────────────────────────────────────── */

function textoDe(xml: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(m[1])
  return out
}

/** A1 → { col: 0, row: 1 } */
function refDe(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!m) return null
  let col = 0
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
  return { col: col - 1, row: parseInt(m[2], 10) }
}

function lerAba(xml: string, shared: string[]): (string | null)[][] {
  const linhas: (string | null)[][] = []
  for (const linha of textoDe(xml, 'row')) {
    const celulas = linha.match(/<c\b[\s\S]*?(?:\/>|<\/c>)/g) ?? []
    for (const c of celulas) {
      const ref = /r="([A-Z]+\d+)"/.exec(c)?.[1]
      const pos = ref ? refDe(ref) : null
      if (!pos) continue
      const tipo = /t="([^"]+)"/.exec(c)?.[1]
      let valor: string | null = null
      if (tipo === 's') {
        const i = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1]
        valor = i != null ? (shared[parseInt(i, 10)] ?? null) : null
      } else if (tipo === 'inlineStr') {
        valor = (/<t[^>]*>([\s\S]*?)<\/t>/.exec(c)?.[1] ?? null)
      } else {
        valor = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? null
      }
      if (valor != null) valor = decodeEntidades(valor)
      const arr = (linhas[pos.row - 1] ??= [])
      arr[pos.col] = valor
    }
  }
  return linhas.map((l) => l ?? [])
}

const decodeEntidades = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
   .replace(/&amp;/g, '&')

/* ── conversões da origem ───────────────────────────────────────────────── */

/**
 * Serial do Excel → AAAA-MM-DD.
 *
 * ⚠️ A época é **30/12/1899**, e não 01/01/1900: o Excel carrega de propósito o
 * bug de que 1900 teria sido bissexto, e a época deslocada é o que faz as datas
 * baterem. Errar isso desloca o arquivo inteiro em dois dias — e um serviço no
 * dia errado não estoura nada, só entra no mês errado.
 */
export function diaDoSerial(serial: number): string | null {
  if (!isFinite(serial) || serial <= 0) return null
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400_000
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Fração de dia do Excel → minutos.
 *
 * A coluna `Tempo` vem como fração (0,0073148… = 10,5 min). Converter aqui, uma
 * vez, evita que cada consumidor refaça o `× 24 × 60` — e refaça diferente.
 */
export const minutosDaFracao = (fracao: number) =>
  isFinite(fracao) && fracao > 0 ? Math.round(fracao * 24 * 60) : 0

const STATUS: Record<string, LinhaServico['status']> = {
  concluidas: 'concluida', concluida: 'concluida', concluido: 'concluida', concluidos: 'concluida',
  abertas: 'aberta', aberta: 'aberta', aberto: 'aberta', abertos: 'aberta',
  desconsideradas: 'desconsiderada', desconsiderada: 'desconsiderada', desconsiderado: 'desconsiderada',
}

export const normalizarNome = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

/** Acha a coluna pelo cabeçalho, tolerando acento, caixa e espaço. */
function indiceDe(cabecalho: (string | null)[], ...nomes: string[]): number {
  const alvo = nomes.map(normalizarNome)
  for (let i = 0; i < cabecalho.length; i++) {
    const c = normalizarNome(cabecalho[i] ?? '')
    if (alvo.includes(c)) return i
  }
  return -1
}

/* ── a leitura ──────────────────────────────────────────────────────────── */

export function lerPlanilha(buf: Buffer): PlanilhaLida {
  const hash = createHash('sha256').update(buf).digest('hex')
  const zip = lerZip(buf)
  const ler = (p: string) => (zip[p] ? zip[p].toString('utf8') : null)

  const wb = ler('xl/workbook.xml')
  if (!wb) throw new Error('Não parece um .xlsx: falta xl/workbook.xml.')

  const sharedXml = ler('xl/sharedStrings.xml')
  const shared = sharedXml
    ? textoDe(sharedXml, 'si').map((si) => textoDe(si, 't').map(decodeEntidades).join(''))
    : []

  // r:id → arquivo da aba
  const rels = ler('xl/_rels/workbook.xml.rels') ?? ''
  const alvoPorId = new Map<string, string>()
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    alvoPorId.set(m[1], m[2].startsWith('xl/') ? m[2] : 'xl/' + m[2].replace(/^\//, ''))
  }
  const abas = new Map<string, (string | null)[][]>()
  for (const m of wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const alvo = alvoPorId.get(m[2])
    const xml = alvo ? ler(alvo) : null
    if (xml) abas.set(normalizarNome(decodeEntidades(m[1])), lerAba(xml, shared))
  }

  const avisos: string[] = []
  const servicos = lerAbaServicos(abas, avisos)
  const pontos = lerAbaPontos(abas, avisos)

  const dias = servicos.map((s) => s.dia).sort()
  const comps = pontos.map((p) => p.competencia).sort()

  return {
    hash, servicos, pontos, avisos,
    diaDe: dias[0] ?? null,
    diaAte: dias[dias.length - 1] ?? null,
    pontosDe: comps[0] ?? null,
    pontosAte: comps[comps.length - 1] ?? null,
  }
}

function lerAbaServicos(abas: Map<string, (string | null)[][]>, avisos: string[]): LinhaServico[] {
  /* A aba de serviços é a que TEM as colunas, não a que se chama "legal": o
     próximo setor vai chamar a dele de outra coisa, e amarrar no nome faria a
     importação do Contábil falhar com "aba não encontrada" sem dizer por quê. */
  let grade: (string | null)[][] | null = null
  for (const [, g] of abas) {
    if (!g.length) continue
    const h = g[0]
    if (indiceDe(h, 'Nome') >= 0 && indiceDe(h, 'Status') >= 0 && indiceDe(h, 'Data') >= 0) { grade = g; break }
  }
  if (!grade) {
    avisos.push('Nenhuma aba com as colunas Nome, Status e Data — os serviços não foram lidos.')
    return []
  }
  const h = grade[0]
  const iNome = indiceDe(h, 'Nome'), iTempo = indiceDe(h, 'Tempo'), iStatus = indiceDe(h, 'Status')
  const iTarefa = indiceDe(h, 'Tarefa'), iCliente = indiceDe(h, 'Cliente'), iData = indiceDe(h, 'Data')

  const out: LinhaServico[] = []
  let semData = 0, semNome = 0, statusEstranho = new Set<string>()
  for (let r = 1; r < grade.length; r++) {
    const linha = grade[r]
    if (!linha || linha.every((c) => c == null || c === '')) continue
    const nome = (linha[iNome] ?? '').trim()
    if (!nome) { semNome++; continue }
    const dia = iData >= 0 ? diaDoSerial(parseFloat(linha[iData] ?? '')) : null
    if (!dia) { semData++; continue }
    const bruto = normalizarNome(linha[iStatus] ?? '')
    const status = STATUS[bruto]
    if (!status) { if (bruto) statusEstranho.add(bruto); continue }
    out.push({
      nomeOrigem: nome, dia, status,
      tarefa: (linha[iTarefa] ?? '').trim() || '(sem tarefa)',
      cliente: (linha[iCliente] ?? '').trim() || null,
      minutos: iTempo >= 0 ? minutosDaFracao(parseFloat(linha[iTempo] ?? '')) : 0,
    })
  }
  /* ⚠️ Linha descartada é NOTÍCIA, não detalhe. Um arquivo que perde 300 linhas
     em silêncio produz um total menor e ninguém sabe de onde veio a diferença. */
  if (semData) avisos.push(`${semData} ${semData === 1 ? 'linha ficou' : 'linhas ficaram'} de fora por não ter data válida.`)
  if (semNome) avisos.push(`${semNome} ${semNome === 1 ? 'linha ficou' : 'linhas ficaram'} de fora por não ter nome.`)
  if (statusEstranho.size) avisos.push(`Status que não reconheço e ficaram de fora: ${[...statusEstranho].join(', ')}.`)
  return out
}

function lerAbaPontos(abas: Map<string, (string | null)[][]>, avisos: string[]): LinhaPontos[] {
  let grade: (string | null)[][] | null = null
  for (const [, g] of abas) {
    if (!g.length) continue
    const h = g[0]
    if (indiceDe(h, 'nome') >= 0 && indiceDe(h, 'pontos (totais)', 'pontos') >= 0) { grade = g; break }
  }
  if (!grade) return []
  const h = grade[0]
  const iData = indiceDe(h, 'data'), iNome = indiceDe(h, 'nome'), iPontos = indiceDe(h, 'pontos (totais)', 'pontos')

  const out: LinhaPontos[] = []
  for (let r = 1; r < grade.length; r++) {
    const linha = grade[r]
    if (!linha || linha.every((c) => c == null || c === '')) continue
    const nome = (linha[iNome] ?? '').trim()
    const dia = iData >= 0 ? diaDoSerial(parseFloat(linha[iData] ?? '')) : null
    const pts = parseFloat(linha[iPontos] ?? '')
    if (!nome || !dia || !isFinite(pts)) continue
    out.push({ nomeOrigem: nome, competencia: dia.slice(0, 7), pontos: Math.round(pts) })
  }
  return out
}
