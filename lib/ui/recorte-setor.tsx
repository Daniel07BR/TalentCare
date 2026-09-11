'use client'
import { createContext, useContext, useMemo } from 'react'
import { TalentDataProvider, useTalentData } from '@/lib/ui/data'

/* ============================================================
   O RECORTE DE UM SETOR — a página de um sistema, vista de dentro de um setor.

   ⚠️⚠️ Pedido do dono (11/09/2026): gestor e sub só alcançam o relatório do
   setor deles, e as páginas de resumo de cada sistema (ClassRoom, WhatsApp,
   HelpDesk…) têm muito mais detalhe do que o cartão do relatório. O detalhe
   abre na própria página do relatório, só com a gente daquele setor.

   ⚠️⚠️ Por que a PRÓPRIA página do sistema, e não uma cópia dela: a página já
   sabe montar os números a partir de `useTalentData()`. Envolvê-la num provedor
   que só enxerga o setor faz cada total, cada ranking e cada tabela saírem da
   MESMA conta que a Diretoria vê — uma segunda tela para "o detalhe do setor"
   seria uma segunda régua, e as duas divergiriam no primeiro ajuste.

   ⚠️ O que o recorte NÃO faz: proteger dado. Quem protege é a rota
   (`lib/alcance.ts`) — um gestor já recebe só a gente dos setores que avalia.
   Aqui é só "qual setor esta janela está olhando".
   ============================================================ */

export type SetorRecorte = { id: string; nome: string }

const Ctx = createContext<SetorRecorte | null>(null)

/** O setor que a tela está olhando — `null` na página normal do sistema. */
export function useRecorteSetor(): SetorRecorte | null {
  return useContext(Ctx)
}

/* ============================================================
   "ESTOU NUMA JANELA" — separado de "estou num setor" (11/09/2026).

   ⚠️⚠️ O painel principal abre o resumo de um sistema numa janela SEM setor (a
   casa inteira). Até aqui o resumo usava `useRecorteSetor() !== null` para duas
   perguntas diferentes: "escondo o meu cabeçalho?" (a janela já tem título) e
   "escondo a comparação entre setores?" (com um setor só, é uma barra de 100%).
   Na casa inteira as respostas se separam: o cabeçalho sai, e a comparação entre
   setores FICA — ela é justamente o conteúdo. Por isso dois sinais.
   ============================================================ */
const JanelaCtx = createContext(false)

/** `true` quando o resumo está dentro de uma janela (com ou sem setor). */
export function useEmJanela(): boolean {
  return useContext(JanelaCtx)
}

export function EmJanela({ children }: { children: React.ReactNode }) {
  return <JanelaCtx.Provider value={true}>{children}</JanelaCtx.Provider>
}

export function RecorteDoSetor({ setor, incluiDesligados = false, children }: {
  setor: SetorRecorte
  /**
   * ⚠️ Falso por padrão, e é a régua dos cartões do relatório: `/api/dept-metrics`
   * soma a atividade dos ATIVOS do setor. Com desligados, o detalhe somaria mais
   * que o cartão de onde a pessoa clicou — o mesmo número em duas alturas da tela.
   * O Turnover liga: quem saiu é justamente o assunto dele.
   */
  incluiDesligados?: boolean
  children: React.ReactNode
}) {
  const data = useTalentData()
  const recortado = useMemo(() => ({
    ...data,
    employees: data.employees.filter((e) => e.dept === setor.id && (incluiDesligados || e.status !== 'Desligado')),
    departments: data.departments.filter((d) => d.id === setor.id),
    // `deptMeta` fica INTEIRO: é só id → nome, e quem responde pelo setor pode
    // sentar em outro (Entregas ← Legal).
  }), [data, setor.id, incluiDesligados])
  return (
    <Ctx.Provider value={setor}>
      <JanelaCtx.Provider value={true}>
        <TalentDataProvider value={recortado}>{children}</TalentDataProvider>
      </JanelaCtx.Provider>
    </Ctx.Provider>
  )
}
