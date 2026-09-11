'use client'
import { createContext, useContext } from 'react'

/* O "dono" do sistema (a allowlist `TALENTCARE_ADMIN_EMAILS`, ver `isOwnerEmail`
   em `lib/nexus.ts`) — quem constrói o TalentCare, distinto da Diretoria.

   ⚠️ Serve para MOSTRAR atalho, não para proteger nada: o atalho da prévia do
   painel novo aparece só para o dono, mas a página em si é protegida pelo
   `proxy.ts` (Diretoria), como o painel de hoje. */
const Ctx = createContext(false)

export function DonoProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEhDono(): boolean {
  return useContext(Ctx)
}
