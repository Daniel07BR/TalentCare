import { redirect } from 'next/navigation'

/* "Relatórios" SAIU (11/09/2026, pedido do dono): nunca passou do "Em breve", e
   o que ele prometia — números por setor, por sistema, por pessoa — hoje mora no
   painel e no relatório de cada setor. O endereço leva ao painel, não a um 404. */
export default function RelatoriosSaiu() {
  redirect('/dashboard')
}
