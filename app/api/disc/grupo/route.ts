import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { isHiddenDept } from '@/lib/hidden-depts'
import { filtroEquipe, vigentes } from '@/lib/disc/leitura'
import { fatias, predominantes, type Notas } from '@/lib/disc/calculo'
import { FATORES, type Fator } from '@/lib/disc/perfis'

/* ============================================================
   O DISC da CASA, setor a setor — o cartão do painel principal.

   ⚠️ Só ADMIN (Diretoria/T.I), e só AGREGADO: a média e a contagem de cada
   setor, sem nome de ninguém. Quem quer a pessoa abre o setor.
   ============================================================ */

export async function GET() {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  const eu = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } })
  if (eu?.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const gente = await prisma.user.findMany({
    where: { ...filtroEquipe, departmentId: { not: null } },
    select: { id: true, departmentId: true, department: { select: { id: true, name: true } } },
  })
  const daCasa = gente.filter((p) => p.department && !isHiddenDept(p.department.name))
  const disc = await vigentes(daCasa.map((p) => p.id))

  type Acc = { id: string; nome: string; total: number; comDisc: number; soma: Record<Fator, number>; contagem: Record<Fator, number>; empates: number }
  const porSetor = new Map<string, Acc>()
  for (const p of daCasa) {
    const d = p.department!
    const a = porSetor.get(d.id) ?? { id: d.id, nome: d.name, total: 0, comDisc: 0, soma: { D: 0, I: 0, S: 0, C: 0 }, contagem: { D: 0, I: 0, S: 0, C: 0 }, empates: 0 }
    porSetor.set(d.id, a)
    a.total++
    const n = disc.get(p.id)
    if (!n) continue
    a.comDisc++
    for (const f of fatias(n as Notas)) a.soma[f.fator] += f.pct
    const pr = predominantes(n as Notas)
    if (pr.length > 1) a.empates++
    for (const f of pr) a.contagem[f]++
  }

  const setores = [...porSetor.values()]
    .map((a) => ({
      id: a.id, nome: a.nome, total: a.total, comDisc: a.comDisc, empates: a.empates, contagem: a.contagem,
      /** A MÉDIA das fatias das pessoas do setor — a "cor" do setor. */
      media: Object.fromEntries(FATORES.map((f) => [f, a.comDisc ? Math.round((a.soma[f] / a.comDisc) * 10) / 10 : 0])) as Record<Fator, number>,
    }))
    .sort((x, y) => y.comDisc - x.comDisc || x.nome.localeCompare(y.nome))

  return NextResponse.json({ setores, total: daCasa.length, comDisc: [...disc.keys()].length })
}
