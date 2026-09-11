/* ENSAIO da NAVEGAÇÃO SEM MENU LATERAL (11/09/2026). Não escreve nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-menu.ts
 *
 * Duas perguntas, as duas com o banco real:
 *
 *   1. OS CARTÕES. A Diretoria recebe um cartão para cada tela que era do menu
 *      (Dashboard, Funcionários, Departamentos, os 10 sistemas, Configurações) mais
 *      Avaliações e Meu desempenho; cada cartão aponta para uma página que existe;
 *      nenhum leva a `/servicos` (a planilha se sobe dentro do setor). Quem não é
 *      Diretoria não recebe NENHUM.
 *
 *   2. A BUSCA DO GESTOR. Para cada GESTOR, com o dataset que o layout monta para
 *      ele, buscar o nome de cada pessoa e de cada setor da casa só pode devolver o
 *      que ele consegue abrir (pessoas: os setores que ele avalia e ele mesmo, a
 *      régua de `podeVer`; setores: esses e o setor em que ele senta, a régua de
 *      `/api/dept-metrics`) — e tem de achar cada pessoa do time dele. O dataset
 *      dele traz a casa inteira; sem o recorte a busca ofereceria fichas que
 *      respondem 403.
 *
 * A prova de que o gestor não recebe o botão nem os cartões NO HTML está no
 * `ensaio-acesso-gestao.mjs` (sessão forjada, página de verdade).
 */
import { existsSync } from 'node:fs'
import { prisma } from '../lib/db/prisma'
import { getTalentData } from '../lib/data/source'
import { buscar } from '../lib/ui/busca'
import { cartoesDoMenu, TODAS_AS_TELAS } from '../lib/ui/menu'
import type { Alcance } from '../lib/alcance-recorte'

async function main() {
  let ok = 0, falhas = 0
  const erros: string[] = []
  const confere = (oque: string, cond: boolean) => { if (cond) ok++; else { falhas++; erros.push(oque) } }

  // ── 1. os cartões ────────────────────────────────────────────────────────
  const diretoria = cartoesDoMenu(true).flatMap((g) => g.telas)
  const esperado = ['/dashboard', '/funcionarios', '/departamentos', '/avaliacoes', '/minha-avaliacao',
    '/turnover', '/assiduidade', '/classroom', '/radio', '/whatsapp', '/consultoria', '/helpdesk',
    '/cide', '/gerencia', '/chat', '/configuracoes']
  const hrefs = diretoria.map((t) => t.href)
  confere(`Diretoria: ${hrefs.length} cartões (esperado ${esperado.length})`, hrefs.length === esperado.length)
  for (const h of esperado) confere(`Diretoria tem o cartão ${h}`, hrefs.includes(h))
  confere('nenhum cartão repetido', new Set(hrefs).size === hrefs.length)
  confere('nenhum cartão leva a /servicos', !hrefs.some((h) => h.startsWith('/servicos')))
  for (const t of diretoria) {
    confere(`a página de ${t.href} existe`, existsSync(`app/(app)${t.href}/page.tsx`))
    confere(`o cartão ${t.href} tem nome e descrição`, !!t.label.trim() && !!t.desc.trim())
    // ⚠️ Regra (b) da casa: cartão sem número (um número aqui teria de obedecer ao filtro).
    confere(`o cartão ${t.href} não traz número`, !/\d/.test(t.label + t.desc))
  }
  confere('o "voltar" usa a mesma lista', TODAS_AS_TELAS.length === diretoria.length)
  confere('quem não é Diretoria não recebe cartão nenhum', cartoesDoMenu(false).length === 0)
  console.log(`cartões: ${hrefs.length} para a Diretoria, ${cartoesDoMenu(false).length} para o gestor`)

  // ── 2. a busca do gestor ─────────────────────────────────────────────────
  const gestores = await prisma.user.findMany({
    where: { role: 'GESTOR', leftAt: null },
    select: { id: true, name: true, departmentId: true },
    orderBy: { name: 'asc' },
  })
  const vinculos = await prisma.setorAvaliador.findMany({ select: { userId: true, departmentId: true } })

  for (const g of gestores) {
    // O MESMO alcance que `app/(app)/layout.tsx` monta: os setores que ele avalia, e ele.
    const departmentIds = [...new Set(vinculos.filter((v) => v.userId === g.id).map((v) => v.departmentId))]
    const alcance: Alcance = { tipo: 'recorte', departmentIds, meuId: g.id, meuSetorId: g.departmentId }
    const data = await getTalentData(alcance)
    // ⚠️ A régua da ROTA (`/api/dept-metrics`, `podeVerSetor`), escrita de novo aqui de
    // propósito: conferir a busca contra a própria conta dela não pegaria divergência.
    const podeSetor = (id: string) => departmentIds.includes(id) || id === g.departmentId
    const deptDe = new Map(data.employees.map((e) => [e.id, e.dept]))
    const podePessoa = (id: string) => id === g.id || (!!deptDe.get(id) && departmentIds.includes(deptDe.get(id)!))

    let oferecidos = 0, vazou = 0, time = 0, achouTime = 0
    for (const q of [...data.departments.map((d) => d.nome), ...data.employees.map((e) => e.nome)]) {
      for (const r of buscar(data, q, alcance)) {
        oferecidos++
        const pode = r.tipo === 'setor' ? podeSetor(r.id) : podePessoa(r.id)
        if (!pode) { vazou++; confere(`${g.name}: "${q}" ofereceu ${r.tipo} fora do alcance (${r.nome})`, false) }
      }
    }
    for (const e of data.employees.filter((e) => podePessoa(e.id))) {
      time++
      if (buscar(data, e.nome, alcance).some((r) => r.tipo === 'pessoa' && r.id === e.id)) achouTime++
      else confere(`${g.name}: não achou ${e.nome}, do time dele`, false)
    }
    confere(`${g.name}: nada fora do alcance`, vazou === 0)
    confere(`${g.name}: acha o time inteiro`, achouTime === time)
    console.log(`── ${g.name}: ${departmentIds.length} setor(es) · time de ${time} · ${oferecidos} resultados oferecidos, ${vazou} fora do alcance`)
  }

  if (erros.length) console.log('❌', erros.slice(0, 30).join('\n   '))
  console.log(`${falhas ? '❌' : '✅'} ${ok + falhas} conferências, ${falhas} divergências`)
  await prisma.$disconnect()
  process.exit(falhas ? 1 : 0)
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2) })
