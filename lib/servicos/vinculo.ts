import 'server-only'
import { normalizarNome } from './planilha'

/* ============================================================
   NOME DO ARQUIVO → PESSOA DA CASA.

   ⚠️⚠️ ESTE ARQUIVO SUGERE. ELE NÃO DECIDE.

   O casamento por nome erra, e erra de um jeito que não estoura. Medido no
   primeiro arquivo do Legal (03/09/2026), com a heurística ingênua de "dois
   tokens em comum":

     "Wendel Ribeiro da Silva"  →  Edileuza da Silva, da LIMPEZA   (por "da" + "silva")
     "Joice Rocha da Silva"     →  Edileuza da Silva  E  Joice Rocha
     "Gabriel"  (aba de pontos) →  Gabriel Costa, Marcos Gabriel E Gabriel Santana

   Creditar 285 serviços do Wendel a uma faxineira da Limpeza não daria erro em
   lugar nenhum: daria um número plausível na ficha de uma pessoa de verdade,
   num painel que decide aumento. É o mesmo motivo pelo qual a tela `/ponto`
   existe — lá, 15 de 101 linhas precisaram de gente para resolver.

   Por isso: **só o casamento FORTE e ÚNICO entra sozinho.** Todo o resto vira
   pendência numa tela, e a linha fica com `personKey = null` até alguém olhar —
   creditada a ninguém, contada para o setor.
   ============================================================ */

/** Ligações e sobrenomes tão comuns que sozinhos não identificam ninguém. */
const VAZIOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'del', 'di', 'du', 'van', 'von', 'y'])

/** Tokens que valem para identificar: fora as ligações e as iniciais soltas. */
export function tokensDe(nome: string): string[] {
  return normalizarNome(nome).split(' ').filter((t) => t.length > 1 && !VAZIOS.has(t))
}

export type Pessoa = {
  personKey: string
  nome: string
  email: string | null
  /** Conta de rede (`domain_account`). É o que casa quando o arquivo traz
   *  e-mail de um domínio diferente do nosso. */
  usuario: string | null
  setor: string | null
  ativo: boolean
}

export type Sugestao = {
  nomeOrigem: string
  nomeNorm: string
  /** `forte` entra sozinho; `revisar` e `nenhuma` esperam uma pessoa. */
  confianca: 'forte' | 'revisar' | 'nenhuma'
  /** Quem o sistema acha que é — a primeira é a melhor. Vazia = ninguém. */
  candidatos: Pessoa[]
  /** Em português, por que este é o veredito. Vai para a tela. */
  porque: string
  linhas: number
}

/**
 * Casa um nome do arquivo com a gente da casa.
 *
 * A ordem importa, e cada degrau é mais fraco que o anterior:
 *
 * 1. **E-mail.** Idêntico, ou a parte local igual quando o domínio é outro —
 *    o arquivo do Legal traz `augusto.cesar@itamarathyclassroom.com.br` e aqui
 *    ele é `augusto.cesar@grupoitamarathy.local`. E-mail é identidade; nome não.
 * 2. **Nome completo idêntico** (sem acento, sem caixa) e único.
 * 3. **Primeiro nome + pelo menos um sobrenome**, com um só candidato. O
 *    primeiro nome ANCORA e o sobrenome CONFIRMA.
 * 4. **Um token só** (a aba de pontos manda "Gabriel", "Marcos") — sempre
 *    pendência, nunca automático.
 * 5. Qualquer coisa abaixo disso é pendência, inclusive quando há vários
 *    candidatos bons: ambiguidade não se resolve no chute.
 */
export function sugerir(nomeOrigem: string, pessoas: Pessoa[], linhas = 0): Sugestao {
  const nomeNorm = normalizarNome(nomeOrigem)
  const base = { nomeOrigem, nomeNorm, linhas }

  // 1. e-mail idêntico
  const porEmail = pessoas.filter((p) => p.email && normalizarNome(p.email) === nomeNorm)
  if (porEmail.length === 1) {
    return { ...base, confianca: 'forte', candidatos: porEmail, porque: 'o arquivo trouxe o e-mail da pessoa' }
  }

  /* 1b. E-mail de OUTRO DOMÍNIO — casa pela parte local.
     ⚠️ O domínio é do sistema que exportou o arquivo, não da pessoa: o Legal
     mandou `augusto.cesar@itamarathyclassroom.com.br` e aqui ele é
     `augusto.cesar@grupoitamarathy.local`. A identidade é o `augusto.cesar`,
     que é exatamente a conta de rede dele. Comparar o endereço inteiro perderia
     a pessoa por causa do sufixo. */
  if (nomeNorm.includes('@')) {
    const local = nomeNorm.split('@')[0]
    const porUsuario = pessoas.filter((p) =>
      (p.usuario && normalizarNome(p.usuario) === local) ||
      (p.email && normalizarNome(p.email).split('@')[0] === local))
    if (porUsuario.length === 1) {
      return { ...base, confianca: 'forte', candidatos: porUsuario, porque: `a conta "${local}" é a mesma, só o domínio do e-mail é outro` }
    }
    if (porUsuario.length > 1) {
      return { ...base, confianca: 'revisar', candidatos: porUsuario, porque: `mais de uma pessoa com a conta "${local}"` }
    }
    return { ...base, confianca: 'nenhuma', candidatos: [], porque: 'e-mail que não corresponde a ninguém da casa' }
  }

  // 2. nome completo idêntico
  const iguais = pessoas.filter((p) => normalizarNome(p.nome) === nomeNorm)
  if (iguais.length === 1) {
    return { ...base, confianca: 'forte', candidatos: iguais, porque: 'nome completo idêntico' }
  }
  if (iguais.length > 1) {
    return { ...base, confianca: 'revisar', candidatos: iguais, porque: `${iguais.length} pessoas têm exatamente este nome` }
  }

  const tf = tokensDe(nomeOrigem)
  if (!tf.length) return { ...base, confianca: 'nenhuma', candidatos: [], porque: 'nome sem conteúdo para comparar' }

  /* Um token só: é a aba de pontos, que traz apenas o primeiro nome.
     ⚠️⚠️ NUNCA automático, nem quando há um único candidato. "Gabriel" casa com
     três pessoas da casa e "Marcos" com duas; e mesmo quando casa com uma só,
     um primeiro nome não prova identidade — só que ninguém MAIS se chama assim
     hoje. Amanhã entra outro Gabriel e o vínculo de ontem passa a estar errado
     sem nada acusar. */
  if (tf.length === 1) {
    const doPrimeiro = pessoas.filter((p) => tokensDe(p.nome)[0] === tf[0])
    if (doPrimeiro.length === 1) {
      return { ...base, confianca: 'revisar', candidatos: doPrimeiro, porque: 'o arquivo trouxe só o primeiro nome — confirme que é esta pessoa' }
    }
    if (doPrimeiro.length > 1) {
      return { ...base, confianca: 'revisar', candidatos: doPrimeiro.slice(0, 5), porque: `${doPrimeiro.length} pessoas se chamam "${tf[0]}" — escolha qual` }
    }
    return { ...base, confianca: 'nenhuma', candidatos: [], porque: `ninguém na casa se chama "${tf[0]}"` }
  }

  /* 3. PRIMEIRO NOME + pelo menos um outro token, e um só candidato.
        O primeiro nome ANCORA e o segundo token CONFIRMA. A âncora é o que
        impede o desastre (ninguém se chama "Wendel" na casa, então ele não vai
        para a Edileuza por causa do "Silva"), e a confirmação é o que resolve os
        nomes que o RH escreve por extenso e o arquivo abrevia:
          "Ezequiel Shalom Santos Castro"     → Ezequiel Castro
          "Joice Rocha da Silva"              → Joice Rocha
          "Marcos Gabriel Campelo Gonçalves"  → Marcos Gabriel
        Repare que "João Souza" continua de fora: existe uma "Joao Victor" na
        casa, mas "souza" não aparece no nome dela — e o João Souza do arquivo
        realmente não é gente daqui. */
  const primeiro = tf[0]
  const fortes = pessoas.filter((p) => {
    const tp = tokensDe(p.nome)
    if (!tp.length || tp[0] !== primeiro) return false
    return tf.slice(1).some((t) => tp.includes(t))
  })
  if (fortes.length === 1) {
    return { ...base, confianca: 'forte', candidatos: fortes, porque: `primeiro nome e sobrenome batem com ${fortes[0].nome}, e só há uma pessoa assim` }
  }
  if (!fortes.length) {
    /* Primeiro nome bate mas nenhum sobrenome confirma → pendência, com quem
       tem o primeiro nome à frente das outras opções. */
    const soPrimeiro = pessoas.filter((p) => tokensDe(p.nome)[0] === primeiro)
    if (soPrimeiro.length) {
      return { ...base, confianca: 'revisar', candidatos: soPrimeiro.slice(0, 5), porque: `só o primeiro nome "${primeiro}" bate — nenhum sobrenome confirma` }
    }
  }
  if (fortes.length > 1) {
    return { ...base, confianca: 'revisar', candidatos: fortes, porque: `${fortes.length} pessoas começam com "${primeiro}" — escolha qual` }
  }

  // 4. qualquer coincidência de token, só para oferecer opções na tela
  const parciais = pessoas
    .map((p) => ({ p, n: tokensDe(p.nome).filter((t) => tf.includes(t)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => x.p)
  if (parciais.length) {
    return { ...base, confianca: 'revisar', candidatos: parciais, porque: 'parecido, mas o primeiro nome não bate — confira' }
  }
  return { ...base, confianca: 'nenhuma', candidatos: [], porque: 'ninguém na casa com este nome' }
}

/** Roda `sugerir` para a lista inteira de nomes distintos de um arquivo. */
export function sugerirTodos(
  nomes: { nomeOrigem: string; linhas: number }[],
  pessoas: Pessoa[],
): Sugestao[] {
  return nomes
    .map((n) => sugerir(n.nomeOrigem, pessoas, n.linhas))
    .sort((a, b) => b.linhas - a.linhas)
}
