import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { lerZip } from '@/lib/servicos/zip'
import { diaDoSerial } from '@/lib/servicos/planilha'

/* ============================================================
   O HISTÓRICO REAL DE SUSPENSÕES → `disciplina_evento`.

   ENSAIO por padrão. Grava só com `--gravar`.
     npx --yes tsx@4 --tsconfig scripts/tsconfig.json scripts/importar-suspensoes.ts <arquivo.xlsx>
     …mesmo comando + --gravar

   ⚠️⚠️ POR QUE ESTE IMPORT EXISTE, e por que ele NÃO é um detalhe de cadastro.

   Até 10/09/2026 o TalentCare não tinha uma única suspensão vinda do ponto. O
   que ele tinha era **advertência DERIVADA** do 2º atraso do mês
   (`run-ponto-import.mjs`) — uma contagem, não um ato assinado. O
   `CONTINUAR-AQUI.md` deixou a frente parada de propósito, com o aviso: *"NÃO
   derivar: o encarregado pode liberar entrada e PERDOAR suspensão/advertência,
   então a regra derivada não é a realidade"*.

   Esta planilha é o registro assinado, e medi-la respondeu a pergunta que o doc
   deixou aberta ("substitui ou acrescenta?"):

   ⚠️⚠️ **AS 8 SUSPENSÕES DENTRO DA JANELA DO PONTO CAEM, TODAS AS 8, NO MESMO
   DIA DE UMA ADVERTÊNCIA DERIVADA.** A regra fecha exata: 6 atrasos no mês → 5
   advertências (2ª à 6ª) → e a suspensão no dia do 6º. Ou seja, a última
   "advertência" derivada daquele mês **não é advertência: é a suspensão**,
   gravada com o nome errado e o desconto errado (o mais leve).

   Então o import **SUBSTITUI**: ao gravar uma suspensão, apaga a advertência
   derivada do mesmo dia da mesma pessoa. Somar os dois puniria a pessoa duas
   vezes pelo mesmo fato — que é o defeito que a casa já pegou uma vez, quando
   "a advertência era o mesmo atraso contado de novo".

   ⚠️ E o conserto NÃO PODE ficar só aqui: `run-ponto-import.mjs` é wipe+rebuild
   e recriaria a advertência no próximo dump. Ele passou a consultar as
   suspensões reais e a não derivar no dia em que existe uma. Apagar à mão o que
   um sync reescreve é combinar com o cron quem ganha — e o cron sempre roda por
   último.

   ⚠️ `source: 'disciplina'` (não `'nexo'`) porque o import do ponto apaga
   `where: { source: 'nexo' }`. Com source próprio, a suspensão sobrevive ao
   reimport do ponto.

   ── O CASAMENTO DE PESSOA, e as duas travas ──────────────────────────────

   1. **Nome**: exato, ou primeiro nome igual + ao menos 2 tokens em comum
      (ignorando de/da/do/dos/das/e). Um só token nunca basta — é assim que o
      import do ponto casou "Wendel Ribeiro da Silva" com "Edileuza da Silva".

   2. ⚠️⚠️ **DATA DE ADMISSÃO** (ideia do dono, 10/09/2026): se o fato é anterior
      à admissão da pessoa no sistema, **não é ela**. Esta trava pegou DOIS
      casamentos que o nome tinha aprovado com confiança:
        · CAMILA HELENA ALEIXO SILVA → Camila Silva (admitida 23/04/2026),
          suspensão de 26/06/2024
        · JOÃO VÍCTOR DE MORAIS SILVA → Joao Victor (admitido 13/05/2026),
          suspensão de 26/09/2023
      Duas suspensões que teriam ido para a ficha da pessoa errada.

   Quem não casa é DESCARTADO em silêncio deliberado: são ex-funcionários que
   nunca entraram no TalentCare (decisão do dono). O ensaio os lista para
   conferência.
   ============================================================ */

const ARQUIVO = process.argv.find((a) => a.endsWith('.xlsx'))
const GRAVAR = process.argv.includes('--gravar')

/* ── nomes: a mesma normalização do resto da casa ───────────────────────── */
const norm = (s: string) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
const toks = (s: string) => norm(s).split(' ').filter((t) => t && !STOP.has(t))

/* ── leitura do .xlsx (sem biblioteca — ver lib/servicos/planilha.ts) ───── */
function textoDe(xml: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(m[1])
  return out
}
const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
   .replace(/&amp;/g, '&')

function refDe(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!m) return null
  let col = 0
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
  return { col: col - 1, row: parseInt(m[2], 10) }
}

/** Uma aba como matriz de células. `serial` marca a célula que era data. */
function lerAba(xml: string, shared: string[]): { v: string; serial: boolean }[][] {
  const linhas: { v: string; serial: boolean }[][] = []
  for (const linha of textoDe(xml, 'row')) {
    const celulas = linha.match(/<c\b[\s\S]*?(?:\/>|<\/c>)/g) ?? []
    for (const c of celulas) {
      const ref = /r="([A-Z]+\d+)"/.exec(c)?.[1]
      const pos = ref ? refDe(ref) : null
      if (!pos) continue
      const tipo = /t="([^"]+)"/.exec(c)?.[1]
      let valor: string | null = null
      let serial = false
      if (tipo === 's') {
        const i = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1]
        valor = i != null ? (shared[parseInt(i, 10)] ?? null) : null
      } else if (tipo === 'inlineStr') {
        valor = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c)?.[1] ?? null
      } else {
        valor = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? null
        /* Número puro numa coluna de data é serial do Excel. O `s=` (estilo)
           diria isso com certeza, mas a faixa basta aqui: 40000–60000 cobre
           2009–2064, e a planilha vai de 2020 a 2026. */
        if (valor && /^\d+(\.\d+)?$/.test(valor)) {
          const n = parseFloat(valor)
          if (n > 40000 && n < 60000) serial = true
        }
      }
      if (valor == null) continue
      const arr = (linhas[pos.row - 1] ??= [])
      arr[pos.col] = { v: decode(valor), serial }
    }
  }
  return linhas.map((l) => l ?? [])
}

type Registro = { aba: string; linha: number; pessoa: string; data: string; motivo: string }

/**
 * O formato: blocos por pessoa. Uma linha só com o NOME, depois uma linha
 * "DATA | MOTIVO", depois as ocorrências, e uma linha em branco separando.
 *
 * ⚠️ O cabeçalho "DATA" NÃO é opcional na leitura: sem ele, um nome de pessoa
 * escrito na coluna de motivo viraria pessoa nova. A âncora é a data — só linha
 * com data vira registro, e ela sempre pertence ao último nome visto.
 */
function extrair(buf: Buffer): { regs: Registro[]; avisos: string[] } {
  const zip = lerZip(buf)
  const wbXml = zip['xl/workbook.xml']?.toString('utf8') ?? ''
  const relsXml = zip['xl/_rels/workbook.xml.rels']?.toString('utf8') ?? ''
  const sharedXml = zip['xl/sharedStrings.xml']?.toString('utf8') ?? ''
  const shared = textoDe(sharedXml, 'si').map((si) =>
    decode(textoDe(si, 't').join('')),
  )

  const alvoDe = new Map<string, string>()
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    alvoDe.set(m[1], m[2].replace(/^\/?xl\//, '').replace(/^\//, ''))
  }
  const abas: { nome: string; caminho: string }[] = []
  for (const m of wbXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const alvo = alvoDe.get(m[2])
    if (alvo) abas.push({ nome: decode(m[1]), caminho: `xl/${alvo}` })
  }

  const regs: Registro[] = []
  const avisos: string[] = []
  for (const aba of abas) {
    const xml = zip[aba.caminho]?.toString('utf8')
    if (!xml) { avisos.push(`aba "${aba.nome}": XML não encontrado em ${aba.caminho}`); continue }
    const linhas = lerAba(xml, shared)
    let pessoa: string | null = null
    linhas.forEach((cols, i) => {
      const cells = cols.filter((c) => c && c.v.trim() !== '')
      if (!cells.length) return
      const a = cells[0]
      const txt = a.v.trim()
      if (txt.toUpperCase() === 'DATA') return
      if (a.serial) {
        const dia = diaDoSerial(parseFloat(a.v))
        if (!dia) { avisos.push(`${aba.nome} linha ${i + 1}: serial de data ilegível (${a.v})`); return }
        if (!pessoa) { avisos.push(`${aba.nome} linha ${i + 1}: data sem pessoa acima — IGNORADA`); return }
        const motivo = cells[1]?.v.trim() || '(sem motivo)'
        regs.push({ aba: aba.nome, linha: i + 1, pessoa, data: dia, motivo })
        return
      }
      if (/[A-Za-zÀ-ÿ]/.test(txt) && txt.length > 3) { pessoa = txt; return }
      avisos.push(`${aba.nome} linha ${i + 1}: não classificada ("${txt}")`)
    })
  }
  return { regs, avisos }
}

async function main() {
  if (!ARQUIVO) {
    console.error('uso: importar-suspensoes.ts <arquivo.xlsx> [--gravar]')
    process.exit(1)
  }
  const buf = fs.readFileSync(ARQUIVO)
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 12)
  const { regs, avisos } = extrair(buf)

  const pessoas = await prisma.user.findMany({
    where: { origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false },
    select: { id: true, name: true, nexusUserId: true, entryDate: true, active: true,
      department: { select: { name: true } } },
  })
  const alvo = pessoas.map((p) => ({
    personKey: p.nexusUserId ?? p.id,
    nome: p.name,
    setor: p.department?.name ?? '(sem setor)',
    ativo: p.active,
    admissao: p.entryDate ? p.entryDate.toISOString().slice(0, 10) : null,
    toks: toks(p.name),
  }))

  type Casado = Registro & { personKey: string; nomeSistema: string; setor: string; ativo: boolean }
  const casados: Casado[] = []
  const semNome: Registro[] = []
  const antesDaAdmissao: (Registro & { nomeSistema: string; admissao: string })[] = []
  const ambiguos: (Registro & { candidatos: string[] })[] = []
  const semAdmissao: (Registro & { nomeSistema: string })[] = []

  for (const r of regs) {
    const tp = toks(r.pessoa)
    const sp = new Set(tp)
    const exato = alvo.filter((a) => norm(a.nome) === norm(r.pessoa))
    let cands = exato
    if (!cands.length) {
      cands = alvo.filter((a) => {
        const inter = a.toks.filter((t) => sp.has(t))
        return tp.length > 0 && a.toks.length > 0 && tp[0] === a.toks[0] && inter.length >= 2
      })
    }
    if (cands.length === 0) { semNome.push(r); continue }
    if (cands.length > 1) { ambiguos.push({ ...r, candidatos: cands.map((c) => c.nome) }); continue }
    const c = cands[0]
    // ⚠️ A TRAVA DA ADMISSÃO. Fato antes de entrar na casa não é dela.
    if (!c.admissao) { semAdmissao.push({ ...r, nomeSistema: c.nome }); continue }
    if (r.data < c.admissao) {
      antesDaAdmissao.push({ ...r, nomeSistema: c.nome, admissao: c.admissao })
      continue
    }
    casados.push({ ...r, personKey: c.personKey, nomeSistema: c.nome, setor: c.setor, ativo: c.ativo })
  }

  /* A advertência derivada que cai no MESMO DIA — é o mesmo fato. */
  const colisoes = casados.length
    ? await prisma.disciplinaEvento.findMany({
        where: {
          source: 'nexo', tipo: 'advertencia',
          OR: casados.map((c) => ({ personKey: c.personKey, data: c.data })),
        },
        select: { id: true, personKey: true, data: true, motivo: true },
      })
    : []

  const porPessoa = new Map<string, Casado[]>()
  for (const c of casados) {
    const k = `${c.nomeSistema} ${c.setor} ${c.ativo}`
    porPessoa.set(k, [...(porPessoa.get(k) ?? []), c])
  }

  console.log(`\n${GRAVAR ? 'GRAVANDO' : 'ENSAIO (nada será gravado)'} — ${ARQUIVO}  [sha ${hash}]`)
  console.log(`${regs.length} suspensões na planilha, ${new Set(regs.map((r) => r.pessoa)).size} pessoas\n`)

  console.log(`✅ VÃO ENTRAR: ${casados.length} suspensões, ${porPessoa.size} pessoas`)
  for (const [k, rs] of [...porPessoa.entries()].sort()) {
    const [nome, setor, ativo] = k.split(' ')
    const marca = ativo === 'true' ? '' : '  · desligado (fica na ficha; não pontua)'
    console.log(`   ${nome.padEnd(24)} ${setor.padEnd(12)} ${String(rs.length).padStart(2)}x  ${rs.map((r) => r.data).sort().join(', ')}${marca}`)
  }

  console.log(`\n⚠️  ADVERTÊNCIA DERIVADA NO MESMO DIA (vai ser SUBSTITUÍDA): ${colisoes.length}`)
  for (const c of colisoes) {
    const q = casados.find((x) => x.personKey === c.personKey && x.data === c.data)
    console.log(`   ${c.data}  ${q?.nomeSistema ?? c.personKey}  —  era "${c.motivo}", vira suspensão (${q?.motivo})`)
  }

  console.log(`\n✂️  DESCARTADAS — fato ANTES da admissão (não é a mesma pessoa): ${antesDaAdmissao.length}`)
  for (const r of antesDaAdmissao) {
    console.log(`   ${r.data}  ${r.pessoa.slice(0, 40).padEnd(42)} → ${r.nomeSistema} (admitido em ${r.admissao})`)
  }

  console.log(`\n✂️  DESCARTADAS — sem correspondência no sistema (saíram): ${semNome.length}`)
  const porNome = new Map<string, string[]>()
  for (const r of semNome) porNome.set(r.pessoa, [...(porNome.get(r.pessoa) ?? []), r.data])
  for (const [nome, datas] of [...porNome.entries()].sort()) {
    console.log(`   ${nome.slice(0, 42).padEnd(44)} ${String(datas.length).padStart(2)}x  (${datas.sort().join(', ')})`)
  }

  if (ambiguos.length) {
    console.log(`\n⚠️  AMBÍGUAS — mais de um candidato, NÃO gravadas: ${ambiguos.length}`)
    for (const r of ambiguos) console.log(`   ${r.data}  ${r.pessoa} → ${r.candidatos.join(' | ')}`)
  }
  if (semAdmissao.length) {
    console.log(`\n⚠️  SEM DATA DE ADMISSÃO no sistema — NÃO gravadas (a trava não pode ser conferida): ${semAdmissao.length}`)
    for (const r of semAdmissao) console.log(`   ${r.data}  ${r.pessoa} → ${r.nomeSistema}`)
  }
  if (avisos.length) {
    console.log(`\n⚠️  AVISOS DE LEITURA: ${avisos.length}`)
    for (const a of avisos.slice(0, 20)) console.log(`   ${a}`)
  }

  const motivos = new Map<string, number>()
  for (const c of casados) motivos.set(c.motivo, (motivos.get(c.motivo) ?? 0) + 1)
  console.log('\nmotivos que entram:')
  for (const [m, n] of [...motivos.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)}  ${m}`)

  if (!GRAVAR) {
    console.log('\n(ensaio — rode de novo com --gravar para aplicar)')
    return
  }

  /* ── grava ───────────────────────────────────────────────────────────────
     Idempotente pelo par (source, sourceId): re-rodar o mesmo arquivo não
     duplica. O sourceId leva o hash do arquivo + aba + linha, então uma
     planilha CORRIGIDA e reenviada entra como registro novo em vez de colidir
     em silêncio com o antigo. */
  let gravadas = 0
  for (const c of casados) {
    const sourceId = `${hash}:${c.aba}:${c.linha}`
    await prisma.disciplinaEvento.upsert({
      where: { source_sourceId: { source: 'disciplina', sourceId } },
      create: {
        id: createHash('sha1').update(`susp:${sourceId}`).digest('hex').slice(0, 25),
        personKey: c.personKey, source: 'disciplina', sourceId,
        data: c.data, tipo: 'suspensao', motivo: c.motivo, dias: null,
      },
      update: { personKey: c.personKey, data: c.data, tipo: 'suspensao', motivo: c.motivo },
    })
    gravadas++
  }
  let removidas = 0
  if (colisoes.length) {
    const r = await prisma.disciplinaEvento.deleteMany({ where: { id: { in: colisoes.map((c) => c.id) } } })
    removidas = r.count
  }
  console.log(`\nGRAVADO: ${gravadas} suspensões · ${removidas} advertências derivadas substituídas`)
  console.log('⚠️ Rode `rodar-mes.ts <setor> <competência> --gravar` para as notas refletirem isto.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
