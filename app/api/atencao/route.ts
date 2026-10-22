import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh } from '@/lib/avaliacoes/regua'
import { podeRegistrarDisc, podeVerDisc } from '@/lib/disc/regua'
import { resumoDaBusca, resumoDaConferencia } from '@/lib/testes/atencao'

/* ============================================================
   A ATENÇÃO de UMA pessoa (GET ?id=), 22/10/2026. Só leitura: a atenção entra
   pelo código (`/api/testes/codigo`) ou pela entrevista no Fluxo. Régua do DISC;
   403 é o caso normal de quem não é da régua.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const [quem, alvo] = await Promise.all([
    quemEh(uid),
    prisma.user.findUnique({ where: { id }, select: { id: true, name: true, departmentId: true } }),
  ])
  if (!quem || !alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!podeVerDisc(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const linhas = await prisma.atencaoResultado.findMany({
    where: { userId: alvo.id },
    orderBy: [{ aplicadoEm: 'desc' }, { criadoEm: 'desc' }],
  })
  const vm = linhas.map((l) => ({
    id: l.id, aplicadoEm: l.aplicadoEm, codigo: l.codigo, observacao: l.observacao,
    registradoPorNome: l.registradoPorNome, fluxoRef: l.fluxoRef,
    busca: resumoDaBusca({ acertos: l.buscaAcertos, erros: l.buscaErros, omissoes: l.buscaOmissoes, percorrido: l.buscaPercorrido }),
    conferencia: resumoDaConferencia({ acertos: l.confAcertos, erros: l.confErros }),
  }))
  return NextResponse.json({
    pessoa: { id: alvo.id, nome: alvo.name },
    atual: vm[0] ?? null,
    historico: vm.slice(1),
    podeRegistrar: podeRegistrarDisc(quem, alvo),
  })
}
