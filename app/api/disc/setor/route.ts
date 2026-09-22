import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh } from '@/lib/avaliacoes/regua'
import { niveisDoSetor, podeVerDisc } from '@/lib/disc/regua'
import { filtroEquipe, vigentes } from '@/lib/disc/leitura'

/* ============================================================
   O DISC do SETOR (GET ?dept=<Department.id>) — o cartão do relatório do setor.

   ⚠️⚠️ A lista e a conta saem do MESMO recorte: só as pessoas cujo DISC quem lê
   pode ver (`podeVerDisc`, pessoa a pessoa). O sub-encarregado vê o setor sem o
   gestor e sem ele mesmo, e o "de quantos" diz isso. Somar na média quem não
   aparece na lista faria a média falar de gente que a tela esconde.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  const quem = await quemEh(uid)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const deptId = req.nextUrl.searchParams.get('dept') ?? ''
  const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true, name: true } })
  if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (quem.role !== 'ADMIN' && !quem.escopo.avaliaDepartmentIds.includes(dept.id)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [gente, niveis] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: dept.id, ...filtroEquipe },
      select: { id: true, name: true, jobTitle: true, avatarUrl: true, departmentId: true },
      orderBy: { name: 'asc' },
    }),
    niveisDoSetor(dept.id),
  ])
  const visiveis = gente.filter((p) => podeVerDisc(quem, p, niveis))
  const disc = await vigentes(visiveis.map((p) => p.id))

  return NextResponse.json({
    setor: { id: dept.id, nome: dept.name },
    /** Quantas pessoas do setor ficaram FORA por régua (gestor, a própria pessoa). */
    ocultas: gente.length - visiveis.length,
    pessoas: visiveis.map((p) => {
      const n = disc.get(p.id)
      return {
        id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador', hasAvatar: !!p.avatarUrl,
        notas: n ? { D: n.D, I: n.I, S: n.S, C: n.C } : null,
        aplicadoEm: n?.aplicadoEm ?? null,
      }
    }),
  })
}
