'use client'
import { use } from 'react'
import { FileDown } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { useEmployeePeriod } from '@/lib/ui/employee-period'
import { useEmployeeTimeline } from '@/lib/ui/employee-timeline'
import { usePeriod } from '@/lib/ui/period'
import { useVoltar } from '@/lib/ui/origem'
import { buildEmployeeVM } from '@/lib/mock/employee'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import s from '../../_visao/visao.module.css'
import { PainelDaPessoaProvider } from '../../PainelDaPessoa'
import { Placar } from './Placar'
import ServicosCard from './ServicosCard'
import f from './_visao/ficha.module.css'
import { Cabecalho } from './_visao/Cabecalho'
import { Indicadores } from './_visao/Indicadores'
import { Sistemas } from './_visao/Sistemas'
import { Assiduidade } from './_visao/Assiduidade'
import { LinhaDoTempo } from './_visao/LinhaDoTempo'
import { AntesDeAvaliar, RadioCartao } from './_visao/Lateral'
import { FichaImpressa } from './_visao/FichaImpressa'

/* ============================================================
   A FICHA DA PESSOA — no padrão novo (o do relatório do setor e do painel).

   Nasceu como PRÉVIA em `/funcionarios/<id>/novo` (14/09/2026), foi ajustada
   em sete rodadas com o dono no mesmo dia e aprovada: "pode trocar a ficha de
   todos pela nova". A ficha de antes está em `./anterior`, só por endereço — sem
   porta na tela, como o relatório antigo do setor (`/completo`); `/novo`
   redireciona para cá.

   ⚠️ Os DADOS são os de sempre: `/api/employee-metrics` e a linha do tempo, com
   a mesma régua de acesso. As seções moram em `./_visao/` (o `_` tira a pasta
   das rotas do Next).
   ============================================================ */

export default function FichaDaPessoa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const data = useTalentData()
  const { label: periodo } = usePeriod()
  const { m } = useEmployeePeriod(id)
  const { events, estado } = useEmployeeTimeline(id)
  const vm = buildEmployeeVM(data, id)
  // ⚠️ Volta para onde a pessoa ESTAVA (setor, ranking, avaliação…). Ver `lib/ui/origem.tsx`.
  const voltar = useVoltar({ href: '/funcionarios', label: 'Voltar ao diretório' })

  if (!vm) {
    return (
      <div className={s.raiz}>
        <div className={s.cartao} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>Funcionário não encontrado.</div>
      </div>
    )
  }

  /* ⚠️ GERAR PDF = imprimir a folha A4 (`FichaImpressa`) que já está montada com os
     dados DESTA tela e DESTE filtro; o navegador oferece "Salvar como PDF". O título
     da aba vira o nome sugerido do arquivo, e volta ao normal depois. */
  const gerarPdf = () => {
    const antes = document.title
    document.title = `Ficha - ${vm.name} - ${periodo}`
    const volta = () => { document.title = antes; window.removeEventListener('afterprint', volta) }
    window.addEventListener('afterprint', volta)
    window.print()
  }

  return (
    <div className={`tc-anim ${s.raiz}`}>
      {/* ⚠️ Provedor DENTRO da `.raiz`: o resumo aberto pelos cartões nasce na paleta nova. */}
      <PainelDaPessoaProvider>
      {/* ⚠️ O placar fica no hero, ao lado da foto e da formação, e só aparece
          quando a rota respondeu: zerado diria "zero pontos". */}
      <Cabecalho vm={vm} voltar={voltar}
        acoes={
          /* ⚠️ Só habilita quando os dados do período chegaram: um PDF gerado antes
             sairia sem os números — e papel não recarrega. */
          <button type="button" onClick={gerarPdf} disabled={!m}
            title={m ? `Gerar a ficha em PDF (A4) · ${periodo}` : 'Aguarde os dados do período carregarem'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 36, padding: '0 16px', border: 'none', borderRadius: 10, background: m ? 'var(--n-blue)' : 'var(--n-card-2)', color: m ? '#fff' : 'var(--n-text-3)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: m ? 'pointer' : 'wait', boxShadow: m ? '0 6px 16px color-mix(in srgb, var(--n-blue) 25%, transparent)' : 'none' }}>
            <FileDown size={16} /> {m ? 'Gerar PDF' : 'Carregando…'}
          </button>
        }
        lado={m?.posicao ? (
          <Placar compacto p={m.posicao} meses={m.posicao.mesesDoPlacar} setor={vm.dept} competenciaLabel={competenciaLabel(m.posicao.competencia)}
            motivoSemNota={m.posicao.de === 0 ? `ninguém do ${vm.dept} pontuou em ${competenciaLabel(m.posicao.competencia)}` : null} />
        ) : null} />
      <Indicadores m={m} periodo={periodo} />

      <div className={f.corpo}>
        <div className={s.pilha}>
          <ServicosCard servicos={m?.servicos} pontuacao={m?.pontuacao} periodo={periodo} semPontuacao />
          <Sistemas m={m} periodo={periodo} pessoaId={vm.id} />
          <Assiduidade m={m} periodo={periodo} pontoAteVm={vm.pontoAte ?? null} />
        </div>
        <aside className={f.lateral}>
          <AntesDeAvaliar vm={vm} m={m} periodo={periodo} estado={estado} />
          <RadioCartao m={m} periodo={periodo} />
          <LinhaDoTempo events={events} estado={estado} periodo={periodo} />
        </aside>
      </div>
      </PainelDaPessoaProvider>

      {/* A folha A4 — invisível na tela, a única coisa que sai na impressão. */}
      {m && <FichaImpressa vm={vm} m={m} periodo={periodo} />}
    </div>
  )
}
