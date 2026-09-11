import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'

/* ============================================================
   OS CHAMADOS ENTRE SETORES de um setor, um a um (11/09/2026).

   Pedido do dono: o cartão "Chamados entre setores" do relatório do setor mostrava
   só contadores — "não dá para clicar e ver as pessoas e quantidades de chamados
   que atenderam ou abriram, nem de qual departamento eram os chamados que
   atenderam e nem para qual abriram".

   ⚠️ SOB DEMANDA, sem espelho: pergunta ao Chat Interno (`/api/integrations/
   talent-setor`), que usa as MESMAS regras da conta por setor do espelho
   (`chat_dept_daily`, de onde sai o número do cartão) — a lista tem o tamanho do
   número. O `ensaio-chamados-setor.mjs` confere isso setor a setor.

   ⚠️ A régua da porta é a de `/api/dept-metrics` (`podeVerSetor`): quem abre o
   relatório do setor abre os chamados dele. A pessoa de OUTRO setor que pediu ou
   atendeu aparece pelo nome (é quem está do outro lado do chamado, e o Chat já
   mostra), mas o link para a ficha só vai quando a régua da ficha (`podeVer`)
   deixa — senão o clique cairia num 403.
   ============================================================ */

type PessoaChat = { nexusUserId: string | null; nome: string | null }
type SetorChat = { nexusDepartmentId: string | null; nome: string | null }
type ItemChat = {
  id: string; numero: number; assunto: string; situacao: string; melhoriaDe: string | null
  origem: SetorChat; destino: SetorChat; pediu: PessoaChat; assumiu: PessoaChat | null
  abertoEm: string; fechadoEm: string | null; segundosUteis: number | null
}
const FACES = ['pediu', 'pediuConcluidos', 'recebeu', 'concluiu', 'cancelados'] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id') ?? ''
  const dept = await prisma.department.findUnique({ where: { id }, select: { id: true, name: true, nexusDepartmentId: true } })
  if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const podeVerSetor = quem.escopo.tipo === 'tudo' || quem.escopo.avaliaDepartmentIds.includes(dept.id) || quem.departmentId === dept.id
  if (!podeVerSetor) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (!dept.nexusDepartmentId) return NextResponse.json({ error: 'Setor sem vínculo com o Nexus' }, { status: 422 })

  const { fromDay, toDay } = rangeDaRequisicao(req)
  const qs = new URLSearchParams({ nexusDepartmentId: dept.nexusDepartmentId, fromDay, toDay })
  let d: Record<string, ItemChat[]>
  try {
    const r = await fetch(`${process.env.CHAT_BASE_URL}/api/integrations/talent-setor?${qs}`, {
      headers: { 'x-api-key': process.env.CHAT_API_KEY ?? '' }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return NextResponse.json({ error: `O Chat Interno respondeu ${r.status}` }, { status: 502 })
    d = await r.json()
  } catch {
    return NextResponse.json({ error: 'O Chat Interno não respondeu' }, { status: 502 })
  }

  // Os nomes e as fotos da casa, e se a ficha se abre para quem está lendo.
  const nxIds = new Set<string>()
  const depIds = new Set<string>()
  for (const f of FACES) for (const t of d[f] ?? []) {
    if (t.pediu?.nexusUserId) nxIds.add(t.pediu.nexusUserId)
    if (t.assumiu?.nexusUserId) nxIds.add(t.assumiu.nexusUserId)
    if (t.origem?.nexusDepartmentId) depIds.add(t.origem.nexusDepartmentId)
    if (t.destino?.nexusDepartmentId) depIds.add(t.destino.nexusDepartmentId)
  }
  const [users, depts] = await Promise.all([
    prisma.user.findMany({ where: { nexusUserId: { in: [...nxIds] } }, select: { id: true, nexusUserId: true, name: true, avatarUrl: true, departmentId: true } }),
    prisma.department.findMany({ where: { nexusDepartmentId: { in: [...depIds] } }, select: { id: true, name: true, nexusDepartmentId: true } }),
  ])
  const porNx = new Map(users.map((u) => [u.nexusUserId as string, u]))
  const depPorNx = new Map(depts.map((x) => [x.nexusDepartmentId as string, x]))

  const pessoa = (p: PessoaChat | null) => {
    if (!p) return null
    const u = p.nexusUserId ? porNx.get(p.nexusUserId) : undefined
    return {
      nome: u?.name ?? p.nome ?? '—',
      id: u && podeVer(quem, { id: u.id, departmentId: u.departmentId }) ? u.id : null,
      hasAvatar: !!u?.avatarUrl, fotoId: u?.id ?? null,
    }
  }
  const setor = (s: SetorChat) => {
    const x = s?.nexusDepartmentId ? depPorNx.get(s.nexusDepartmentId) : undefined
    return { id: x?.id ?? null, nome: x?.name ?? s?.nome ?? 'sem setor' }
  }
  const item = (t: ItemChat) => ({
    id: t.id, numero: t.numero, assunto: t.assunto, situacao: t.situacao, melhoriaDe: t.melhoriaDe,
    origem: setor(t.origem), destino: setor(t.destino), pediu: pessoa(t.pediu), assumiu: pessoa(t.assumiu),
    abertoEm: t.abertoEm, fechadoEm: t.fechadoEm, segundosUteis: t.segundosUteis,
  })

  return NextResponse.json({
    setor: { id: dept.id, nome: dept.name }, fromDay, toDay,
    ...Object.fromEntries(FACES.map((f) => [f, (d[f] ?? []).map(item)])),
  })
}
