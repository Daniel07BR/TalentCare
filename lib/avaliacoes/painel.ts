import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { CRITERIOS, competencias, limitesDaCompetencia, nivelDe, mediaDe } from './criterios'
import { enderecoDe, sufixoDe } from './endereco'
import { podeAvaliar, type Quem, type Setor } from './regua'

/* ============================================================
   O HISTÓRICO DAS AVALIAÇÕES — o painel do setor e o da pessoa (02/10/2026).

   Pedido do Daniel: "monitorar todo o histórico de avaliações ao longo do
   tempo, dashboard do departamento e dos funcionários".

   ⚠️⚠️ QUEM VÊ: a Diretoria (tudo) e quem AVALIA o setor (vínculo gravado) —
   a mesma régua da fila. Colaborador não chega aqui: ele tem a página dele.

   ⚠️⚠️ O NÚMERO É DA GESTÃO, e não de quem é avaliado (Daniel, 02/10/2026). Um
   gestor abrindo o painel do PRÓPRIO setor se acha na lista: na linha dele vai
   o NOME do nível, sem a média, e sem a parte da gestão — a mesma regra de
   `/minha-avaliacao`, para o painel não virar a porta dos fundos dela.

   ⚠️ Só avaliação PUBLICADA entra nas contas. Rascunho é o gestor pensando em
   voz alta; aparece como "rascunho" na linha da pessoa e em nenhum gráfico.
   ============================================================ */

export type NivelKey = 'abaixo' | 'parte' | 'atende' | 'acima'
export type Contagem = Record<NivelKey, number>
const zero = (): Contagem => ({ abaixo: 0, parte: 0, atende: 0, acima: 0 })
const nivelKey = (n: number | null | undefined): NivelKey | null => (n == null ? null : (nivelDe(n).key as NivelKey))

/** Pode abrir o painel deste setor? Diretoria, ou quem avalia ali. */
export function acessaSetor(quem: Quem, departmentId: string): boolean {
  if (quem.escopo.tipo === 'tudo') return true
  return quem.escopo.avaliaDepartmentIds.includes(departmentId)
}

/** O setor de um endereço (`ti-x8k2p9`), ou de um id inteiro. */
export async function setorDoEndereco(endereco: string) {
  const suf = sufixoDe(endereco)
  if (!suf) return null
  const achados = await prisma.department.findMany({ where: { id: { endsWith: suf } }, select: { id: true, name: true } })
  if (achados.length !== 1) return null
  return { id: achados[0].id, nome: achados[0].name, endereco: enderecoDe({ id: achados[0].id, nome: achados[0].name }) }
}

const mesesValidos = (n: number) => ([6, 12, 24].includes(n) ? n : 12)

// ── O PAINEL DO SETOR ─────────────────────────────────────────────────────────
export async function painelDoSetor(quem: Quem, setor: { id: string; nome: string; endereco: string }, nMeses: number) {
  const meses = competencias(mesesValidos(nMeses)).reverse() // do mais velho ao mais novo
  const { inicio } = limitesDaCompetencia(meses[0])

  const avs = await prisma.avaliacao.findMany({
    where: { departmentId: setor.id, competencia: { in: meses } },
    select: {
      id: true, competencia: true, avaliadoId: true, status: true, media: true, versao: true,
      notas: { select: { criterio: true, nota: true } },
      ciencia: { select: { cienteEm: true, versaoCiente: true } },
      documento: { select: { concluidaEm: true } },
      gestao: { select: { emRisco: true, prontoParaMais: true, querNaEquipe: true } },
    },
  })

  /* A população: quem é do setor hoje (ativo, e não conta de sistema) + quem foi
     avaliado AQUI no período e saiu ou mudou de setor depois — o histórico não
     some porque a pessoa foi embora. */
  const idsAvaliados = [...new Set(avs.map((a) => a.avaliadoId))]
  const gente = await prisma.user.findMany({
    where: {
      foraDoDiretorio: false,
      OR: [
        { departmentId: setor.id, active: true },
        { departmentId: setor.id, leftAt: { gte: inicio } },
        { id: { in: idsAvaliados } },
      ],
    },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true, entryDate: true, leftAt: true, departmentId: true, active: true },
    orderBy: { name: 'asc' },
  })

  const porPessoaMes = new Map(avs.map((a) => [`${a.avaliadoId}|${a.competencia}`, a]))

  /* Quem EU posso avaliar — a janela da pessoa mostra o botão "Avaliar" só para
     quem pode. ⚠️ O MESMO contexto da fila e da rota (`podeAvaliar`): se as três
     contas divergissem, o botão abriria uma tela que responde 403. */
  const [vinc, dept] = await Promise.all([
    prisma.setorAvaliador.findMany({ where: { departmentId: setor.id }, select: { userId: true, nivel: true } }),
    prisma.department.findUnique({ where: { id: setor.id }, select: { avaliadoPelaDiretoria: true } }),
  ])
  const ctxSetor: Setor = { niveis: new Map(vinc.map((v) => [v.userId, v.nivel])), pelaDiretoria: !!dept?.avaliadoPelaDiretoria }

  /** Estava no quadro naquele mês? (admissão antes do fim, saída depois do início) */
  const noQuadro = (p: (typeof gente)[number], c: string) => {
    const { inicio: i, fim: f } = limitesDaCompetencia(c)
    if (p.entryDate && p.entryDate > f) return false
    if (p.leftAt && p.leftAt < i) return false
    if (p.departmentId !== setor.id && !porPessoaMes.has(`${p.id}|${c}`)) return false
    return true
  }

  const resumo = meses.map((c) => {
    const pubs = avs.filter((a) => a.competencia === c && a.status === 'publicada')
    const niveis = zero()
    for (const a of pubs) { const k = nivelKey(a.media); if (k) niveis[k]++ }
    return {
      competencia: c,
      niveis,
      avaliados: pubs.length,
      quadro: gente.filter((p) => noQuadro(p, c)).length,
      concluidas: pubs.filter((a) => a.documento?.concluidaEm).length,
      media: mediaDe(pubs.map((a) => ({ nota: a.media }))),
    }
  })

  /* Os três pontos no último mês COM avaliação publicada (o mês fechado pode
     ainda estar sem nenhuma). */
  const ultimo = [...resumo].reverse().find((r) => r.avaliados > 0)?.competencia ?? null
  const criterios = CRITERIOS.map((cr) => {
    const niveis = zero()
    if (ultimo) {
      for (const a of avs) {
        if (a.competencia !== ultimo || a.status !== 'publicada') continue
        const k = nivelKey(a.notas.find((n) => n.criterio === cr.key)?.nota)
        if (k) niveis[k]++
      }
    }
    return { key: cr.key, label: cr.label, niveis }
  })

  const pessoas = gente.map((p) => {
    const souEu = p.id === quem.id
    const linha: Record<string, { nivel: NivelKey | null; media: number | null; status: string; concluida: boolean; ciente: boolean } | null> = {}
    for (const c of meses) {
      const a = porPessoaMes.get(`${p.id}|${c}`)
      if (!a) { linha[c] = noQuadro(p, c) ? null : { nivel: null, media: null, status: 'fora', concluida: false, ciente: false }; continue }
      const pub = a.status === 'publicada'
      linha[c] = {
        nivel: pub ? nivelKey(a.media) : null,
        media: pub && !souEu ? a.media : null,
        status: a.status,
        concluida: !!a.documento?.concluidaEm,
        ciente: !!a.ciencia && a.ciencia.versaoCiente === a.versao,
      }
    }
    // Tendência: o último mês publicado contra o anterior publicado.
    const pubs = meses.map((c) => porPessoaMes.get(`${p.id}|${c}`)).filter((a) => a?.status === 'publicada' && a.media != null)
    const [ant, atu] = pubs.slice(-2)
    const tendencia = atu && ant ? (atu.media! > ant.media! ? 'sobe' : atu.media! < ant.media! ? 'desce' : 'igual') : null
    // A gestão do último mês em que ela foi respondida — nunca na linha do próprio.
    const g = souEu ? null : [...pubs].reverse().find((a) => a?.gestao)?.gestao ?? null
    return {
      id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador', hasAvatar: !!p.avatarUrl,
      endereco: enderecoDe({ id: p.id, nome: p.name }),
      souEu, ativo: p.active, meses: linha, tendencia,
      posso: p.departmentId === setor.id && podeAvaliar(quem, { id: p.id, departmentId: p.departmentId }, ctxSetor),
      gestao: g ? { emRisco: g.emRisco, prontoParaMais: g.prontoParaMais, querNaEquipe: g.querNaEquipe } : null,
    }
  })

  return { setor, meses, ultimo, resumo, criterios, pessoas }
}

// ── O PAINEL DA PESSOA ────────────────────────────────────────────────────────
export async function painelDaPessoa(quem: Quem, setor: { id: string; nome: string; endereco: string }, enderecoPessoa: string, nMeses: number) {
  const suf = sufixoDe(enderecoPessoa)
  const achados = suf ? await prisma.user.findMany({
    where: { id: { endsWith: suf } },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true, departmentId: true, department: { select: { name: true } }, entryDate: true },
  }) : []
  if (achados.length !== 1) return null
  const p = achados[0]
  const souEu = p.id === quem.id

  const meses = competencias(mesesValidos(nMeses)).reverse()
  const avs = await prisma.avaliacao.findMany({
    where: { avaliadoId: p.id, competencia: { in: meses } },
    orderBy: { competencia: 'desc' },
    select: {
      competencia: true, status: true, media: true, versao: true, comentario: true, combinado: true,
      publishedAt: true, avaliadorId: true, departmentId: true,
      notas: { select: { criterio: true, nota: true, justificativa: true } },
      ciencia: { select: { cienteEm: true, comentario: true, versaoCiente: true } },
      documento: { select: { concluidaEm: true, frenteTipo: true } },
      gestao: { select: { emRisco: true, prontoParaMais: true, querNaEquipe: true, anotacao: true } },
    },
  })
  // ⚠️ A pessoa tem de ser DESTE setor (hoje, ou avaliada aqui): o endereço
  // `/setor/fiscal/<alguém do contábil>` não pode abrir a pessoa por outra porta.
  if (p.departmentId !== setor.id && !avs.some((a) => a.departmentId === setor.id)) return null
  // ⚠️ Avaliação feita em OUTRO setor (antes de uma transferência) só entra se
  // quem pergunta enxerga aquele setor também.
  const visiveis = avs.filter((a) => a.status === 'publicada' && (!a.departmentId || acessaSetor(quem, a.departmentId)))
  const avaliadores = await prisma.user.findMany({
    where: { id: { in: [...new Set(visiveis.map((a) => a.avaliadorId))] } }, select: { id: true, name: true },
  })
  const nomeDe = new Map(avaliadores.map((u) => [u.id, u.name]))

  return {
    setor,
    pessoa: {
      id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador', setor: p.department?.name ?? setor.nome,
      hasAvatar: !!p.avatarUrl, endereco: enderecoDe({ id: p.id, nome: p.name }), entryDate: p.entryDate,
    },
    souEu,
    meses,
    avaliacoes: visiveis.map((a) => ({
      competencia: a.competencia,
      nivel: nivelKey(a.media),
      media: souEu ? null : a.media,
      versao: a.versao,
      publicadaEm: a.publishedAt,
      avaliador: nomeDe.get(a.avaliadorId) ?? 'Avaliador',
      notas: CRITERIOS.map((cr) => {
        const n = a.notas.find((x) => x.criterio === cr.key)
        return { criterio: cr.key, label: cr.label, nivel: nivelKey(n?.nota), justificativa: n?.justificativa ?? null }
      }),
      recado: a.comentario,
      combinado: a.combinado,
      ciencia: a.ciencia ? { em: a.ciencia.cienteEm, comentario: a.ciencia.comentario, atual: a.ciencia.versaoCiente === a.versao } : null,
      concluidaEm: a.documento?.concluidaEm ?? null,
      soPdf: !!a.documento?.concluidaEm && !a.documento?.frenteTipo,
      gestao: souEu || !a.gestao ? null : a.gestao,
    })),
  }
}
