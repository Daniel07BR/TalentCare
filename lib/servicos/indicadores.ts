/* ============================================================
   INDICADORES INTERNOS — o nome e a TOTALIZAÇÃO por assunto (14/10/2026).

   Pedido do Daniel, olhando a ficha da Tauana: *"melhore e deixe mais claro no resumo da
   funcionária a totalização do indicador interno que mostra fechamento de folha, férias etc.;
   troque o nome de Serviços do setor para Indicadores internos"*.

   ⚠️⚠️ O NOME muda só na TELA. A tabela (`servico_depto`), as rotas (`/servicos`) e as chaves
   da régua continuam "serviço": renomear dado gravado é o que apaga decisão em silêncio.

   ⚠️ O AGRUPAMENTO só vale para o que vem do FLUXO (o DP): lá os nomes dos tipos são fixos
   (`TAREFAS` em `plane/fluxo/talent_servicos.py`). A planilha do Legal tem dezenas de tipos
   livres, e um palpite por prefixo juntaria serviços que não são o mesmo — ela segue com a
   lista "O que mais fez".
   ⚠️ Tipo do Fluxo que NÃO casar com família nenhuma vai para "Outros" e aparece — nunca some.
   ============================================================ */

export const NOME_INDICADORES = 'Indicadores internos'

type Regra = {
  chave: string
  nome: string
  /** O nome de COLUNA (a tabela do setor, 14/10/2026): curto, para dez colunas caberem. */
  curto: string
  /** O tipo pertence a esta família? */
  casa: (tarefa: string) => boolean
  /** O nome curto da parte, quando a família tem mais de um tipo. */
  parte?: (tarefa: string) => string
}

const FOLHA = 'Folha de pagamento — '
const CONF = 'Conferência — '

/** A ordem é a do trabalho do DP no mês — fixa, para a ficha de todo mundo ler igual. */
const FAMILIAS: Regra[] = [
  {
    chave: 'folha', curto: 'Folha', nome: 'Fechamento de folha',
    casa: (t) => t.startsWith(FOLHA) || t === 'Folha de doméstica',
    parte: (t) => (t === 'Folha de doméstica' ? 'domésticas' : t.slice(FOLHA.length).replace('funcionários', 'func.')),
  },
  { chave: 'prolabore', curto: 'Pró-labore', nome: 'Pró-labore', casa: (t) => t === 'Pró-labore' },
  {
    chave: 'vale', curto: 'Vale', nome: 'Vale / adiantamento',
    casa: (t) => t === 'Adiantamento / Vale' || t === 'Vale de doméstica',
    parte: (t) => (t === 'Vale de doméstica' ? 'domésticas' : 'empresas'),
  },
  { chave: 'fgts', curto: 'FGTS', nome: 'FGTS Digital', casa: (t) => t === 'FGTS Digital' },
  { chave: 'dctf', curto: 'DCTF', nome: 'DCTF Web', casa: (t) => t === 'DCTF Web' },
  { chave: 'sem_movimento', curto: 'Sem mov.', nome: 'Empresas sem movimento', casa: (t) => t === 'Empresa sem movimento' },
  { chave: 'esocial', curto: 'e-Social', nome: 'e-Social do mês', casa: (t) => t === 'e-Social do mês' },
  { chave: 'ferias', curto: 'Férias', nome: 'Férias', casa: (t) => t === 'Férias' },
  { chave: 'rescisao', curto: 'Rescisões', nome: 'Rescisões', casa: (t) => t === 'Rescisão' },
  { chave: 'admissao', curto: 'Admissões', nome: 'Admissões', casa: (t) => t === 'Admissão' },
  { chave: 'conferencia', curto: 'Conferências', nome: 'Conferências', casa: (t) => t.startsWith(CONF), parte: (t) => t.slice(CONF.length) },
]

export type Familia = { chave: string; nome: string; curto: string; total: number; partes: { nome: string; n: number }[] }

export function agruparIndicadores(porTarefa: { tarefa: string; n: number }[]): Familia[] {
  const saida: Familia[] = []
  const usados = new Set<string>()
  for (const f of FAMILIAS) {
    const dela = porTarefa.filter((t) => f.casa(t.tarefa))
    dela.forEach((t) => usados.add(t.tarefa))
    const total = dela.reduce((a, t) => a + t.n, 0)
    if (!total) continue
    const partes = f.parte
      ? dela.map((t) => ({ nome: f.parte!(t.tarefa), n: t.n })).sort((a, b) => b.n - a.n)
      : []
    // ⚠️ o detalhe aparece mesmo com UMA parte: "Vale 2" sem dizer que eram de doméstica esconde o que foi
    saida.push({ chave: f.chave, nome: f.nome, curto: f.curto, total, partes })
  }
  const resto = porTarefa.filter((t) => !usados.has(t.tarefa))
  if (resto.length) {
    saida.push({
      chave: 'outros', nome: 'Outros', curto: 'Outros', total: resto.reduce((a, t) => a + t.n, 0),
      partes: resto.map((t) => ({ nome: t.tarefa, n: t.n })).sort((a, b) => b.n - a.n),
    })
  }
  return saida
}

/* ── FUNCIONÁRIOS ADMINISTRADOS (14/10/2026) ─────────────────────────────────────────────
   Pedido do Daniel: no "Quem fez" do DP, trocar a contagem de trabalhos por FUNCIONÁRIOS
   ADMINISTRADOS — *"soma quantidade de férias, rescisões, admissões etc, isso vale 1 funcionário
   administrado, e folha você multiplica o total de funcionários das empresas fechadas naquele mês"*.

   ⚠️ A REGRA MORA AQUI, e só aqui (janela do setor, janela da pessoa, janela do tipo):
   - folha (empresas e domésticas) = os funcionários da empresa fechada — o número do cadastro no
     mês da competência, que o Fluxo manda (o mesmo do painel do DP);
   - férias, rescisão e admissão = 1 cada (é um funcionário);
   - o resto (pró-labore, vale, FGTS, DCTF, e-Social, sem movimento, conferências) é obrigação da
     EMPRESA, não de um funcionário: conta como trabalho, não como funcionário administrado.
   ⚠️ Folha sem nº de funcionários (empresa sem cadastro) soma 0 e a tela DIZ quantas são — zero
   por falta de cadastro não pode se passar por empresa vazia. */
export const REGRA_ADMINISTRADOS =
  'Folha: os funcionários de cada empresa fechada · férias, rescisão e admissão: 1 cada'

export function ehFolha(tarefa: string) {
  return tarefa.startsWith(FOLHA) || tarefa === 'Folha de doméstica'
}

export function administradosDe(tarefa: string, funcionarios: number | null | undefined): number {
  if (ehFolha(tarefa)) return funcionarios ?? 0
  if (tarefa === 'Férias' || tarefa === 'Rescisão' || tarefa === 'Admissão') return 1
  return 0
}
