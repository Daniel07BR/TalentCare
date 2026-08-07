/* ============================================================
   TalentCare — GERÊNCIA (dados REAIS, frente B). Puro em função de data.
   Aceita override por período (Map nexusUserId → GerenciaStat); sem ele, usa o
   acumulado (e.gerencia).

   ⚠️ A tela separa DUAS famílias de propósito e NÃO soma uma na outra:
     EXECUÇÃO  — quem faz saída externa (serviços concluídos, km, viagens, jornada).
                 Hoje Elton e Gilberto são os mensageiros, mas gente de vários
                 cargos faz saída eventual — por isso todo mundo aparece, cada um
                 com o SEU cargo, em vez de filtrar a lista.
     ESCRITÓRIO — quem demanda (protocolos abertos/aprovados/reagendados/
                 cancelados, serviços criados). Vale p/ qualquer funcionário.
   ============================================================ */
import type { TalentData, GerenciaStat } from './data'
import { zeroGerencia } from './data'
import { deptName } from './employee'

export type GerenciaUsage = Map<string, GerenciaStat>

export type GerenciaPerson = {
  id: string; nome: string; cargo: string; dept: string
  initials: string; color: string; hasAvatar: boolean
  stat: GerenciaStat
  execucao: number   // serviços concluídos (o que define "saiu na rua")
  escritorio: number // protocolos abertos + aprovados + serviços criados
}
export type GerenciaDeptBar = { id: string; nome: string; color: string; valor: number; pct: string }

const soma = (a: GerenciaStat, b: GerenciaStat): GerenciaStat => ({
  servicos: a.servicos + b.servicos, km: a.km + b.km, viagens: a.viagens + b.viagens,
  jornadaMin: a.jornadaMin + b.jornadaMin, protAbertos: a.protAbertos + b.protAbertos,
  protAprovados: a.protAprovados + b.protAprovados, servCriados: a.servCriados + b.servCriados,
  reagendados: a.reagendados + b.reagendados, cancelados: a.cancelados + b.cancelados,
  datasAlteradas: a.datasAlteradas + b.datasAlteradas,
})

export function gerenciaVM(data: TalentData, period?: GerenciaUsage) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const statOf = (e: TalentData['employees'][number]): GerenciaStat => {
    if (period) return (e.nexusUserId ? period.get(e.nexusUserId) : undefined) ?? zeroGerencia()
    return e.gerencia
  }

  const pessoas: GerenciaPerson[] = data.employees.map((e) => {
    const stat = statOf(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, stat,
      execucao: stat.servicos,
      escritorio: stat.protAbertos + stat.protAprovados + stat.servCriados + stat.datasAlteradas,
    }
  })

  const totais = pessoas.reduce((a, p) => soma(a, p.stat), zeroGerencia())

  // Quem saiu na rua: ordenado por serviço concluído. O cargo vai junto porque
  // a maioria NÃO é mensageiro de carteira — é saída externa eventual.
  const execucao = pessoas
    .filter((p) => p.execucao > 0 || p.stat.km > 0 || p.stat.viagens > 0)
    .sort((a, b) => b.execucao - a.execucao || b.stat.km - a.stat.km)

  // Quem demandou do escritório.
  const escritorio = pessoas
    .filter((p) => p.escritorio > 0 || p.stat.reagendados > 0 || p.stat.cancelados > 0)
    .sort((a, b) => b.escritorio - a.escritorio)

  const bars = (pick: (s: GerenciaStat) => number): GerenciaDeptBar[] => {
    const m = new Map<string, { id: string; nome: string; color: string; valor: number }>()
    for (const e of data.employees) {
      const v = pick(statOf(e))
      if (v <= 0) continue
      const g = m.get(e.dept) ?? {
        id: e.dept, nome: deptName(data, e.dept),
        color: colorOf.get(e.dept) ?? 'var(--chart-2)', valor: 0,
      }
      g.valor += v
      m.set(e.dept, g)
    }
    const list = [...m.values()].sort((a, b) => b.valor - a.valor)
    const max = Math.max(1, ...list.map((d) => d.valor))
    return list.map((d) => ({ ...d, pct: Math.round((d.valor / max) * 100) + '%' }))
  }

  return {
    totais,
    pessoas,
    execucao,
    escritorio,
    execBars: bars((s) => s.servicos),
    escrBars: bars((s) => s.protAbertos + s.protAprovados + s.servCriados + s.datasAlteradas),
    kmBars: bars((s) => s.km),
    horasJornada: Math.round(totais.jornadaMin / 60),
    // "Ativos" em cada face, p/ os KPIs não sugerirem que a empresa toda sai na rua.
    execPessoas: execucao.length,
    escrPessoas: escritorio.length,
  }
}
