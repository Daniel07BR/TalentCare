import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { aPartirDe, competencias, nivelDe } from '@/lib/avaliacoes/criterios'
import { reguaDoSetor } from '@/lib/avaliacoes/metodo'

// O que a PESSOA vê de si mesma: as avaliações publicadas dela, da mais nova
// para a mais velha, com a nota por critério e o histórico para o gráfico.
//
// ⚠️⚠️ Rascunho NUNCA entra aqui. `status: 'publicada'` é a régua inteira — sem
// ela a pessoa leria o gestor pensando em voz alta, e o gestor deixaria de
// rascunhar por medo, que é o oposto do que o rascunho existe para permitir.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const meuId = (session.user as { id: string }).id

  // ⚠️ Um admin pode olhar a página de outra pessoa passando ?id=. Qualquer
  // outro só vê a si mesmo — e a checagem é aqui, no servidor.
  const pedido = req.nextUrl.searchParams.get('id')
  const eu = await prisma.user.findUnique({
    where: { id: meuId },
    select: { id: true, role: true },
  })
  const alvoId = pedido && eu?.role === 'ADMIN' ? pedido : meuId

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { avaliadoId: alvoId, status: 'publicada' },
    orderBy: { competencia: 'desc' },
    take: 24,
    include: {
      notas: true,
      ciencia: true,
      documento: { select: { concluidaEm: true, versaoAssinada: true, frenteTipo: true } },
      versoes: { orderBy: { versao: 'desc' }, select: { versao: true, motivo: true, media: true, publishedAt: true } },
    },
  })

  const avaliadorIds = [...new Set(avaliacoes.map((a) => a.avaliadorId))]
  const avaliadores = await prisma.user.findMany({
    where: { id: { in: avaliadorIds } },
    select: { id: true, name: true, jobTitle: true },
  })
  const nomeDe = new Map(avaliadores.map((a) => [a.id, a]))

  // O setor de cada avaliação é o CONGELADO nela — vale a régua daquele mês.
  const deptIds = [...new Set(avaliacoes.map((a) => a.departmentId).filter((x): x is string => !!x))]
  const depts = await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
  const setorDe = new Map(depts.map((d) => [d.id, d.name]))

  const pessoa = await prisma.user.findUnique({
    where: { id: alvoId },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true, department: { select: { name: true } } },
  })

  /* ⚠️⚠️ O NÚMERO NÃO SAI PARA O AVALIADO (Daniel, 02/10/2026: "não posso
     apresentar notas, apenas as observações; a nota só deve ficar na tela do
     gestor para criarmos um gráfico"). A pessoa recebe o NOME do nível de cada
     ponto e do mês — o 8,7 nem viaja no JSON dela. Só um ADMIN olhando outra
     pessoa (?id=) recebe a média. */
  const comNumero = alvoId !== meuId
  const nivel = (n: number | null) => (n == null ? null : nivelDe(n).key)

  return NextResponse.json({
    pessoa: pessoa && {
      id: pessoa.id, nome: pessoa.name, cargo: pessoa.jobTitle ?? 'Colaborador',
      setor: pessoa.department?.name ?? 'Sem setor', hasAvatar: !!pessoa.avatarUrl,
    },
    souEu: alvoId === meuId,
    // Últimas competências, para a pessoa ver que meses ficaram SEM avaliação —
    // um mês ausente é informação, e escondê-lo faria o gráfico mentir por
    // omissão sobre a regularidade da avaliação.
    esperadas: aPartirDe(competencias(12).reverse(), avaliacoes.map((a) => a.competencia).sort()[0]).reverse(),
    avaliacoes: avaliacoes.map((a) => ({
      id: a.id,
      competencia: a.competencia,
      media: comNumero ? a.media : null,
      nivel: nivel(a.media),
      versao: a.versao,
      comentario: a.comentario,
      combinado: a.combinado,
      publishedAt: a.publishedAt,
      regua: reguaDoSetor(a.departmentId ? setorDe.get(a.departmentId) : pessoa?.department?.name),
      avaliador: nomeDe.get(a.avaliadorId)?.name ?? 'Avaliador',
      avaliadorCargo: nomeDe.get(a.avaliadorId)?.jobTitle ?? null,
      notas: a.notas.map((n) => ({ criterio: n.criterio, nivel: nivel(n.nota), justificativa: n.justificativa })),
      ciencia: a.ciencia && {
        cienteEm: a.ciencia.cienteEm, comentario: a.ciencia.comentario,
        versaoCiente: a.ciencia.versaoCiente, lidoEm: a.ciencia.lidoEm,
      },
      // ⚠️ Ciência de uma versão ANTERIOR não vale para a atual: a pessoa deu
      // ciência de um texto que mudou depois.
      concluidaEm: a.documento?.concluidaEm ?? null,
      // Concluída só com o PDF único não tem foto de frente: o link vira "ver PDF".
      soPdf: !!a.documento?.concluidaEm && !a.documento?.frenteTipo,
      precisaCienciaNova: !!a.ciencia && a.ciencia.versaoCiente < a.versao,
      versoes: a.versoes.map((v) => ({ versao: v.versao, motivo: v.motivo, publishedAt: v.publishedAt, nivel: nivel(v.media) })),
    })),
  })
}
