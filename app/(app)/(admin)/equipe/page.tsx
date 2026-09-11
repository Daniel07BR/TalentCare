import { redirect } from 'next/navigation'

/* A área administrativa virou UMA página (11/09/2026, pedido do dono): esta tela
   mora na aba "equipe" de Configurações. O endereço antigo leva até lá. */
export default function Redireciona() {
  redirect('/configuracoes?aba=equipe')
}
