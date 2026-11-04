import { redirect } from 'next/navigation'
import { NOTA_LIGADA } from '@/lib/nota-ligada'

/* Esta tela de antes mostra nota e score: com a nota desligada, leva à tela atual. Ver `lib/nota-ligada.ts`. */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!NOTA_LIGADA) redirect('/dashboard')
  return children
}
