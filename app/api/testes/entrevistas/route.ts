import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, type Quem } from '@/lib/avaliacoes/regua'
import { podeRegistrarDisc } from '@/lib/disc/regua'

/* ============================================================
   PUXAR O RESULTADO DA ENTREVISTA, na ficha (03/11/2026).

   Pedido do Daniel: "crie um botão no talent care que o gestor pode clicar e puxar
   o resultado da entrevista, o sistema deve apresentar apenas as entrevistas que o
   gestor fez e ele seleciona a correta e já vincula o resultado, dai ele n precisa
   digitar novamente".

   GET  ?id=<pessoa>                       → as entrevistas que ele pode puxar
   POST {id, entrevista, acao, motivo}     → liga (ou desfaz) e o Fluxo já envia o
                                             resultado a `/api/integrations/fluxo-testes`

   ⚠️ A régua da PESSOA é a do DISC (aqui); a da ENTREVISTA, "só as que ele fez", é
   do Fluxo, que também recusa o id forjado. Diretoria e T.I (ADMIN) veem todas, para
   a vaga cujo entrevistador já não está — mas o Fluxo só manda o número a quem o lê.
   ⚠️ O Fluxo é quem guarda o vínculo (`Entrevista.contratacao`), a mesma lista do
   "Vincular ao contratado" da Recepção e da amarração do DP no card da admissão.
   ============================================================ */

const BASE = process.env.FLUXO_BASE_URL ?? ''
const CHAVE = process.env.FLUXO_API_KEY ?? ''
const ROTA = '/api/integrations/talent-entrevistas'
const SEM_FLUXO = 'O Fluxo não respondeu. Tente de novo em instantes.'

async function contexto(idDaPessoa: string) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return { erro: NextResponse.json({ error: 'Sem sessão' }, { status: 401 }) }
  const [quem, alvo, conta] = await Promise.all([
    quemEh(uid),
    prisma.user.findUnique({ where: { id: idDaPessoa }, select: { id: true, name: true, departmentId: true, nexusUserId: true } }),
    prisma.user.findUnique({ where: { id: uid }, select: { nexusUserId: true } }),
  ])
  if (!alvo) return { erro: NextResponse.json({ error: 'não encontrado' }, { status: 404 }) }
  if (!quem || !podeRegistrarDisc(quem, alvo)) return { erro: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  return { quem: quem as Quem, alvo, quemNexus: conta?.nexusUserId ?? null }
}

export async function GET(req: NextRequest) {
  const c = await contexto(req.nextUrl.searchParams.get('id') ?? '')
  if (c.erro) return c.erro
  // quem não tem conta no Nexus (colaborador avulso, staff) nunca passou pelas entrevistas do Fluxo
  if (!c.alvo.nexusUserId || !c.quemNexus) return NextResponse.json({ pessoa: { nome: c.alvo.name }, entrevistas: [] })
  const q = new URLSearchParams({ quem: c.quemNexus, pessoa: c.alvo.nexusUserId, todas: c.quem.role === 'ADMIN' ? '1' : '0' })
  try {
    const r = await fetch(`${BASE}${ROTA}?${q}`, { headers: { 'X-API-Key': CHAVE }, cache: 'no-store', signal: AbortSignal.timeout(20000) })
    if (!r.ok) return NextResponse.json({ error: SEM_FLUXO }, { status: 502 })
    const j = (await r.json()) as { entrevistas: unknown[] }
    return NextResponse.json({ pessoa: { nome: c.alvo.name }, entrevistas: j.entrevistas, todas: c.quem.role === 'ADMIN' })
  } catch {
    return NextResponse.json({ error: SEM_FLUXO }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  const c = await contexto(String(body.id ?? ''))
  if (c.erro) return c.erro
  if (!c.alvo.nexusUserId || !c.quemNexus) return NextResponse.json({ error: 'Esta pessoa não tem conta no Nexus.' }, { status: 400 })
  try {
    const r = await fetch(`${BASE}${ROTA}`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000),
      headers: { 'X-API-Key': CHAVE, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: body.acao, entrevista: body.entrevista, motivo: body.motivo, pessoa: c.alvo.nexusUserId,
        quem: c.quemNexus, quemNome: c.quem.nome, quemSetor: c.quem.departmentName ?? '', todas: c.quem.role === 'ADMIN',
      }),
    })
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; enviado?: boolean }
    if (!r.ok || !j.ok) return NextResponse.json({ error: j.error ?? SEM_FLUXO }, { status: r.status >= 400 ? r.status : 502 })
    return NextResponse.json({ ok: true, enviado: !!j.enviado })
  } catch {
    return NextResponse.json({ error: SEM_FLUXO }, { status: 502 })
  }
}
