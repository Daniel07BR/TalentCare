'use client'
import { CheckCircle2, AlarmClock, Clock, AlertTriangle, Ban, ShieldCheck } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import s from '../../../_visao/visao.module.css'
import { Tile } from '../../../_visao/ui'
import { comPonto, concluidas, num } from './derivar'

/* Os seis azulejos do topo, no desenho do setor. Cada número aparece UMA vez na
   ficha: a assiduidade lá embaixo mostra o que NÃO está aqui (abonados, a
   natureza das suspensões, a gravidade, o calendário e a lista). */
export function Indicadores({ m, periodo }: { m: EmployeeMetrics | null; periodo: string }) {
  const a = m?.assiduidade
  const ponto = comPonto(m)
  /* ⚠️ Sem ponto: "—" e o motivo, nunca zero — zero aqui é a melhor notícia. */
  const semPontoNota = !m ? 'carregando…' : (a?.motivoSemPonto ?? 'sem registro de ponto')
  const { total } = concluidas(m)
  /* ⚠️ A suspensão vem da planilha do DP e do Controle da LGPD, não do ponto. */
  const suspAtraso = a?.suspensoesAtraso ?? null
  const suspLgpd = a?.suspensoes ?? null
  const susp = suspAtraso == null && suspLgpd == null ? null : (suspAtraso ?? 0) + (suspLgpd ?? 0)

  return (
    <div className={s.indicadores}>
      <Tile Icone={CheckCircle2} tom="green" valor={total == null ? '—' : num(total)} rotulo="Atividades concluídas" nota={`nos sistemas · ${periodo}`} />
      <Tile Icone={ShieldCheck} tom="blue" valor={ponto && a ? `${a.assid}%` : '—'} rotulo="Índice de assiduidade"
        nota={ponto ? '100 − atrasos×2 − advert.×5 · não é presença' : semPontoNota} />
      <Tile Icone={AlarmClock} tom="amber" valor={ponto && a ? num(a.atrasos) : '—'} rotulo="Atrasos"
        nota={ponto ? (a && a.atrasosAbon > 0 ? `+ ${a.atrasosAbon} abonados` : undefined) : semPontoNota} />
      <Tile Icone={Clock} tom="blue" valor={ponto && a ? num(a.minutos) : '—'} rotulo="Minutos de atraso" nota={ponto ? undefined : semPontoNota} />
      <Tile Icone={AlertTriangle} tom="orange" valor={ponto && a ? num(a.advertencias) : '—'} rotulo="Advertências" nota={ponto ? 'do 2º atraso do mês' : semPontoNota} />
      <Tile Icone={Ban} tom="purple" valor={susp == null ? '—' : num(susp)} rotulo="Suspensões"
        nota={!m ? 'carregando…' : susp == null ? 'não foi possível ler' : susp === 0 ? 'nenhuma no período'
          : [suspAtraso ? `${suspAtraso} por atraso` : '', suspLgpd ? `${suspLgpd} LGPD` : ''].filter(Boolean).join(' · ')} />
    </div>
  )
}
