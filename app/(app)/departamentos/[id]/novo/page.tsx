'use client'
import { use } from 'react'
import Link from 'next/link'
import { useDeptPeriod } from '@/lib/ui/dept-period'
import { useDetalhe, JanelaDetalhe } from '../Detalhe'
import s from './novo.module.css'
import { Cabecalho } from './Cabecalho'
import { Lideranca } from './Lideranca'
import { Indicadores } from './Indicadores'
import { Escolaridade } from './Escolaridade'
import { AtividadeMensal } from './AtividadeMensal'
import { UltimasSaidas } from './UltimasSaidas'
import { RankingMes } from './RankingMes'
import { AvaliacaoChamados } from './AvaliacaoChamados'
import { Assiduidade } from './Assiduidade'
import { Sistemas } from './Sistemas'

/* ============================================================
   PRÉVIA — o relatório do setor no desenho da imagem conceito (11/09/2026).

   Pedido do dono: uma página NOVA, em paralelo à atual, para comparar na
   prática — seguindo o conceito até nas cores. Por isso ela mora em
   `/departamentos/<id>/novo` e a atual segue intacta em `/departamentos/<id>`,
   com um atalho de uma para a outra.

   ⚠️ Os DADOS são os mesmos da atual: a mesma `/api/dept-metrics` (e a mesma
   régua de acesso — gestor só abre o setor dele) e a mesma janela "Ver
   detalhes" (`../Detalhe.tsx`). Só o desenho muda — compara-se layout, não
   números.
   ============================================================ */

export default function PreviaRelatorioSetor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { m, estado } = useDeptPeriod(id)
  const detalhe = useDetalhe()

  if (!m) {
    const texto = estado === 'negado' ? 'Você não tem acesso ao relatório deste setor.'
      : estado === 'erro' ? 'Não foi possível carregar o relatório. Tente recarregar a página.'
      : 'Carregando o relatório do setor…'
    return (
      <div className={s.raiz}>
        <Link href="/departamentos" style={{ fontSize: 13, color: 'var(--n-text-2)' }}>‹ Voltar aos departamentos</Link>
        <div className={s.cartao} style={{ marginTop: 16, fontSize: 13, color: estado === 'erro' ? 'var(--n-red)' : 'var(--n-text-2)' }}>{texto}</div>
      </div>
    )
  }

  return (
    <div className={`tc-anim ${s.raiz}`}>
      <Cabecalho m={m} />
      <div className={s.linha1}>
        <Lideranca m={m} />
        <Indicadores m={m} />
      </div>
      <div className={s.linha2}>
        <Escolaridade deptId={m.setor.id} />
        <AtividadeMensal m={m} />
        <UltimasSaidas m={m} abrir={detalhe.abrir} />
      </div>
      <div className={s.linha3}>
        <RankingMes m={m} />
        <AvaliacaoChamados m={m} />
        <Assiduidade m={m} abrir={detalhe.abrir} />
      </div>
      <Sistemas m={m} abrir={detalhe.abrir} />

      {detalhe.aberto && (
        <JanelaDetalhe chave={detalhe.aberto} setor={{ id: m.setor.id, nome: m.setor.nome }} onFechar={detalhe.fechar} />
      )}
    </div>
  )
}
