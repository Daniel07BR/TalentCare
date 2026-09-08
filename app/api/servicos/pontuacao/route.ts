import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { competenciaValida } from '@/lib/servicos/pontuacao'
import { montar, gravarMes } from '@/lib/servicos/calcular-mes'

/* A tela chama isto; a MESMA conta mora em `lib/servicos/calcular-mes.ts`, que
   o script de linha de comando também usa. Aqui só a autenticação e a régua. */

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const departmentId = req.nextUrl.searchParams.get('departmentId') ?? ''
  const competencia = req.nextUrl.searchParams.get('competencia') ?? ''
  if (!podeGerirServicos(quem, departmentId)) return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  if (!competenciaValida(competencia)) return NextResponse.json({ error: 'Competência inválida (use AAAA-MM).' }, { status: 422 })
  const r = await montar(departmentId, competencia)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 422 })
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { departmentId?: string; competencia?: string } | null
  const departmentId = body?.departmentId ?? ''
  const competencia = body?.competencia ?? ''
  if (!podeGerirServicos(quem, departmentId)) return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  if (!competenciaValida(competencia)) return NextResponse.json({ error: 'Competência inválida (use AAAA-MM).' }, { status: 422 })
  const r = await gravarMes(departmentId, competencia)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 422 })
  return NextResponse.json(r)
}
