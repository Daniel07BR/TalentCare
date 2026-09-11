import type { Tom } from '@/app/(app)/_visao/tipos'

/* ============================================================
   AS TELAS DO SISTEMA — a janela de cartões (11/09/2026) e os nomes do "voltar".

   Pedido do dono: "tirar o menu lateral; onde está o sinal para fazê-lo
   aparecer, um botão que abre uma janela no centro da tela com os cards de cada
   opção que temos hoje no menu". Esta lista ERA o menu (`NAV_MAIN`,
   `NAV_SYSTEMS`, `NAV_ADMIN` do `AppShell`) e continua sendo a fonte dos nomes
   das telas para o "voltar" das telas de detalhe (`OrigemProvider`) — uma lista
   só, senão o cartão e o botão de voltar chamam a mesma tela por dois nomes.

   ⚠️ Pura e só com texto (sem ícone): o LAYOUT, no servidor, decide quais
   cartões a sessão recebe (`cartoesDoMenu`) e os passa como dado. O ícone de
   cada um mora na janela (`app/(app)/JanelaMenu.tsx`), pela `chave`.

   ⚠️ Sem número dentro do cartão: número ao lado do filtro de período tem de
   obedecer a ele (regra (b) da casa), e o cartão é caminho, não indicador.
   ============================================================ */

export type ChaveTela =
  | 'dashboard' | 'funcionarios' | 'departamentos'
  | 'avaliacoes' | 'minha-avaliacao'
  | 'turnover' | 'assiduidade' | 'classroom' | 'radio' | 'whatsapp'
  | 'consultoria' | 'helpdesk' | 'cide' | 'gerencia' | 'chat'
  | 'configuracoes'

export type Tela = { chave: ChaveTela; href: string; label: string; desc: string; tom: Tom | 'neutro' }
export type GrupoTelas = { titulo: string; telas: Tela[] }

export const GRUPOS_TELAS: GrupoTelas[] = [
  {
    titulo: 'Visão geral',
    telas: [
      { chave: 'dashboard', href: '/dashboard', label: 'Dashboard', desc: 'O painel da casa inteira, no período escolhido', tom: 'blue' },
      { chave: 'funcionarios', href: '/funcionarios', label: 'Funcionários', desc: 'O diretório e a ficha de cada pessoa', tom: 'green' },
      { chave: 'departamentos', href: '/departamentos', label: 'Departamentos', desc: 'Os setores e o relatório de cada um', tom: 'purple' },
    ],
  },
  /* ⚠️ Avaliações e Meu desempenho eram chips da barra de cima (a que aparecia com
     o menu recolhido). Sem menu, o dono escolheu a barra da Diretoria só com a
     busca, e os dois viraram cartões (11/09/2026). O gestor segue com os chips. */
  {
    titulo: 'Avaliação',
    telas: [
      { chave: 'avaliacoes', href: '/avaliacoes', label: 'Avaliações', desc: 'A avaliação mensal, setor por setor', tom: 'amber' },
      { chave: 'minha-avaliacao', href: '/minha-avaliacao', label: 'Meu desempenho', desc: 'A sua avaliação mensal', tom: 'pink' },
    ],
  },
  {
    titulo: 'Sistemas',
    telas: [
      { chave: 'turnover', href: '/turnover', label: 'Turnover', desc: 'Entradas, saídas e quadro de pessoal', tom: 'orange' },
      { chave: 'assiduidade', href: '/assiduidade', label: 'Assiduidade', desc: 'Atrasos e advertências do ponto', tom: 'amber' },
      { chave: 'classroom', href: '/classroom', label: 'ClassRoom', desc: 'Cursos e vídeos criados e concluídos', tom: 'purple' },
      { chave: 'radio', href: '/radio', label: 'Rádio', desc: 'Ouvintes, sessões e horas ouvidas', tom: 'pink' },
      { chave: 'whatsapp', href: '/whatsapp', label: 'WhatsApp', desc: 'Atendimentos do Painel de Atendimento', tom: 'green' },
      { chave: 'consultoria', href: '/consultoria', label: 'Consultoria Plus', desc: 'Chamados e estudos da consultoria', tom: 'blue' },
      { chave: 'helpdesk', href: '/helpdesk', label: 'HelpDesk', desc: 'Chamados abertos e resolvidos', tom: 'orange' },
      { chave: 'cide', href: '/cide', label: 'CIDE', desc: 'Atividades registradas no CIDE', tom: 'purple' },
      { chave: 'gerencia', href: '/gerencia', label: 'Gerência', desc: 'Mensageria: saídas, viagens e serviços', tom: 'amber' },
      { chave: 'chat', href: '/chat', label: 'Chat Interno', desc: 'Conversas e chamados entre setores', tom: 'blue' },
    ],
  },
  {
    titulo: 'Administração',
    /* ⚠️ Para TODA a Diretoria (a régua geral de pontuação mora aqui e a Diretoria
       a altera); as abas só do dono a própria página esconde. */
    telas: [
      { chave: 'configuracoes', href: '/configuracoes', label: 'Configurações', desc: 'A régua de pontuação e as fontes de dados', tom: 'neutro' },
    ],
  },
]

/** Todas as telas, sem grupo — os nomes do "voltar" (`OrigemProvider`). */
export const TODAS_AS_TELAS: Tela[] = GRUPOS_TELAS.flatMap((g) => g.telas)

/**
 * ⚠️⚠️ OS CARTÕES SÃO DA DIRETORIA (decisão do dono, 03/09 e 11/09/2026).
 * Gestor e sub-encarregado nunca tiveram o menu: a barra deles tem os setores que
 * avaliam, Avaliações e Meu desempenho. O `proxy.ts` barraria as rotas, mas um
 * cartão que leva a "acesso negado" ensina a não confiar na tela — então eles não
 * recebem cartão nenhum, nem o botão que abriria a janela.
 */
export function cartoesDoMenu(diretoria: boolean): GrupoTelas[] {
  return diretoria ? GRUPOS_TELAS : []
}

/** A tela em que se está — o cartão dela vem marcado. */
export function telaAtiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}
