import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
import { CRITERIOS, competenciaAnterior, nivelDe, ancoraDe } from '@/lib/avaliacoes/criterios'
import { reguaDoSetor, significado } from '@/lib/avaliacoes/metodo'

/**
 * O TERMO — o que vai para o PDF assinado (02/10/2026).
 *
 * ⚠️⚠️ Rota PRÓPRIA, e não a de `[avaliadoId]` reaproveitada na tela: o PDF tem
 * de conter SÓ o que foi mostrado ao avaliado. Montado aqui, campo a campo, a
 * parte da gestão não tem como escapar para o papel por um `include` a mais —
 * e papel assinado não se recolhe.
 *
 * ⚠️ Só avaliação PUBLICADA: rascunho não se assina.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ avaliadoId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { avaliadoId } = await ctx.params
  const competencia = req.nextUrl.searchParams.get('competencia') || competenciaAnterior()

  const alvo = await prisma.user.findUnique({
    where: { id: avaliadoId },
    select: { id: true, name: true, jobTitle: true, departmentId: true, department: { select: { name: true } } },
  })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    select: {
      status: true, versao: true, media: true, comentario: true, combinado: true,
      publishedAt: true, avaliadorId: true, departmentId: true,
      notas: { select: { criterio: true, nota: true, justificativa: true } },
      ciencia: { select: { cienteEm: true, comentario: true, versaoCiente: true } },
    },
  })
  if (!av || av.status !== 'publicada') {
    return NextResponse.json({ error: 'Não há avaliação publicada nesta competência.' }, { status: 404 })
  }

  // O setor da AVALIAÇÃO (congelado na publicação), não o de hoje: quem mudou de
  // setor depois continua avaliado pela régua que valia no mês.
  const [avaliador, dept, vinculo] = await Promise.all([
    prisma.user.findUnique({ where: { id: av.avaliadorId }, select: { name: true } }),
    av.departmentId ? prisma.department.findUnique({ where: { id: av.departmentId }, select: { name: true } }) : null,
    av.departmentId
      ? prisma.setorAvaliador.findFirst({ where: { departmentId: av.departmentId, userId: av.avaliadorId }, select: { nivel: true } })
      : null,
  ])
  /* ⚠️ O PAPEL de quem avaliou, e não o cargo do cadastro (Daniel, 02/10/2026: "no
     meu caso, neste relatório, me apresente como Gestor" — o cadastro dizia
     "Administrador"). No papel assinado o que conta é a função NA AVALIAÇÃO:
     sub-encarregado quando o vínculo é `sub`, Gestor em todo o resto. */
  const papel = vinculo?.nivel === 'sub' ? 'Sub-encarregado' : 'Gestor'
  const setor = dept?.name ?? alvo.department?.name ?? 'Sem setor'
  const regua = reguaDoSetor(setor)

  return NextResponse.json({
    competencia,
    pessoa: { nome: alvo.name, cargo: alvo.jobTitle ?? 'Colaborador', setor },
    avaliador: { nome: avaliador?.name ?? 'Avaliador', papel },
    publicadaEm: av.publishedAt,
    versao: av.versao,
    reguaPropria: regua.propria,
    // O setor pelo nome da casa ("T.I", e não o "TI" do cadastro) quando a régua o conhece.
    setorNome: regua.setor,
    // ⚠️⚠️ Sem o número (02/10/2026): o papel mostra o NOME do nível; a média fica com a gestão.
    resultado: av.media != null ? { nivel: ancoraDe(av.media).label, nivelKey: nivelDe(av.media).key } : null,
    pontos: CRITERIOS.map((c) => {
      const n = av.notas.find((x) => x.criterio === c.key)
      const nv = n?.nota != null ? nivelDe(n.nota) : null
      return {
        criterio: c.label, sub: c.sub ?? null,
        nivel: nv?.label ?? 'Não avaliado',
        nivelKey: nv?.key ?? null,
        significado: nv ? significado(regua, c.key, nv.key) : '',
        exemplo: n?.justificativa ?? null,
      }
    }),
    recado: av.comentario,
    combinado: av.combinado,
    // A ciência só vale se for da versão ATUAL: a de antes cobria outro texto.
    ciencia: av.ciencia && av.ciencia.versaoCiente === av.versao
      ? { em: av.ciencia.cienteEm, comentario: av.ciencia.comentario }
      : null,
  })
}
