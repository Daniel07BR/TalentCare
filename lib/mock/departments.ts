/* ============================================================
   TalentCare — Departamentos (lista + detalhe). Puro em função de data.
   ============================================================ */
import { geomSpark, geomLine, scoreColor, type TalentData } from './data'
import { heatmapFor } from './employee'

export function deptListVM(data: TalentData) {
  /* ⚠️ A sparkline do card SAIU junto com o turnover sorteado: ela era
     `rnd(dseed × 17 + m)`, um passeio aleatório de 12 pontos com o score real só
     no último. Não existe série mensal de score (ele é percentil por janela), e
     um gráfico inventado embaixo de um número certo empresta credibilidade ao
     que não a tem. */
  const cards = [...data.departments].sort((a, b) => b.score - a.score).map((d) => ({
    id: d.id, nome: d.nome, score: d.score, scoreColor: scoreColor(d.score), headcount: d.headcount,
    turnover: d.turnover, saidas12m: d.saidas12m, lider: d.lider, color: d.color,
  }))
  // Totais consideram só ativos (headcount do dept já é ativo).
  const totalHc = data.departments.reduce((a, d) => a + d.headcount, 0)
  const avgScore = totalHc ? Math.round(data.departments.reduce((a, d) => a + d.score * d.headcount, 0) / totalHc) : 0
  return { cards, totalHc, avgScore, n: data.departments.length }
}

export function deptDetailVM(data: TalentData, deptId: string) {
  const dep = data.departments.find((d) => d.id === deptId)
  if (!dep) return null
  // Ranking de pessoas do setor: só ativos (desligados não entram).
  const emps = data.employees.filter((e) => e.dept === dep.id && e.status !== 'Desligado' && e.hasScore).sort((a, b) => b.score - a.score)
  /* ⚠️⚠️ Quantas pessoas SUSTENTAM o score do setor. Sem isso, um setor onde
     ninguém tem base (produtividade não se aplica, sem formação informada, sem
     registro de ponto) cai em `score = 0` e a tela imprime "0 /100" em 42px —
     um zero fabricado no lugar mais nobre da página. Medido em 03/09/2026: a
     Pousada é exatamente esse caso. `null ≠ zero` vale aqui também. */
  const totalDoSetor = data.employees.filter((e) => e.dept === dep.id && e.status !== 'Desligado').length
  const ativos = data.employees.filter((e) => e.status !== 'Desligado' && e.hasScore)
  const compAvg = ativos.length ? Math.round(ativos.reduce((a, e) => a + e.score, 0) / ativos.length) : dep.score
  // Heatmap de OCORRÊNCIAS do setor = soma dos atrasos dos membros por dia (real).
  const deptDays = new Map<string, { day: string; atrasos: number; minutos: number }>()
  for (const e of data.employees.filter((e) => e.dept === dep.id)) {
    for (const d of e.assidDays) {
      const cur = deptDays.get(d.day) ?? { day: d.day, atrasos: 0, minutos: 0 }
      cur.atrasos += d.atrasos; cur.minutos += d.minutos
      deptDays.set(d.day, cur)
    }
  }
  const ranking = emps.map((e, i) => ({
    rank: i + 1, id: e.id, nome: e.nome, cargo: e.cargo, initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
    score: e.score, scoreColor: scoreColor(e.score), scorePct: e.score + '%',
  }))
  const kpis = [
    { label: 'Score do setor', value: dep.score, unit: '/100', color: scoreColor(dep.score) },
    { label: 'Headcount', value: dep.headcount, unit: '', color: 'var(--text)' },
    { label: 'Turnover', value: dep.turnover, unit: '%', color: 'var(--danger)' },
    { label: 'vs. média empresa', value: (dep.score - compAvg >= 0 ? '+' : '') + (dep.score - compAvg), unit: 'pts', color: dep.score - compAvg >= 0 ? 'var(--success)' : 'var(--danger)' },
  ]
  return {
    comScore: emps.length,
    totalDoSetor,
    name: dep.nome, kpis, ranking, compAvg, score: dep.score,
    barSelf: dep.score + '%', barComp: compAvg + '%', heat: heatmapFor([...deptDays.values()]),
    classroom: {
      criados: dep.classroom.coursesCreated,
      assistidos: dep.classroom.coursesCompleted,
      videos: dep.classroom.videosCompleted,
    },
  }
}
