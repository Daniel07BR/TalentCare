import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getTalentData, type Alcance } from '@/lib/data/source'
import { isOwnerEmail } from '@/lib/nexus'
import AppShell from './AppShell'
import PrepareGate from './PrepareGate'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role === 'SEM_PERMISSAO') redirect('/acesso-negado')

  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'USUARIO' ? 'Usuário' : role ?? ''
  const uid = (session.user as { id?: string }).id
  const me = uid
    ? await prisma.user.findUnique({ where: { id: uid }, select: { id: true, jobTitle: true, avatarUrl: true, departmentId: true } })
    : null
  const meDept = me?.departmentId ?? null
  const vinculosDele = uid
    ? await prisma.setorAvaliador.findMany({ where: { userId: uid }, select: { departmentId: true } })
    : []
  const meusSetoresIds = [...new Set([...vinculosDele.map((v) => v.departmentId), ...(meDept ? [meDept] : [])])]

  /* ⚠️⚠️ O dataset vai INTEIRO para o navegador. Recortado pelo alcance de quem
     lê, para o histórico disciplinar da empresa não viajar no payload de toda
     página — ver `lib/data/source.ts`. */
  /* ⚠️⚠️ O ALCANCE SAI DOS VÍNCULOS, NÃO DO SETOR EM QUE A PESSOA SENTA.
     `meusSetoresIds` soma o `meDept` porque a BARRA precisa dele (o gestor troca
     entre os setores que ele vê), e isso vinha sendo passado também como régua
     de DADO — enquanto `lib/alcance.ts`, que é a régua das rotas, diz o
     contrário, por escrito e com a medição ao lado: "a Ana Carolina,
     `Colaborador` do Fiscal, alcançaria as 31 pessoas do setor — atividade,
     atrasos e advertências de todo mundo — só por sentar lá".

     Duas réguas para a mesma pergunta, e a mais frouxa era justamente a que
     embarcava no `TalentDataProvider` de toda página. Um colaborador é
     redirecionado para `/minha-avaliacao`, mas o layout roda igual: o payload
     dele levava os atrasos e as DATAS das advertências do setor inteiro.

     Navegação e alcance de dado são coisas diferentes e agora estão separadas. */
  const alcance: Alcance = role === 'ADMIN'
    ? { tipo: 'tudo' }
    : { tipo: 'recorte', departmentIds: [...new Set(vinculosDele.map((v) => v.departmentId))], meuId: uid ?? '' }
  const data = await getTalentData(alcance)
  const isOwner = isOwnerEmail(session.user.email)

  /*
   * ⚠️⚠️ O MENU LATERAL É DA DIRETORIA (decisão do dono, 03/09/2026). Gestor e
   * sub-encarregado não navegam pelo painel da empresa — eles caem no setor
   * deles e trabalham ali.
   *
   * ⚠️ Mas "sem menu" não pode virar "sem saída": eles PRECISAM alcançar a fila
   * de avaliações e a própria página de desempenho, e quem avalia mais de um
   * setor (a Rosemeire avalia Limpeza e Cozinha) precisa trocar entre eles.
   * Por isso não é ausência de navegação, é uma barra enxuta com o que é deles —
   * ver `AppShell`. Tirar tudo os deixaria presos numa página só.
   */
  const soMeuSetor = role !== 'ADMIN'
  /* ⚠️ Calculado SEMPRE, inclusive para a Diretoria: é o que permite recolher o
     menu e ver a tela como o gestor a vê. Um preview que mostra uma navegação
     diferente da real não serve para conferir nada. */
  const meusSetores = meusSetoresIds.length
    ? (await prisma.department.findMany({ where: { id: { in: meusSetoresIds } }, select: { id: true, name: true } }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  return (
    <AppShell
      name={session.user.name ?? 'Diretoria'}
      roleLabel={roleLabel}
      isOwner={isOwner}
      soMeuSetor={soMeuSetor}
      meusSetores={meusSetores}
      me={{ id: me?.id ?? uid ?? '', cargo: me?.jobTitle ?? null, hasAvatar: !!me?.avatarUrl }}
      data={data}
    >
      <PrepareGate />
      {children}
    </AppShell>
  )
}
