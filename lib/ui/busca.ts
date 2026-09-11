import type { TalentData } from '@/lib/mock/data'

/* ============================================================
   A BUSCA DO TOPO — a conta, pura (11/09/2026). Usada por `app/(app)/BuscaGlobal.tsx`
   e provada por `scripts/ensaio-busca.ts` com os dados reais.

   ⚠️ Sem acento e sem maiúscula ("joao" acha "João"); cada palavra digitada tem de
   aparecer no nome, em qualquer ordem ("silva ana" acha "Ana Silva"). Quem COMEÇA
   com a primeira palavra vem antes de quem só a contém; nas pessoas, ativos antes
   de quem já saiu (a ficha de quem saiu existe, e aparece — depois).
   ============================================================ */

export const normBusca = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export const MAX_PESSOAS = 8
export const MAX_SETORES = 5

export type ResultadoBusca =
  | { tipo: 'setor'; id: string; nome: string; detalhe: string; href: string }
  | { tipo: 'pessoa'; id: string; nome: string; detalhe: string; href: string; hasAvatar: boolean; initials: string; color: string; saiu: boolean }

export function buscar(data: TalentData, q: string): ResultadoBusca[] {
  const palavras = normBusca(q).split(/\s+/).filter(Boolean)
  if (!palavras.length) return []
  const casa = (texto: string) => { const t = normBusca(texto); return palavras.every((p) => t.includes(p)) }
  const peso = (texto: string) => (normBusca(texto).startsWith(palavras[0]) ? 0 : 1)
  const nomeSetor = new Map(data.departments.map((d) => [d.id, d.nome]))

  const setores: ResultadoBusca[] = data.departments
    .filter((d) => casa(d.nome))
    .sort((a, b) => peso(a.nome) - peso(b.nome) || a.nome.localeCompare(b.nome))
    .slice(0, MAX_SETORES)
    .map((d) => ({ tipo: 'setor', id: d.id, nome: d.nome, detalhe: `${d.headcount} ${d.headcount === 1 ? 'pessoa' : 'pessoas'}`, href: `/departamentos/${d.id}` }))

  const pessoas: ResultadoBusca[] = data.employees
    .filter((e) => casa(e.nome))
    .sort((a, b) => Number(a.status === 'Desligado') - Number(b.status === 'Desligado') || peso(a.nome) - peso(b.nome) || a.nome.localeCompare(b.nome))
    .slice(0, MAX_PESSOAS)
    .map((e) => ({
      tipo: 'pessoa', id: e.id, nome: e.nome, href: `/funcionarios/${e.id}`,
      detalhe: `${e.cargo} · ${nomeSetor.get(e.dept) ?? data.deptMeta[e.dept] ?? '—'}`,
      hasAvatar: e.hasAvatar, initials: e.initials, color: e.color, saiu: e.status === 'Desligado',
    }))
  return [...setores, ...pessoas]
}
