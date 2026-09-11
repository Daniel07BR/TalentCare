'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useDeptPeriod } from '@/lib/ui/dept-period'
import { useDetalhe, JanelaDetalhe } from './Detalhe'
import s from './_visao/novo.module.css'
import { Cabecalho } from './_visao/Cabecalho'
import { Lideranca } from './_visao/Lideranca'
import { Indicadores } from './_visao/Indicadores'
import { Escolaridade } from './_visao/Escolaridade'
import { AtividadeDoPeriodo } from './_visao/AtividadeDoPeriodo'
import { UltimasSaidas } from './_visao/UltimasSaidas'
import { RankingMes } from './_visao/RankingMes'
import { AvaliacaoChamados } from './_visao/AvaliacaoChamados'
import { Assiduidade } from './_visao/Assiduidade'
import { Sistemas } from './_visao/Sistemas'
import { PainelDoIndicador, type ChavePainel } from './_visao/Paineis'
import { PainelDaPessoaProvider } from '../../PainelDaPessoa'

/* ============================================================
   O RELATÓRIO DO SETOR — a visão geral, no desenho da imagem conceito.

   Nasceu como PRÉVIA em `/departamentos/<id>/novo` (11/09/2026), lado a lado
   com o relatório de então, e o dono aprovou no mesmo dia: "ficou ótimo, pode
   trocar a atual por essa — mas antes, deixe ela ainda mais interativa". O de
   antes virou o relatório COMPLETO (`./completo`), para onde "Ver relatório
   completo" leva; `/novo` redireciona para cá.

   ⚠️ Os DADOS são os de sempre: `/api/dept-metrics` (e a mesma régua de acesso
   — gestor só abre o setor dele) e a mesma janela "Ver detalhes"
   (`./Detalhe.tsx`). As seções moram em `./_visao/` (o `_` tira a pasta das
   rotas do Next).

   ⚠️ INTERATIVO (pedido do dono): cada indicador com gente atrás abre a lista de
   quem e quanto (`PainelDoIndicador`), e o dia do mapa de atrasos abre quem
   chegou tarde e quantos minutos.
   ============================================================ */

export default function RelatorioDoSetor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { m, estado } = useDeptPeriod(id)
  const detalhe = useDetalhe()
  /* A lista aberta por um indicador. ⚠️ Trocar o filtro fecha: a lista de
     outra janela ficaria aberta debaixo de números que já mudaram. */
  const [painel, setPainel] = useState<ChavePainel | null>(null)
  useEffect(() => { setPainel(null) }, [m?.fromDay, m?.toDay])

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
      {/* ⚠️ Um segundo provedor AQUI DENTRO da `.raiz`: o painel da pessoa, aberto
          da janela "Ver detalhes", nasce dentro da paleta nova em vez de sair com
          as cores antigas por cima da janela azul. */}
      <PainelDaPessoaProvider>
      <Cabecalho m={m} />
      <div className={s.linha1}>
        <Lideranca m={m} />
        <Indicadores m={m} abrir={detalhe.abrir} abrirPainel={setPainel} />
      </div>
      <div className={s.linha2}>
        <Escolaridade deptId={m.setor.id} />
        <AtividadeDoPeriodo m={m} />
        <UltimasSaidas m={m} abrir={detalhe.abrir} />
      </div>
      <div className={s.linha3}>
        <RankingMes m={m} />
        <AvaliacaoChamados m={m} />
        <Assiduidade m={m} abrir={detalhe.abrir} abrirPainel={setPainel} />
      </div>
      <Sistemas m={m} abrir={detalhe.abrir} />

      {painel && <PainelDoIndicador chave={painel} m={m} onFechar={() => setPainel(null)} />}
      {detalhe.aberto && (
        <JanelaDetalhe chave={detalhe.aberto} setor={{ id: m.setor.id, nome: m.setor.nome }} onFechar={detalhe.fechar} />
      )}
      </PainelDaPessoaProvider>
    </div>
  )
}
