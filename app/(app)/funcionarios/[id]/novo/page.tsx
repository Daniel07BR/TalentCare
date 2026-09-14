'use client'
import { use } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { useEmployeePeriod } from '@/lib/ui/employee-period'
import { useEmployeeTimeline } from '@/lib/ui/employee-timeline'
import { usePeriod } from '@/lib/ui/period'
import { useVoltar } from '@/lib/ui/origem'
import { buildEmployeeVM } from '@/lib/mock/employee'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import s from '../../../_visao/visao.module.css'
import { Placar } from '../Placar'
import ServicosCard from '../ServicosCard'
import f from '../_visao/ficha.module.css'
import { Cabecalho } from '../_visao/Cabecalho'
import { Indicadores } from '../_visao/Indicadores'
import { Sistemas } from '../_visao/Sistemas'
import { Assiduidade } from '../_visao/Assiduidade'
import { LinhaDoTempo } from '../_visao/LinhaDoTempo'
import { AntesDeAvaliar, Formacao, RadioCartao, UltimaAtividade } from '../_visao/Lateral'

/* ============================================================
   A FICHA DA PESSOA NO PADRÃO NOVO — PRÉVIA (14/09/2026).

   Pedido do dono: "assim como refatoramos as páginas dos departamentos e o
   dashboard, crie uma com o novo padrão para a página dos usuários — uma
   página para eu aprovar antes de trocarmos a de todos".

   Mesma receita das duas trocas anteriores: a prévia vive ao lado da atual
   (`/funcionarios/<id>`), com os MESMOS dados (`/api/employee-metrics` e a
   linha do tempo, com a mesma régua de acesso) e a paleta da `.raiz`.
   Aprovada, ela vira `/funcionarios/<id>` e a de hoje vai para `./anterior`.
   ============================================================ */

export default function FichaNova({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const data = useTalentData()
  const { label: periodo } = usePeriod()
  const { m } = useEmployeePeriod(id)
  const { events, estado } = useEmployeeTimeline(id)
  const vm = buildEmployeeVM(data, id)
  const voltar = useVoltar({ href: '/funcionarios', label: 'Voltar ao diretório' })

  if (!vm) {
    return (
      <div className={s.raiz}>
        <div className={s.cartao} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Funcionário não encontrado.</div>
      </div>
    )
  }

  return (
    <div className={`tc-anim ${s.raiz}`}>
      {/* A faixa de prévia sai junto quando a ficha for trocada. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--n-blue-soft)', color: 'var(--n-text)', borderRadius: 12, padding: '9px 14px', marginBottom: 14, fontSize: 12.5 }}>
        <Sparkles size={16} color="var(--n-blue)" />
        <span style={{ flex: 1, minWidth: 200 }}><b>Prévia do novo padrão da ficha.</b> Mesmos dados da ficha atual — compare antes de aprovar a troca.</span>
        <Link href={`/funcionarios/${id}`} style={{ fontWeight: 700, color: 'var(--n-blue)' }}>Abrir a ficha atual ›</Link>
      </div>

      <Cabecalho vm={vm} voltar={voltar} />
      <Indicadores m={m} periodo={periodo} />
      {/* ⚠️ O placar só aparece quando a rota respondeu: zerado diria "zero pontos". */}
      {m?.posicao && (
        <Placar p={m.posicao} meses={m.posicao.mesesDoPlacar} setor={vm.dept} competenciaLabel={competenciaLabel(m.posicao.competencia)}
          motivoSemNota={m.posicao.de === 0 ? `ninguém do ${vm.dept} pontuou em ${competenciaLabel(m.posicao.competencia)}` : null} />
      )}

      <div className={f.corpo}>
        <div className={s.pilha}>
          <ServicosCard servicos={m?.servicos} pontuacao={m?.pontuacao} periodo={periodo} />
          <Sistemas m={m} periodo={periodo} />
          <Assiduidade m={m} periodo={periodo} pontoAteVm={vm.pontoAte ?? null} />
          <LinhaDoTempo events={events} estado={estado} periodo={periodo} />
        </div>
        <aside className={f.lateral}>
          <AntesDeAvaliar vm={vm} m={m} periodo={periodo} estado={estado} />
          <Formacao vm={vm} />
          <RadioCartao m={m} periodo={periodo} />
          <UltimaAtividade m={m} />
        </aside>
      </div>
    </div>
  )
}
