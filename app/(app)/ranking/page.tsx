import { redirect } from 'next/navigation'

/* ============================================================
   O RANKING DA CASA SAIU (11/09/2026, pedido do dono): "não faz mais sentido, uma
   vez que temos todos os departamentos com pontos independentes".

   ⚠️ Era uma lista única de todas as pessoas por score — e o score é percentil
   DENTRO do setor, e a pontuação de cada setor segue a régua daquele setor (o
   Legal tem planilha de serviços, o Fiscal não). A própria página avisava, em
   amarelo, que a comparação entre setores não valia. O ranking que vale é o de
   cada setor, no relatório do setor ("Ranking do mês").

   O endereço fica, redirecionando: quem guardou o link cai no painel, e não num
   404. A trava de acesso (`SO_DIRETORIA` no `proxy.ts`) continua valendo antes
   daqui. O código antigo está no histórico do git (commit anterior a este).
   ============================================================ */
export default function RankingSaiu() {
  redirect('/dashboard')
}
