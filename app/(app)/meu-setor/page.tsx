import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

/**
 * O POUSO de quem não é Diretoria.
 *
 * ⚠️⚠️ Existe como rota e não como regra no middleware porque o middleware roda
 * sem banco: ele conhece o papel que veio no token e não sabe de que setor a
 * pessoa é, nem quais ela avalia. Pôr o `departmentId` no JWT resolveria — e
 * ficaria velho no dia em que alguém mudasse de área, sem nada acusar até o
 * próximo login.
 *
 * Prioridade: o setor que a pessoa AVALIA (é onde ela tem trabalho a fazer);
 * na falta, o setor dela; na falta dos dois, a própria página de desempenho —
 * que é a única coisa que todo funcionário tem.
 */
export default async function MeuSetor() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const uid = (session.user as { id?: string }).id
  if (!uid) redirect('/minha-avaliacao')

  const [vinculos, eu] = await Promise.all([
    prisma.setorAvaliador.findMany({ where: { userId: uid }, select: { departmentId: true } }),
    prisma.user.findUnique({ where: { id: uid }, select: { departmentId: true } }),
  ])

  const destino = vinculos[0]?.departmentId ?? eu?.departmentId
  // ⚠️ Sem setor nenhum não é erro: é o colaborador comum, e a página dele é a
  // dele. Mandar para o /dashboard mostraria a empresa inteira a quem não deve.
  redirect(destino ? `/departamentos/${destino}` : '/minha-avaliacao')
}
