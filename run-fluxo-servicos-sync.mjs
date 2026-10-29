// Os SERVIÇOS DO DP e do LEGAL (Fluxo, .70) → "Indicadores internos" do TalentCare (14/10/2026; Legal 29/10/2026).
//
// ⚠️⚠️ O LEGAL (29/10/2026, pedido do Daniel: "os resultados do legal de cada funcionário deverão ser enviados para
// os indicadores do departamento e dos usuários lá no TalentCare"): a mesma rota com `&area=legal`
// (`plane/fluxo/talent_legal.py`) — tarefa concluída para quem a concluiu, bloco de apoio para quem marcou o último
// passo, tudo pela data. A partir de NOVEMBRO/2026: outubro é da planilha do Gestta (o Legal começou no Fluxo no
// dia 29), e a planilha de outubro ainda pode subir — a recusa de planilha agora vale só para os meses que o Fluxo
// cobre (`/api/servicos/importar`).
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
/** Os setores pelo id do NEXUS — o nome de setor muda, o id não. `area` vai na rota do Fluxo (vazio = o DP). */
const SETORES = [
  { sigla: 'DP', nexusId: 'b9a6a9c5-1787-4c77-b942-4247ae50d9d8', area: null, primeiroMes: '2026-09', prefixo: 'fluxo:' },
  { sigla: 'Legal', nexusId: 'fb048f73-ca57-481c-bce5-7b8ca23b0d0f', area: 'legal', primeiroMes: '2026-11', prefixo: 'fluxo-legal:' },
]
/** O autor dos envios automáticos (a tela de Serviços mostra "Fluxo (automático)"). */
const AUTOR = 'fluxo'
const ARQUIVO = (sigla, mes) => `Fluxo · serviços do ${sigla} · ${mes.slice(5)}/${mes.slice(0, 4)}`

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
  const usuarios = await prisma.user.findMany({ where: { nexusUserId: { not: null } }, select: { nexusUserId: true } })
  const daCasa = new Set(usuarios.map((u) => u.nexusUserId))
  for (const setor of SETORES) {
    const dept = await prisma.department.findUnique({ where: { nexusDepartmentId: setor.nexusId }, select: { id: true, name: true } })
    // ⚠️ um setor faltando não derruba o outro
    if (!dept) { console.error(`[${new Date().toISOString()}] setor ${setor.sigla} (Nexus ${setor.nexusId}) não existe no TalentCare`); continue }
    await sincronizarSetor(setor, dept, daCasa)
  }
}

async function sincronizarSetor(setor, dept, daCasa) {
  // hoje em São Paulo (o Fluxo corta o dia no mesmo fuso)
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const todos = setor.primeiroMes <= hoje.slice(0, 7) ? mesesAte(setor.primeiroMes, hoje.slice(0, 7)) : []
  const meses = completo ? todos : todos.slice(-2)

  for (const mes of meses) {
    const { de, ate } = janela(mes)
    const res = await fetch(`${BASE}/api/integrations/talent-servicos?mes=${mes}${setor.area ? `&area=${setor.area}` : ''}`, { headers: { 'X-API-Key': KEY } })
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
      // os funcionários da empresa da folha (cadastro no mês da competência) — base de "funcionários administrados"
      funcionarios: Number.isInteger(s.funcionarios) ? s.funcionarios : null,
    }))
    const semVinculo = linhas.filter((l) => !l.personKey).length
    const hash = setor.prefixo + mes + ':' + createHash('sha256').update(JSON.stringify(servicos.map((s) => [s.id, s.nexusUserId, s.dia, s.tarefa, s.cliente, s.regua, s.funcionarios]))).digest('hex')

    const igual = await prisma.importLote.findFirst({ where: { departmentId: dept.id, hash, ativo: true } })
    if (igual) {
      console.log(`[${new Date().toISOString()}] ${setor.sigla} ${mes}: ${linhas.length} serviços, sem mudança`)
      continue
    }
    if (ensaio) {
      const porRegua = servicos.reduce((a, s) => ({ ...a, [s.regua]: (a[s.regua] ?? 0) + 1 }), {})
      console.log(`[ensaio] ${setor.sigla} ${mes}: ${linhas.length} serviços ${JSON.stringify(porRegua)} (${semVinculo} sem pessoa da casa), janela ${diaDe}..${diaAte}`)
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
            data: { departmentId: dept.id, arquivo: ARQUIVO(setor.sigla, mes), hash, diaDe, diaAte, linhas: linhas.length, linhasSemVinculo: semVinculo, enviadoPor: AUTOR },
          })
      if (linhas.length) {
        await tx.servicoDepto.createMany({ data: linhas.map((l) => ({ ...l, loteId: lote.id, departmentId: dept.id })) })
      }
    })
    console.log(`[${new Date().toISOString()}] ${setor.sigla} ${mes}: ${linhas.length} serviços gravados (${semVinculo} sem pessoa da casa)`)
  }
}

main()
  .catch((e) => { console.error(`[${new Date().toISOString()}] ERRO`, e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
