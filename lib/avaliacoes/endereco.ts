/* ============================================================
   ENDEREÇOS LEGÍVEIS da área de avaliações (02/10/2026).

   ⚠️⚠️ Regra da casa (CLAUDE.md do Nexus, "a URL diz o NOME da página"): página
   nova não leva UUID/cuid inteiro na URL. Setor e pessoa NÃO têm chave de
   negócio legível aqui (o id do Nexus é UUID), então vale a regra 4: o slug do
   nome + um SUFIXO curto e único — `/avaliacoes/setor/ti-x8k2p`.

   ⚠️ A página se acha pelo SUFIXO, nunca pelo nome: se o nome mudar, o link
   antigo continua abrindo e a página troca o endereço para o novo.
   ⚠️ O sufixo é o FIM do cuid (a parte aleatória). O começo é o relógio — dois
   registros criados no mesmo minuto teriam o mesmo começo.
   ============================================================ */

export const slugDe = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'

const SUFIXO = 6
export const enderecoDe = (r: { id: string; nome: string }) => `${slugDe(r.nome)}-${r.id.slice(-SUFIXO)}`

/** O sufixo de um endereço (`ti-x8k2p9` → `x8k2p9`). Um cuid inteiro também vale. */
export function sufixoDe(endereco: string): string {
  const e = decodeURIComponent(endereco).trim()
  if (/^c[a-z0-9]{20,}$/.test(e)) return e.slice(-SUFIXO)
  return e.slice(e.lastIndexOf('-') + 1)
}

export const urlSetor = (s: { id: string; nome: string }) => `/avaliacoes/setor/${enderecoDe(s)}`
export const urlPessoa = (s: { id: string; nome: string }, p: { id: string; nome: string }) =>
  `${urlSetor(s)}/${enderecoDe(p)}`
