import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { normalizarNome } from '@/lib/servicos/planilha'

/* ============================================================
   O VÍNCULO NOME-DO-ARQUIVO → PESSOA, resolvido por gente.

   ⚠️⚠️ Gravar o vínculo **reescreve os serviços já importados** daquele nome. É
   de propósito: quem confere um vínculo no dia 10 espera que os serviços de
   ontem passem a contar para a pessoa certa, não só os do próximo arquivo.
   Sem isso, o gestor conferiria a lista e não veria número nenhum mudar — e
   concluiria, com razão, que a tela não faz nada.
   ============================================================ */

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    departmentId?: string; nomeOrigem?: string; personKey?: string | null
    naoEhDaCasa?: boolean; motivo?: string
  } | null
  const departmentId = body?.departmentId ?? ''
  const nomeOrigem = (body?.nomeOrigem ?? '').trim()
  if (!departmentId || !nomeOrigem) {
    return NextResponse.json({ error: 'Falta o setor ou o nome.' }, { status: 400 })
  }
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }

  /* `naoEhDaCasa` grava `personKey: null` COM `confirmado: true`.
     ⚠️ "Conferi e não é gente daqui" é uma resposta; "ainda não olhei" é uma
     ausência. Guardar as duas do mesmo jeito faria a tela pedir a mesma
     confirmação todo mês, e alerta que não se apaga é alerta que ninguém lê. */
  const personKey = body?.naoEhDaCasa ? null : (body?.personKey || null)
  const MOTIVOS = ['nao_e_da_casa', 'ex_funcionario', 'outro_setor']
  const motivo = personKey ? null : (MOTIVOS.includes(body?.motivo ?? '') ? body!.motivo! : 'nao_e_da_casa')
  if (!body?.naoEhDaCasa && !personKey) {
    return NextResponse.json({ error: 'Escolha a pessoa ou marque "não é da casa".' }, { status: 400 })
  }
  if (personKey) {
    const existe = await prisma.user.findFirst({
      where: { OR: [{ nexusUserId: personKey }, { id: personKey }] }, select: { id: true },
    })
    if (!existe) return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  }

  const nomeNorm = normalizarNome(nomeOrigem)
  await prisma.$transaction([
    prisma.servicoVinculo.upsert({
      where: { departmentId_nomeNorm: { departmentId, nomeNorm } },
      create: { departmentId, nomeNorm, nomeOrigem, personKey, confirmado: true, criadoPor: quem.id, motivo },
      update: { personKey, nomeOrigem, confirmado: true, criadoPor: quem.id, motivo },
    }),
    // Recredita o que já está no banco — ver o aviso do topo.
    prisma.servicoDepto.updateMany({ where: { departmentId, nomeOrigem }, data: { personKey } }),
  ])

  const linhas = await prisma.servicoDepto.count({ where: { departmentId, nomeOrigem } })
  return NextResponse.json({ ok: true, nomeOrigem, personKey, linhasAtualizadas: linhas })
}
