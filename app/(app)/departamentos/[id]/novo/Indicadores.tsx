'use client'
import { Users, TrendingUp, AlertTriangle, AlarmClock, Clock, Ban, UserRound, Home, UsersRound } from 'lucide-react'
import s from './novo.module.css'
import { Tile } from './ui'
import { num, suspensoes } from './derivar'
import type { SecaoProps, Tom } from './tipos'

/* Os indicadores do topo, no desenho do conceito: seis colunas, com a
   Rotatividade ocupando duas linhas. Mesmos números da head do relatório atual. */
export function Indicadores({ m }: SecaoProps) {
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
  const tomRot: Tom = t.taxa12m >= 20 ? 'red' : t.taxa12m > 0 ? 'orange' : 'green'

  return (
    <div className={s.indicadores}>
      <Tile Icone={Users} tom="blue" valor={num(m.equipe.ativos)} rotulo="Pessoas ativas" />
      <Tile className={s.rot} alto Icone={TrendingUp} tom={tomRot} valor={`${t.taxa12m}%`} rotulo="Rotatividade"
        nota={<>
          <b style={{ color: 'var(--n-text-2)' }}>{t.saidas12m} {t.saidas12m === 1 ? 'saída' : 'saídas'} em 12 meses</b><br />
          {t.saidasNoPeriodo} no período · a taxa é de 12 meses e não acompanha o filtro
        </>} />
      <Tile Icone={AlertTriangle} tom="orange" valor={num(a.advertencias)} rotulo="Advertências" />
      <Tile Icone={AlarmClock} tom="amber" valor={semPonto ? '—' : num(a.atrasos)} rotulo="Atrasos" nota={semPonto ? motivo : undefined} />
      <Tile Icone={Clock} tom="blue" valor={semPonto ? '—' : num(a.minutos)} rotulo="Minutos de atraso" />
      <Tile Icone={Ban} tom="purple" valor={susp === null ? '—' : num(susp)} rotulo="Suspensões" />
      <Tile Icone={UserRound} tom="purple" valor={d.idadeMedia !== null ? `${d.idadeMedia} anos` : '—'} rotulo="Idade média"
        nota={d.idadesInformadas < m.equipe.ativos ? `${d.idadesInformadas} de ${m.equipe.ativos} informadas` : undefined} />
      <Tile className={s.largo} Icone={Home} tom="green" valor={anos !== null ? (anos > 0 ? `${anos}a ${meses}m` : `${meses}m`) : '—'} rotulo="Tempo de casa" />
      <Tile className={s.largo} Icone={UsersRound} tom="pink" valor={`${d.generos.F ?? 0} / ${d.generos.M ?? 0}`} rotulo="Mulheres / homens"
        nota={d.generos['?'] ? `${d.generos['?']} não informado` : undefined} />
    </div>
  )
}
