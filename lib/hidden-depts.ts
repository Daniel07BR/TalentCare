// Setores que NÃO são apresentados no TalentCare (nem avaliados, nem listados):
// - Diretoria: usa o painel (loga como ADMIN), não é população avaliada.
// - Sistemas: contas de rede/admin; o Nexus já as omite do diretório.
// O login da Diretoria NÃO passa por aqui (NextAuth/SSO), então continua intacto.
const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const HIDDEN_DEPARTMENTS = ['diretoria', 'sistemas']

export const isHiddenDept = (name: string | null | undefined) =>
  HIDDEN_DEPARTMENTS.some((d) => norm(name).includes(d))
