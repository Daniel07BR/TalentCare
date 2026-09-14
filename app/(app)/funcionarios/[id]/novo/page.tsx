import { redirect } from 'next/navigation'

/* A PRÉVIA virou a ficha (14/09/2026, "pode trocar a ficha de todos pela nova").
   O endereço `/novo` circulou durante a aprovação — redireciona, para nenhum link
   guardado cair num 404. A ficha de antes está em `../anterior`. */
export default async function FichaNovaRedireciona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/funcionarios/${id}`)
}
