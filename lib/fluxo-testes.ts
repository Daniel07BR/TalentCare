import type { PrismaClient } from '@prisma/client'
import { validarNotas } from './disc/calculo'
import { validarPersonalidade } from './personalidade/calculo'

/* ============================================================
   OS TESTES DA ENTREVISTA DE EMPREGO, VINDOS DO FLUXO (22/10/2026).

   Pedido do Daniel: "no fluxo, no histórico, coloque uma maneira da recepção
   vincular o usuario que veio na entrevista a um usuario do sistema após ele
   ser contratado, assim o resultado já alimenta o talent care automaticamente".

   O Fluxo (`plane/fluxo/testes_ao_talentcare.py`) chama aqui quando a Recepção
   VINCULA o candidato a um funcionário (ou desfaz o vínculo), e de novo sempre
   que os testes daquela entrevista mudam (lançados, corrigidos, excluídos). Um
   envio = o ESTADO INTEIRO da entrevista: quem é a pessoa e o DISC e a
   personalidade que valem agora.

   ⚠️⚠️ A IDEMPOTÊNCIA é o `ref` (o id da entrevista no Fluxo): este lado APAGA
   as linhas daquela entrevista e grava as que chegaram. Reenviar não duplica;
   desfazer o vínculo (`pessoa: null`) tira o teste de quem foi ligado por
   engano; vincular a outra pessoa muda o teste de dono. O que a chefia lançou
   à mão aqui (`fluxoRef` nulo) nunca é tocado.

   ⚠️ A pessoa se acha pelo id do NEXUS (o mesmo dos dois lados). Contratado há
   pouco pode ainda não ter chegado ao TalentCare pelo sync do diretório:
   responde `pessoa_nao_encontrada` e o Fluxo reenvia de hora em hora.

   ⚠️ A atenção (busca de números e conferência) NÃO vem: é prova de seleção,
   e o TalentCare não tem onde lê-la. Fica no relatório da entrevista.
   ============================================================ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TesteDoFluxo = { em?: string; por?: string }
export type EnvioDosTestes = {
  versao?: number
  ref?: string
  pessoa?: string | null
  disc?: (TesteDoFluxo & { D?: number; I?: number; S?: number; C?: number }) | null
  personalidade?: (TesteDoFluxo & { tipo?: string; pct?: number[] }) | null
  setor?: string
  vinculadoPor?: string
}

/** O dia de São Paulo de um instante do Fluxo ("2026-10-21T08:33:00-03:00" → "2026-10-21"). */
function diaSP(em: unknown): string | null {
  const t = new Date(String(em ?? ''))
  if (Number.isNaN(t.getTime())) return null
  return t.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export async function gravarTestesDoFluxo(prisma: PrismaClient, e: EnvioDosTestes) {
  const ref = String(e?.ref ?? '')
  if (!UUID.test(ref)) return { ok: false as const, erro: 'ref_invalido', status: 400 }
  const pessoa = e.pessoa ? String(e.pessoa) : null
  if (pessoa && !UUID.test(pessoa)) return { ok: false as const, erro: 'pessoa_invalida', status: 400 }

  // Confere tudo ANTES de apagar: envio torto não pode deixar a pessoa sem o teste que tinha.
  const disc = e.disc ? validarNotas({ D: e.disc.D, I: e.disc.I, S: e.disc.S, C: e.disc.C }) : null
  if (disc && !disc.ok) return { ok: false as const, erro: `disc: ${disc.erro}`, status: 400 }
  const pers = e.personalidade ? validarPersonalidade(e.personalidade.tipo, e.personalidade.pct) : null
  if (pers && !pers.ok) return { ok: false as const, erro: `personalidade: ${pers.erro}`, status: 400 }

  const user = pessoa
    ? await prisma.user.findUnique({ where: { nexusUserId: pessoa }, select: { id: true, name: true } })
    : null
  if (pessoa && !user) return { ok: false as const, erro: 'pessoa_nao_encontrada', status: 404 }

  const setor = String(e.setor ?? '').trim().slice(0, 100)
  const vinculadoPor = String(e.vinculadoPor ?? '').trim().slice(0, 150)
  const observacao = `Entrevista de emprego${setor ? ` (${setor})` : ''}, no Fluxo${vinculadoPor ? ` · vinculado por ${vinculadoPor}` : ''}`
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const quem = (t: TesteDoFluxo | null | undefined) => `${String(t?.por ?? '').trim().slice(0, 150) || 'Recepção'} (Fluxo)`

  await prisma.$transaction(async (tx) => {
    await tx.discResultado.deleteMany({ where: { fluxoRef: ref } })
    await tx.personalidadeResultado.deleteMany({ where: { fluxoRef: ref } })
    if (!user) return
    if (disc?.ok && e.disc) {
      await tx.discResultado.create({
        data: {
          userId: user.id, d: disc.notas.D, i: disc.notas.I, s: disc.notas.S, c: disc.notas.C,
          aplicadoEm: diaSP(e.disc.em) ?? hoje, observacao, registradoPorId: 'fluxo', registradoPorNome: quem(e.disc),
          fluxoRef: ref,
        },
      })
    }
    if (pers?.ok && e.personalidade) {
      await tx.personalidadeResultado.create({
        data: {
          userId: user.id, tipo: pers.r.tipo, pct: pers.r.pct,
          aplicadoEm: diaSP(e.personalidade.em) ?? hoje, observacao, registradoPorId: 'fluxo',
          registradoPorNome: quem(e.personalidade), fluxoRef: ref,
        },
      })
    }
  })
  return {
    ok: true as const, status: 200,
    pessoa: user ? { id: user.id, nome: user.name } : null,
    disc: !!(user && disc?.ok), personalidade: !!(user && pers?.ok),
  }
}
