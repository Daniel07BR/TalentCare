import { redirect } from 'next/navigation'

/* A prévia de 11/09/2026 virou o relatório do setor no mesmo dia. Quem guardou
   o endereço da prévia cai no relatório, e não num 404. */
export default async function PreviaVirouPadrao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/departamentos/${id}`)
}
