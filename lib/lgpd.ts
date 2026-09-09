import 'server-only'
import type { PrismaClient } from '@prisma/client'

/* ============================================================
   A MEDIDA DE LGPD VIRANDO EVENTO DE DISCIPLINA — num lugar só.

   Usada pelo receptor do push (`/api/integrations/nexus-lgpd`) e pelo sync de
   reconciliação (`run-lgpd-sync.mjs`). A régua da casa: a conta mora em um
   lugar, e dois caminhos que gravam a mesma coisa não podem divergir.

   ⚠️⚠️ GRAVA EM `disciplina_evento` COM `source = 'lgpd'`, e isso não é
   detalhe: o import do ponto é wipe+rebuild e apaga
   `disciplina_evento WHERE source = 'nexo'`. Guardar a medida de LGPD com
   qualquer outro `source` a faria sobreviver; guardar com `'nexo'` a faria
   sumir na próxima carga do dump, sem erro nenhum.

   ⚠️⚠️ E O `tipo` É PRÓPRIO (`lgpd_advertencia` / `lgpd_suspensao`), NÃO
   `advertencia`. A advertência que já existe na tabela é DERIVADA dos atrasos
   (a regra da casa do 2º atraso do mês) e vale −75 na régua; uma advertência
   por vazamento de dados é assinada, é outra natureza e tem de pesar diferente.
   Se as duas dividissem o mesmo `tipo`, a falta grave entraria na conta pelo
   peso do atraso e ninguém veria a diferença — e a assiduidade
   (`100 − atrasos·2 − advertências·5`), que mede PRESENÇA, passaria a descontar
   por vazamento de dado, que não tem nada a ver com chegar no horário.
   ============================================================ */

export const TIPO_LGPD = {
  advertencia: 'lgpd_advertencia',
  suspensao: 'lgpd_suspensao',
} as const

type MedidaCrua = Record<string, unknown>

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Grava (ou atualiza) UMA medida. Idempotente por `(source, sourceId)` — o
 * push repete quando a rede falha no meio da resposta, e o sync relê tudo.
 */
export async function gravarMedidaLgpd(prisma: PrismaClient, m: MedidaCrua) {
  const id = texto(m.id)
  const nexusUserId = texto(m.nexusUserId)
  const measure = texto(m.measure)
  const occurredAt = texto(m.occurredAt)
  if (!id || !nexusUserId || !measure || !occurredAt) {
    return { ok: false as const, erro: 'campos_obrigatorios' }
  }
  const tipo = measure === 'suspensao' ? TIPO_LGPD.suspensao
    : measure === 'advertencia' ? TIPO_LGPD.advertencia
    : null
  /* ⚠️ `orientacao` e `outro` não são punição e não descontam ponto. Recusar é
     melhor que gravar um evento que a régua não sabe pesar — ele viraria uma
     linha na ficha de alguém que nunca soma nada. */
  if (!tipo) return { ok: false as const, erro: 'medida_nao_punitiva' }

  const dia = occurredAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { ok: false as const, erro: 'data_invalida' }

  /* ⚠️⚠️ A PESSOA PRECISA EXISTIR AQUI. Sem vínculo não se inventa um: uma
     suspensão gravada com `personKey` chutado é uma falta grave na ficha de
     outra pessoa. Não é erro — o próximo sync de diretório traz quem faltava, e
     o sync de LGPD grava a medida então. */
  const user = await prisma.user.findUnique({
    where: { nexusUserId },
    select: { id: true, nexusUserId: true },
  })
  if (!user) return { ok: true as const, gravada: false, motivo: 'pessoa_ainda_nao_sincronizada' }

  const personKey = user.nexusUserId ?? user.id
  const ordinal = typeof m.measureOrder === 'number' ? m.measureOrder : null
  const rotulo = tipo === TIPO_LGPD.suspensao ? 'Suspensão' : 'Advertência'
  const base = `${ordinal ? `${ordinal}ª ` : ''}${rotulo} por vazamento de dados (LGPD)`
  /* ⚠️ O título da origem só entra quando ACRESCENTA. Ele costuma ser
     "1ª Suspensão LGPD" — a mesma informação que o rótulo já dá —, e repeti-la
     produzia "1ª Suspensão por vazamento de dados (LGPD) — 1ª Suspensão LGPD".
     Frase que se repete não informa; é a lição da lista de advertências da
     ficha, onde sete linhas idênticas escondiam o que era útil.

     ⚠️ Compara por PALAVRA, não por texto montado: a primeira versão montava o
     padrão com "a" e o título traz "ª" (U+00AA), que não decompõe em "a" ao
     tirar acento — os dois nunca casavam e a duplicata passou para o banco. */
  const palavras = (x: string) => new Set(
    x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .split(/[^a-z0-9]+/).filter(Boolean),
  )
  const t = texto(m.title)
  const dasBase = palavras(base)
  const redundante = !t || [...palavras(t)].every((w) => dasBase.has(w))
  const motivo = redundante ? base : `${base} — ${t}`

  await prisma.disciplinaEvento.upsert({
    where: { source_sourceId: { source: 'lgpd', sourceId: id } },
    create: { personKey, source: 'lgpd', sourceId: id, data: dia, tipo, motivo },
    update: { personKey, data: dia, tipo, motivo },
  })
  return { ok: true as const, gravada: true }
}
