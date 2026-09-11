import { redirect } from 'next/navigation'

/* Era o endereço da PRÉVIA do painel novo (11/09/2026). Virou o painel principal:
   quem guardou o link cai no lugar certo, e não num 404. */
export default function PainelNovoRedireciona() {
  redirect('/dashboard')
}
