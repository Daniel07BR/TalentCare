/* ============================================================
   INDICADORES INTERNOS — o nome e a TOTALIZAÇÃO por assunto (14/10/2026).

   Pedido do Daniel, olhando a ficha da Tauana: *"melhore e deixe mais claro no resumo da
   funcionária a totalização do indicador interno que mostra fechamento de folha, férias etc.;
   troque o nome de Serviços do setor para Indicadores internos"*.

   ⚠️⚠️ O NOME muda só na TELA. A tabela (`servico_depto`), as rotas (`/servicos`) e as chaves
   da régua continuam "serviço": renomear dado gravado é o que apaga decisão em silêncio.

   ⚠️ O AGRUPAMENTO só vale para o que vem do FLUXO: lá os nomes dos tipos são fixos (`TAREFAS` em
   `plane/fluxo/talent_servicos.py` para o DP; `nome_da_tarefa` em `plane/fluxo/talent_legal.py` para o
   LEGAL, que vem do Fluxo desde novembro/2026). A planilha antiga do Legal (Gestta) tem dezenas de tipos
   livres, e um palpite por prefixo juntaria serviços que não são o mesmo — ela segue com a lista "O que
   mais fez".
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
const CERT = 'Renovação de certificado — '
const BLOCO = 'Bloco — '

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
  // HOMOLOGAÇÕES (15/10/2026): o Fluxo manda como tipo próprio — de quem ACOMPANHOU a homologação,
  // que pode não ser quem concluiu a rescisão (régua do painel do DP, `homologacoes_feitas`)
  { chave: 'homologacao', curto: 'Homologações', nome: 'Homologações', casa: (t) => t === 'Homologação' },
  { chave: 'admissao', curto: 'Admissões', nome: 'Admissões', casa: (t) => t === 'Admissão' },
  { chave: 'conferencia', curto: 'Conferências', nome: 'Conferências', casa: (t) => t.startsWith(CONF), parte: (t) => t.slice(CONF.length) },
  // o LEGAL (29/10/2026) — os nomes de `talent_legal.nome_da_tarefa`: "<Serviço> — <tipo>" e "Bloco — <nome>"
  ...([
    ['abertura', 'Aberturas', 'Abertura'],
    ['alteracao', 'Alterações', 'Alteração'],
    ['cancelamento', 'Cancelamentos', 'Cancelamento'],
    ['saida', 'Saídas', 'Saída'],
    ['transferencia', 'Transferências', 'Transferência'],
    ['aposentadoria', 'Aposentadorias', 'Aposentadoria'],
  ] as const).map(([chave, nome, base]): Regra => ({
    chave, nome, curto: nome,
    casa: (t) => t === base || t.startsWith(`${base} — `),
    parte: (t) => (t === base ? base.toLowerCase() : t.slice(base.length + 3)),
  })),
  {
    chave: 'certificado', curto: 'Certificados', nome: 'Renovação de certificado',
    casa: (t) => t.startsWith(CERT), parte: (t) => t.slice(CERT.length),
  },
  { chave: 'sindicato', curto: 'Sindicato', nome: 'Contribuição sindical', casa: (t) => t === 'Contribuição sindical' },
  { chave: 'taxas', curto: 'Taxas', nome: 'Taxas da prefeitura', casa: (t) => t === 'Taxas da prefeitura' },
  { chave: 'bloco', curto: 'Blocos', nome: 'Blocos de apoio', casa: (t) => t.startsWith(BLOCO), parte: (t) => t.slice(BLOCO.length) },
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
   - o resto (pró-labore, vale, FGTS, DCTF, e-Social, sem movimento, conferências, homologações) é obrigação da
     EMPRESA, não de um funcionário: conta como trabalho, não como funcionário administrado.
     (A homologação é do MESMO funcionário que a rescisão já contou: contá-lo de novo dobraria.)
   ⚠️ Folha sem nº de funcionários (empresa sem cadastro) soma 0 e a tela DIZ quantas são — zero
   por falta de cadastro não pode se passar por empresa vazia. */
export const REGRA_ADMINISTRADOS =
  'Folha: os funcionários de cada empresa fechada · férias, rescisão e admissão: 1 cada'

/** O setor CONTA FUNCIONÁRIO ADMINISTRADO? Só quando há folha, férias, rescisão ou admissão (o DP) — no
 *  Legal o número seria sempre zero, e um "0 funcionários administrados" se leria como "não fez nada". */
export function contaAdministrados(tarefas: string[]) {
  return tarefas.some((t) => ehFolha(t) || administradosDe(t, 0) > 0)
}

export function ehFolha(tarefa: string) {
  return tarefa.startsWith(FOLHA) || tarefa === 'Folha de doméstica'
}

export function administradosDe(tarefa: string, funcionarios: number | null | undefined): number {
  if (ehFolha(tarefa)) return funcionarios ?? 0
  if (tarefa === 'Férias' || tarefa === 'Rescisão' || tarefa === 'Admissão') return 1
  return 0
}
