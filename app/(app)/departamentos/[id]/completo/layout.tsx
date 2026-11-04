import { redirect } from 'next/navigation'
import { NOTA_LIGADA } from '@/lib/nota-ligada'

/* Esta tela de antes mostra nota e score: com a nota desligada, leva à tela atual. Ver `lib/nota-ligada.ts`. */
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  if (!NOTA_LIGADA) redirect(`/departamentos/${(await params).id}`)
  return children
}
