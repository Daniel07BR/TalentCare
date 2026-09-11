'use client'
import { Users, TrendingUp, AlertTriangle, AlarmClock, Clock, Ban, UserRound, Home, UsersRound } from 'lucide-react'
import s from '../../../_visao/visao.module.css'
import { Tile } from '../../../_visao/ui'
import { num, suspensoes } from './derivar'
import { contagens, type ChavePainel } from './Paineis'
import type { ComDetalhe, Tom } from './tipos'

/* Os indicadores do topo, no desenho do conceito: seis colunas, com a
   Rotatividade ocupando duas linhas. Mesmos números da head do relatório atual. */
export function Indicadores({ m, abrir, abrirPainel }: ComDetalhe & { abrirPainel: (c: ChavePainel) => void }) {
  const a = m.assiduidade
  const d = m.demografia
  const t = m.turnover
  /* ⚠️ Janela que o import do ponto não alcança: atraso e minuto viram "—", e
     não zero. Zero aqui se leria "ninguém atrasou" — a ausência elogiando. */
  const semPonto = a.janelaComPonto === false
  const motivo = a.motivoSemPonto ?? 'sem dado de ponto nesta janela'
  const susp = suspensoes(m)
  const anos = d.tempoCasaMeses != null ? Math.floor(d.tempoCasaMeses / 12) : null
  const meses = d.tempoCasaMeses != null ? d.tempoCasaMeses % 12 : null
  /* Só vira botão o indicador que tem QUEM mostrar — um clique que abre uma
     lista vazia ensina a não clicar mais. */
  const n = contagens(m)
  const clique = (c: ChavePainel, ok = true) => (ok && n[c] > 0 ? () => abrirPainel(c) : undefined)
  /* ⚠️ Sem o vermelho de "≥ 20%": aquele corte era da taxa de 12 MESES. A do período
     (decisão do dono, 11/09/2026) muda de escala com a janela — 20% em 7 dias e 20% no
     ano são coisas diferentes, e um limite fixo pintaria o mesmo setor de duas cores. */
  const r = t.periodo
  const tomRot: Tom = r.saidas > 0 ? 'orange' : 'green'
  const qm = r.quadroMedio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  /* O dia do retrato — pessoas, idade, casa e gênero são de quem estava no setor ao
     FIM do período (decisão do dono, 11/09/2026). A tela diz qual dia. */
  const retrato = m.equipe.retrato

  return (
    <div className={s.indicadores}>
      <Tile Icone={Users} tom="blue" valor={num(m.equipe.noFim)} rotulo="Pessoas no setor" nota={retrato} />
      <Tile className={s.rot} alto onClick={() => abrir('turnover')} dica="ver quem saiu e a movimentação dos últimos 12 meses" Icone={TrendingUp} tom={tomRot} valor={`${r.taxa.toLocaleString('pt-BR')}%`} rotulo="Rotatividade no período"
        nota={<>
          <b style={{ color: 'var(--n-text-2)' }}>{r.saidas} {r.saidas === 1 ? 'saída' : 'saídas'} no período</b><br />
          ÷ quadro médio de {qm} ({r.quadroInicio} no início, {r.quadroFim} no fim) · não anualizado
        </>} />
      <Tile Icone={AlertTriangle} tom="orange" valor={num(a.advertencias)} rotulo="Advertências" onClick={clique('advertencias', !semPonto)} dica="ver quem recebeu e quantas" />
      <Tile Icone={AlarmClock} tom="amber" valor={semPonto ? '—' : num(a.atrasos)} rotulo="Atrasos" nota={semPonto ? motivo : undefined} onClick={clique('atrasos', !semPonto)} dica="ver quem se atrasou e quantas vezes" />
      <Tile Icone={Clock} tom="blue" valor={semPonto ? '—' : num(a.minutos)} rotulo="Minutos de atraso" onClick={clique('minutos', !semPonto)} dica="ver os minutos de cada pessoa" />
      <Tile Icone={Ban} tom="purple" valor={susp === null ? '—' : num(susp)} rotulo="Suspensões" onClick={clique('suspensoes')} dica="ver quem e de que tipo" />
      <Tile Icone={UserRound} tom="purple" valor={d.idadeMedia !== null ? `${d.idadeMedia} anos` : '—'} rotulo="Idade média"
        nota={d.idadesInformadas < m.equipe.noFim ? `${retrato} · ${d.idadesInformadas} de ${m.equipe.noFim} informadas` : retrato} />
      <Tile className={s.largo} Icone={Home} tom="green" valor={anos !== null ? (anos > 0 ? `${anos}a ${meses}m` : `${meses}m`) : '—'} rotulo="Tempo de casa" nota={retrato} />
      <Tile className={s.largo} Icone={UsersRound} tom="pink" valor={`${d.generos.F ?? 0} / ${d.generos.M ?? 0}`} rotulo="Mulheres / homens"
        nota={d.generos['?'] ? `${retrato} · ${d.generos['?']} não informado` : retrato} />
    </div>
  )
}
