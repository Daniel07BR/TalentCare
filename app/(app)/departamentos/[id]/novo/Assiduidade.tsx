'use client'
import { CalendarCheck } from 'lucide-react'
import CalendarioOcorrencias from '../../../CalendarioOcorrencias'
import { Cartao, Mini, LinkAcao } from './ui'
import { num } from './derivar'
import type { ComDetalhe } from './tipos'

/* Os cinco degraus do mapa na paleta nova (tokens em `novo.module.css`). */
const HEAT = [0, 1, 2, 3, 4].map((i) => `var(--n-heat-${i})`)

export function Assiduidade({ m, abrir }: ComDetalhe) {
  const a = m.assiduidade
  const semPonto = a.janelaComPonto === false
  return (
    <Cartao titulo="Assiduidade e disciplina" Icone={CalendarCheck} sub={`Ponto eletrônico · ${m.label}`}
      acao={<LinkAcao onClick={() => abrir('assiduidade')}>Ver detalhes</LinkAcao>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, marginBottom: 14 }}>
        <Mini valor={semPonto ? '—' : num(a.atrasos)} rotulo="Atrasos" tom="orange" />
        <Mini valor={semPonto ? '—' : num(a.minutos)} rotulo="Minutos de atraso" />
        <Mini valor={semPonto ? '—' : num(a.abonados)} rotulo="Atrasos abonados" tom="green" />
        <Mini valor={num(a.advertencias)} rotulo="Advertências" tom="red" />
        {/* ⚠️ Falta não vem no dump do Nexo: "—", nunca zero. */}
        <Mini valor={a.faltas == null ? '—' : num(a.faltas)} rotulo={a.faltas == null ? 'Faltas · sem fonte' : 'Faltas'} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Atrasos do setor · {m.label}</div>
      <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginBottom: 10 }}>Cada quadro é um dia; a cor diz quantas pessoas do setor se atrasaram nele.</div>
      <CalendarioOcorrencias dias={a.dias ?? []} de={m.fromDay} ate={m.toDay} pontoAte={a.pontoAte ?? null} escala="pessoas" paleta={HEAT} />
    </Cartao>
  )
}
