// Os SERVIÇOS DO DP (Fluxo, .70) → "Serviços do setor" do TalentCare (14/10/2026).
// Rode: node --env-file=.env run-fluxo-servicos-sync.mjs [--completo] [--ensaio]
//
// Pedido do Daniel: a produção de cada pessoa do Departamento Pessoal — folha (por porte), vale,
// FGTS, DCTF, férias, rescisões, admissões, conferências e o e-Social do mês — entra na MESMA
// metade da nota em que o Legal entra pela planilha do Gestta, separada dos chamados. A origem é
// `GET /api/integrations/talent-servicos` do Fluxo (`plane/fluxo/talent_servicos.py`).
//
// ⚠️⚠️ O CRÉDITO JÁ VEM DECIDIDO. Quem concluiu, quem conferiu, quem finalizou as férias: é a
// régua das telas do Fluxo, e aqui só se grava. Refazer a conta deste lado daria dois números
// para a mesma pessoa no mesmo mês ([[mesmo-numero-duas-reguas-em-dois-sistemas]]).
//
// ⚠️⚠️ UM ENVIO POR MÊS, que SUBSTITUI o anterior do Fluxo naquele mês — e só o do Fluxo.
// A gravação da planilha (`/api/servicos/importar`) apaga a janela inteira do setor; aqui o
// apagar é restrito aos lotes do Fluxo, para um envio automático nunca levar junto uma
// planilha que alguém subiu. Rodar de novo com o mesmo conteúdo não grava nada (hash).
//
// ⚠️⚠️ POR MÊS, EM DUAS RÉGUAS (14/10/2026, pedido do Daniel): o Fluxo devolve, para o mês M, as pastas
// do mês (folha, domésticas, vale, FGTS, DCTF, pró-labore, sem movimento) e o e-Social da COMPETÊNCIA M —
// a folha de setembro é de setembro mesmo fechada em outubro, como no painel do DP — e admissão,
// rescisão e férias FEITAS em M. O `dia` do serviço por competência vem preso ao mês dela, e é assim
// que o filtro "Set" daqui lê a competência de setembro.
// ⚠️ O mês passado continua mudando (uma folha de setembro concluída em outubro; uma rescisão
// reaberta): o incremental repassa o mês corrente E o anterior; o `--completo` (madrugada)
// repassa desde 09/2026, o corte do Fluxo.
// ⚠️ `minutos` = 0: o Fluxo não mede esforço (o tempo entre assumir e concluir é calendário).
// A liderança do DP define o tempo médio de cada tipo no catálogo — até lá, 1 ponto por serviço,
// e o tipo aparece como pendente de ajuste.
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.FLUXO_BASE_URL
const KEY = process.env.FLUXO_API_KEY
/** O setor "Pessoal" pelo id do NEXUS — o nome de setor muda, o id não. */
const DP_NEXUS_ID = 'b9a6a9c5-1787-4c77-b942-4247ae50d9d8'
const PRIMEIRO_MES = '2026-09'
/** O autor dos envios automáticos (a tela de Serviços mostra "Fluxo (automático)"). */
const AUTOR = 'fluxo'
const ARQUIVO = (mes) => `Fluxo · serviços do DP · ${mes.slice(5)}/${mes.slice(0, 4)}`

const completo = process.argv.includes('--completo')
const ensaio = process.argv.includes('--ensaio')

function mesesAte(primeiro, ultimo) {
  const saida = []
  let [a, m] = primeiro.split('-').map(Number)
  const [ua, um] = ultimo.split('-').map(Number)
  while (a < ua || (a === ua && m <= um)) {
    saida.push(`${a}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m === 13) { m = 1; a += 1 }
  }
  return saida
}

function janela(mes) {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` }
}

async function main() {
  if (!BASE || !KEY) throw new Error('FLUXO_BASE_URL/FLUXO_API_KEY ausentes no .env')
  const dept = await prisma.department.findUnique({ where: { nexusDepartmentId: DP_NEXUS_ID }, select: { id: true, name: true } })
  if (!dept) throw new Error(`setor do DP (Nexus ${DP_NEXUS_ID}) não existe no TalentCare`)

  // hoje em São Paulo (o Fluxo corta o dia no mesmo fuso)
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const todos = mesesAte(PRIMEIRO_MES, hoje.slice(0, 7))
  const meses = completo ? todos : todos.slice(-2)

  const usuarios = await prisma.user.findMany({ where: { nexusUserId: { not: null } }, select: { nexusUserId: true } })
  const daCasa = new Set(usuarios.map((u) => u.nexusUserId))

  for (const mes of meses) {
    const { de, ate } = janela(mes)
    const res = await fetch(`${BASE}/api/integrations/talent-servicos?mes=${mes}`, { headers: { 'X-API-Key': KEY } })
    if (!res.ok) throw new Error(`Fluxo ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const servicos = data.servicos ?? []
    // ⚠️ a janela GRAVADA é a que o Fluxo respondeu (o mês corrente vai até hoje)
    const diaDe = data.de, diaAte = data.ate

    const linhas = servicos.map((s) => ({
      personKey: s.nexusUserId && daCasa.has(s.nexusUserId) ? s.nexusUserId : null,
      nomeOrigem: s.nome || '(sem autor no Fluxo)',
      dia: s.dia,
      status: 'concluida',
      tarefa: s.tarefa,
      cliente: s.cliente ?? null,
      minutos: 0,
    }))
    const semVinculo = linhas.filter((l) => !l.personKey).length
    const hash = 'fluxo:' + mes + ':' + createHash('sha256').update(JSON.stringify(servicos.map((s) => [s.id, s.nexusUserId, s.dia, s.tarefa, s.cliente, s.regua]))).digest('hex')

    const igual = await prisma.importLote.findFirst({ where: { departmentId: dept.id, hash, ativo: true } })
    if (igual) {
      console.log(`[${new Date().toISOString()}] ${mes}: ${linhas.length} serviços, sem mudança`)
      continue
    }
    if (ensaio) {
      const porRegua = servicos.reduce((a, s) => ({ ...a, [s.regua]: (a[s.regua] ?? 0) + 1 }), {})
      console.log(`[ensaio] ${mes}: ${linhas.length} serviços ${JSON.stringify(porRegua)} (${semVinculo} sem pessoa da casa), janela ${diaDe}..${diaAte}`)
      continue
    }

    await prisma.$transaction(async (tx) => {
      const velhos = await tx.importLote.findMany({
        where: { departmentId: dept.id, enviadoPor: AUTOR, ativo: true, diaDe: { gte: de }, diaAte: { lte: ate } },
        select: { id: true },
      })
      const ids = velhos.map((v) => v.id)
      if (ids.length) {
        await tx.servicoDepto.deleteMany({ where: { loteId: { in: ids } } })
        await tx.importLote.updateMany({ where: { id: { in: ids } }, data: { ativo: false } })
      }
      // o mesmo conteúdo já foi gravado e depois substituído: reativa em vez de duplicar o hash
      const antigo = await tx.importLote.findUnique({ where: { departmentId_hash: { departmentId: dept.id, hash } } })
      const lote = antigo
        ? await tx.importLote.update({ where: { id: antigo.id }, data: { ativo: true, diaDe, diaAte, linhas: linhas.length, linhasSemVinculo: semVinculo, enviadoEm: new Date() } })
        : await tx.importLote.create({
            data: { departmentId: dept.id, arquivo: ARQUIVO(mes), hash, diaDe, diaAte, linhas: linhas.length, linhasSemVinculo: semVinculo, enviadoPor: AUTOR },
          })
      if (linhas.length) {
        await tx.servicoDepto.createMany({ data: linhas.map((l) => ({ ...l, loteId: lote.id, departmentId: dept.id })) })
      }
    })
    console.log(`[${new Date().toISOString()}] ${mes}: ${linhas.length} serviços gravados (${semVinculo} sem pessoa da casa)`)
  }
}

main()
  .catch((e) => { console.error(`[${new Date().toISOString()}] ERRO`, e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
