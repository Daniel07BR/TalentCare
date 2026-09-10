import { prisma } from '@/lib/db/prisma'
import { deriveLevelAndDetail, type EduItem } from '@/lib/education-edit'

/* ============================================================
   ESCOLARIDADE informada pelo RH, para quem a planilha não cobre.

   ENSAIO por padrão. Grava só com `--gravar`.
     npx --yes tsx@4 --tsconfig scripts/tsconfig.json scripts/semear-escolaridade.ts [--gravar]

   ⚠️⚠️ USA A MESMA LIB DO EDITOR (`deriveLevelAndDetail`), não um `level`
   digitado à mão. O nível canônico e o texto do `detail` saem de uma conta só —
   senão a linha semeada aqui apareceria diferente da linha que a tela
   `/escolaridade` produz para a mesma formação, e o donut de escolaridade
   passaria a ter duas gramáticas.

   ⚠️⚠️ CASAMENTO POR **LOGIN**, nunca por nome. Os três pares perigosos existem
   todos nesta casa: Bruna Costa × Bruna Cunha, Gabriel Costa × Gabriel Santana,
   Yasmin Ensinas × Yasmin Barroso. A lista do RH vem com primeiro nome e
   sobrenome soltos ("Cynthia"), e é assim que o import do ponto casou
   "Wendel Ribeiro da Silva" com "Edileuza da Silva".

   ⚠️ Grava com `source: 'manual'` — e o `run-education-import.mjs` passou a
   respeitar essa marca (10/09/2026). Antes ele sobrescrevia sem olhar, e o
   trabalho manual sumia na carga seguinte, em silêncio.
   ============================================================ */

const GRAVAR = process.argv.includes('--gravar')

/** O que o RH informou, em 10/09/2026, para as pessoas sem formação registrada. */
const LISTA: { login: string; itens: EduItem[] }[] = [
  { login: 'cynthia.hora', itens: [{ tipo: 'Ensino Médio', curso: '', cursando: false }] },
  { login: 'gabriel.costa', itens: [{ tipo: 'Ensino Médio', curso: '', cursando: false }] },
  { login: 'laryssa.oliveira', itens: [{ tipo: 'Ensino Médio', curso: '', cursando: false }] },
  {
    login: 'tabata.vieira',
    /* ⚠️ "Último semestre" entra no CURSO, não vira marca própria: o modelo tem
       "cursando" (sim/não) e não tem semestre. Jogá-lo fora perderia a
       informação mais útil da linha — ela está prestes a se formar. */
    itens: [{ tipo: 'Superior', curso: 'Gestão de Recursos Humanos — último semestre', cursando: true }],
  },
  { login: 'yasmin.ensinas', itens: [{ tipo: 'Superior', curso: 'Relações Internacionais', cursando: true }] },
  /* ⚠️⚠️ BRUNA COSTA FICA DE FORA, de propósito. O RH escreveu "Superior
     Incompleto **?** (Direito)" — a interrogação é de quem informou, e este
     campo alimenta o donut de escolaridade e a ficha de uma pessoa real.
     Gravar uma dúvida como fato é o tipo de coisa que ninguém revisa depois,
     porque o valor fica plausível. Entra quando o RH confirmar. */
]

async function main() {
  const pessoas = await prisma.user.findMany({
    where: { email: { not: '' } },
    select: { nexusUserId: true, id: true, name: true, email: true, department: { select: { name: true } } },
  })
  const porLogin = new Map(pessoas.map((p) => [p.email.split('@')[0].toLowerCase(), p]))

  console.log(`\n${GRAVAR ? 'GRAVANDO' : 'ENSAIO (nada será gravado)'}\n`)
  const aplicar: { nexusUserId: string; nome: string; setor: string; level: string; detail: string | null; itens: EduItem[] }[] = []

  for (const l of LISTA) {
    const p = porLogin.get(l.login)
    if (!p) { console.log(`  ⚠️ ${l.login}: NÃO ENCONTRADO — pulo`); continue }
    if (!p.nexusUserId) { console.log(`  ⚠️ ${p.name}: sem nexusUserId — pulo`); continue }
    const d = deriveLevelAndDetail(l.itens)
    if (!d.level) { console.log(`  ⚠️ ${p.name}: itens não derivam nível — pulo`); continue }
    /* ⚠️ Não sobrescreve quem JÁ tem formação registrada: a lista é para quem
       está pendente, e passar por cima de um dado existente seria um efeito
       colateral silencioso. */
    const ja = await prisma.employeeEducation.findUnique({
      where: { nexusUserId: p.nexusUserId }, select: { level: true, source: true },
    })
    if (ja?.level) {
      console.log(`  ⚠️ ${p.name}: JÁ TEM "${ja.level}" (${ja.source}) — pulo, para não sobrescrever`)
      continue
    }
    aplicar.push({
      nexusUserId: p.nexusUserId, nome: p.name, setor: p.department?.name ?? '—',
      level: d.level, detail: d.detail, itens: l.itens,
    })
  }

  for (const a of aplicar) {
    console.log(`  ${a.nome.padEnd(18)} ${a.setor.padEnd(11)} ${a.level.padEnd(20)} ${a.detail ?? ''}`)
  }
  console.log(`\n${aplicar.length} de ${LISTA.length} da lista${GRAVAR ? '' : ' (ensaio)'}`)

  if (!GRAVAR) { console.log('\n(repita com --gravar para aplicar)'); return }

  for (const a of aplicar) {
    await prisma.employeeEducation.upsert({
      where: { nexusUserId: a.nexusUserId },
      create: { nexusUserId: a.nexusUserId, level: a.level, detail: a.detail, source: 'manual', raw: { items: a.itens } },
      update: { level: a.level, detail: a.detail, source: 'manual', raw: { items: a.itens } },
    })
  }
  console.log(`\nGRAVADO: ${aplicar.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
