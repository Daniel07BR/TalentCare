/* ============================================================
   TalentCare — Departamentos (lista + detalhe). Puro em função de data.
   ============================================================ */
import { geomSpark, geomLine, scoreColor, type TalentData } from './data'
import { noQuadroEm, rotatividadeDoPeriodo } from '@/lib/quadro'
import { heatmapFor } from './employee'

/**
 * ⚠️⚠️ `fromDay`/`toDay` (decisão do dono, 11/09/2026): as pessoas de cada setor são as
 * do ÚLTIMO DIA do período, e a rotatividade é a DO PERÍODO (saídas ÷ quadro médio,
 * sem anualizar) — a mesma régua do relatório do setor e do painel (`lib/quadro.ts`).
 * Era o quadro de hoje e a taxa de 12 meses.
 */
export function deptListVM(data: TalentData, fromDay: string, toDay: string) {
  const passagem = (e: { hireISO: string | null; leftISO: string | null }) => ({ entrada: e.hireISO, saida: e.leftISO })
  const doSetor = (id: string) => data.employees.filter((e) => e.dept === id).map(passagem)
  /* ⚠️ A sparkline do card SAIU junto com o turnover sorteado: ela era
     `rnd(dseed × 17 + m)`, um passeio aleatório de 12 pontos com o score real só
     no último. Não existe série mensal de score (ele é percentil por janela), e
     um gráfico inventado embaixo de um número certo empresta credibilidade ao
     que não a tem. */
  /* ⚠️⚠️ SEM SCORE (pedido do dono, 11/09/2026) — pela mesma régua que o tirou
     do topo do relatório do setor em 03/09: ele não foi validado e não vale, e
     um número grande no card é lido como o veredito do setor. No lugar entra o
     ROSTO de quem responde por ele. Pela mesma razão a ordem deixou de ser o
     score e virou alfabética: ordenar por um número que não se mostra é
     classificar os setores às escondidas. */
  const cards = [...data.departments].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((d) => ({
    id: d.id, nome: d.nome,
    headcount: doSetor(d.id).filter((p) => noQuadroEm(p, toDay)).length,
    rotatividade: rotatividadeDoPeriodo(doSetor(d.id), fromDay, toDay),
    gestores: d.chefia.filter((c) => c.nivel === 'gestor'),
    subs: d.chefia.filter((c) => c.nivel !== 'gestor'),
    pelaDiretoria: d.pelaDiretoria,
  }))
  // O total é o do mesmo dia dos cards.
  const totalHc = cards.reduce((a, d) => a + d.headcount, 0)
  const semChefia = cards.filter((c) => c.gestores.length + c.subs.length === 0 && !c.pelaDiretoria).length
  return { cards, totalHc, semChefia, n: data.departments.length }
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
