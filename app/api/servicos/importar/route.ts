import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { lerPlanilha, normalizarNome } from '@/lib/servicos/planilha'
import { sugerirTodos, type Pessoa } from '@/lib/servicos/vinculo'

/* ============================================================
   IMPORTAÇÃO DA PLANILHA DE SERVIÇOS DE UM SETOR.

   ⚠️⚠️ DUAS FASES, e a primeira NÃO ESCREVE NADA. Sem `confirmar`, a rota lê o
   arquivo e devolve o que ELA FARIA: quantos serviços entram, que janela cobrem,
   de quem é cada nome, quem ficou pendente e o que seria substituído. Só a
   segunda chamada grava.

   Isso não é zelo: o `docs/PERIODO-E-DEPLOY.md` manda ensaiar a seco antes de um
   sync de diretório porque, em outro sistema da casa, um bloco de órfãos
   desativou 8 pessoas ativas de verdade e o log disse "sucesso". Importação que
   escreve antes de mostrar o que vai fazer é importação que ninguém confere.
   ============================================================ */

const LIMITE_BYTES = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const uid = (session.user as { id?: string }).id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const form = await req.formData()
  const departmentId = String(form.get('departmentId') ?? '')
  const confirmar = String(form.get('confirmar') ?? '') === 'true'
  const arquivo = form.get('arquivo')

  if (!departmentId) return NextResponse.json({ error: 'Falta o setor.' }, { status: 400 })
  /* ⚠️ A régua roda no SERVIDOR e antes de qualquer leitura. Confiar na tela
     deixaria um gestor importar para o setor do vizinho trocando um campo. */
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  if (!(arquivo instanceof File)) return NextResponse.json({ error: 'Falta o arquivo.' }, { status: 400 })
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json({ error: `Arquivo grande demais (${(arquivo.size / 1048576).toFixed(1)} MB). O limite é 20 MB.` }, { status: 413 })
  }

  const setor = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } })
  if (!setor) return NextResponse.json({ error: 'Setor não encontrado.' }, { status: 404 })

  let lida
  try {
    lida = lerPlanilha(Buffer.from(await arquivo.arrayBuffer()))
  } catch (e) {
    /* ⚠️ A mensagem tem de dizer o que fazer. "Erro ao processar" manda a pessoa
       tentar de novo com o mesmo arquivo errado. */
    return NextResponse.json({
      error: `Não consegui ler esta planilha: ${(e as Error).message} Confira se é o .xlsx exportado do sistema, e não um .csv ou um arquivo salvo por cima.`,
    }, { status: 400 })
  }

  if (!lida.servicos.length && !lida.pontos.length) {
    return NextResponse.json({
      error: 'A planilha abriu, mas não achei nem serviços nem pontos nela. A aba de serviços precisa das colunas Nome, Status e Data.',
      avisos: lida.avisos,
    }, { status: 400 })
  }

  // ── já importamos este arquivo? ────────────────────────────────────────────
  const jaImportado = await prisma.importLote.findUnique({ where: { hash: lida.hash } })
  if (jaImportado && !confirmar) {
    return NextResponse.json({
      jaImportado: {
        em: jaImportado.enviadoEm, arquivo: jaImportado.arquivo,
        linhas: jaImportado.linhas, ativo: jaImportado.ativo,
      },
      ...(await montarPrevia(departmentId, setor.name, lida)),
    })
  }
  if (jaImportado && confirmar) {
    return NextResponse.json({
      error: `Este arquivo já foi importado em ${jaImportado.enviadoEm.toLocaleDateString('pt-BR')}. Subir de novo criaria uma cópia de cada serviço.`,
    }, { status: 409 })
  }

  const previa = await montarPrevia(departmentId, setor.name, lida)
  if (!confirmar) return NextResponse.json(previa)

  // ── grava ──────────────────────────────────────────────────────────────────
  const resolvido = previa.nomes
  const chavePorNome = new Map(resolvido.map((n) => [n.nomeNorm, n.personKey]))

  const lote = await prisma.$transaction(async (tx) => {
    const l = await tx.importLote.create({
      data: {
        departmentId, arquivo: arquivo.name, hash: lida.hash,
        diaDe: lida.diaDe ?? '', diaAte: lida.diaAte ?? '',
        linhas: lida.servicos.length,
        linhasSemVinculo: previa.linhasSemVinculo,
        enviadoPor: quem.id,
      },
    })

    /* ⚠️⚠️ O ENVIO NOVO SUBSTITUI O ANTERIOR **NA JANELA QUE ELE COBRE**, e não
       o histórico inteiro. O arquivo do Legal é cumulativo (vai de 03/2025 até
       hoje), mas o próximo setor pode mandar só o mês — e apagar 18 meses porque
       chegou um arquivo de 30 dias é o defeito do "dia PARCIAL apaga o dia
       cheio" do `docs/FONTES.md`, em escala maior.

       Os lotes velhos ficam `ativo: false` em vez de sumir: é o que permite
       desfazer, e é o que responde "de onde saiu este número" seis meses
       depois. */
    if (lida.diaDe && lida.diaAte) {
      await tx.servicoDepto.deleteMany({
        where: { departmentId, dia: { gte: lida.diaDe, lte: lida.diaAte }, loteId: { not: l.id } },
      })
      await tx.importLote.updateMany({
        where: { departmentId, ativo: true, id: { not: l.id }, diaDe: { gte: lida.diaDe }, diaAte: { lte: lida.diaAte } },
        data: { ativo: false },
      })
    }

    await tx.servicoDepto.createMany({
      data: lida.servicos.map((s) => ({
        loteId: l.id, departmentId,
        personKey: chavePorNome.get(normalizarNome(s.nomeOrigem)) ?? null,
        nomeOrigem: s.nomeOrigem, dia: s.dia, status: s.status,
        tarefa: s.tarefa, cliente: s.cliente, minutos: s.minutos,
      })),
    })

    /* Os pontos históricos entram como **informados**, nunca como calculados.
       Ver o comentário de `PontuacaoMes.origem`: os 127 valores do Legal foram
       produzidos por um critério anterior — 105 deles passam do teto que a régua
       de hoje permite — e exibi-los como se a régua atual os tivesse produzido
       seria inventar procedência para número de gente de verdade. */
    for (const p of lida.pontos) {
      const chave = chavePorNome.get(normalizarNome(p.nomeOrigem))
      if (!chave) continue
      await tx.pontuacaoMes.upsert({
        where: { personKey_competencia: { personKey: chave, competencia: p.competencia } },
        create: { departmentId, personKey: chave, competencia: p.competencia, pontos: p.pontos, origem: 'informado', detalhe: `informado pelo setor no arquivo ${arquivo.name}` },
        update: { pontos: p.pontos, origem: 'informado', detalhe: `informado pelo setor no arquivo ${arquivo.name}` },
      })
    }
    return l
  }, { timeout: 120_000 })

  return NextResponse.json({ ok: true, loteId: lote.id, ...previa })
}

/* ── a prévia ─────────────────────────────────────────────────────────────── */

async function montarPrevia(departmentId: string, setorNome: string, lida: Awaited<ReturnType<typeof lerPlanilha>>) {
  const usuarios = await prisma.user.findMany({
    where: { origin: { in: ['nexus', 'staff'] } },
    select: { id: true, nexusUserId: true, name: true, email: true, domainAccount: true, active: true, department: { select: { name: true } } },
  })
  const pessoas: Pessoa[] = usuarios.map((u) => ({
    personKey: u.nexusUserId ?? u.id, nome: u.name, email: u.email,
    usuario: u.domainAccount, setor: u.department?.name ?? null, ativo: u.active,
  }))

  // Vínculos já confirmados à mão — eles VENCEM a sugestão automática.
  const salvos = await prisma.servicoVinculo.findMany({ where: { departmentId } })
  const salvoPorNome = new Map(salvos.map((v) => [v.nomeNorm, v]))

  const contagem = new Map<string, number>()
  for (const s of lida.servicos) contagem.set(s.nomeOrigem, (contagem.get(s.nomeOrigem) ?? 0) + 1)
  for (const p of lida.pontos) if (!contagem.has(p.nomeOrigem)) contagem.set(p.nomeOrigem, 0)

  const sugestoes = sugerirTodos([...contagem].map(([nomeOrigem, linhas]) => ({ nomeOrigem, linhas })), pessoas)

  const nomes = sugestoes.map((s) => {
    const salvo = salvoPorNome.get(s.nomeNorm)
    /* ⚠️ Vínculo conferido por gente MANDA. Inclusive o "não é da casa"
       (`personKey` nulo com `confirmado`), que é uma resposta, não uma ausência
       — sem essa distinção a tela pediria a mesma confirmação todo mês. */
    if (salvo?.confirmado) {
      return {
        ...s, personKey: salvo.personKey, resolvidoPor: 'conferido' as const,
        pessoa: pessoas.find((p) => p.personKey === salvo.personKey) ?? null,
      }
    }
    if (s.confianca === 'forte' && s.candidatos.length === 1) {
      return { ...s, personKey: s.candidatos[0].personKey, resolvidoPor: 'automatico' as const, pessoa: s.candidatos[0] }
    }
    return { ...s, personKey: null, resolvidoPor: 'pendente' as const, pessoa: null }
  })

  const porNome = new Map(nomes.map((n) => [n.nomeNorm, n]))
  const linhasSemVinculo = lida.servicos.filter((s) => !porNome.get(normalizarNome(s.nomeOrigem))?.personKey).length

  const substituir = lida.diaDe && lida.diaAte
    ? await prisma.servicoDepto.count({ where: { departmentId, dia: { gte: lida.diaDe, lte: lida.diaAte } } })
    : 0

  const porStatus = { concluida: 0, aberta: 0, desconsiderada: 0 }
  let minutosConcluidos = 0
  for (const s of lida.servicos) {
    porStatus[s.status]++
    if (s.status === 'concluida') minutosConcluidos += s.minutos
  }

  return {
    setor: setorNome,
    hash: lida.hash,
    diaDe: lida.diaDe, diaAte: lida.diaAte,
    pontosDe: lida.pontosDe, pontosAte: lida.pontosAte,
    totalServicos: lida.servicos.length,
    totalPontos: lida.pontos.length,
    porStatus, minutosConcluidos,
    linhasSemVinculo,
    /** Quantas linhas já existentes seriam apagadas e regravadas por este envio. */
    substituir,
    avisos: lida.avisos,
    nomes: nomes.map((n) => ({
      nomeOrigem: n.nomeOrigem, nomeNorm: n.nomeNorm, linhas: n.linhas,
      confianca: n.confianca, porque: n.porque, resolvidoPor: n.resolvidoPor,
      personKey: n.personKey,
      pessoa: n.pessoa ? { nome: n.pessoa.nome, setor: n.pessoa.setor, ativo: n.pessoa.ativo } : null,
      candidatos: n.candidatos.map((c) => ({ personKey: c.personKey, nome: c.nome, setor: c.setor, ativo: c.ativo })),
    })),
  }
}
