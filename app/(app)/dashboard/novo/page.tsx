'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import { useAssiduidadePeriod } from '@/lib/ui/assiduidade-period'
import { useFrescor } from '@/lib/ui/frescor'
import { useScoreSignals } from '@/lib/ui/score-period'
import { withRealScores } from '@/lib/mock/score'
import { buildDashboard } from '@/lib/mock/dashboard'
import { generationsVM, genderVM } from '@/lib/mock/demographics'
import {
  janelaDeComparacao, seloVariacao, diasComExpediente, compararMesmasPessoas, somaAssiduidade, listaMinutos,
  gruposEscolaridade, gruposGeracao, gruposGenero, linhasWhatsapp,
  type Grupo, type Linha,
} from '@/lib/painel/visao'
import v from '../../_visao/visao.module.css'
import p from '../_novo/painel.module.css'
import { useDetalhe, JanelaDetalhe } from '../../_visao/Detalhe'
import { PainelDaPessoaProvider, usePainelDaPessoa } from '../../PainelDaPessoa'
import { PainelPessoas } from '../../PainelPessoas'
import { Cabecalho } from '../_novo/Cabecalho'
import { Indicadores, type SeloDoKpi } from '../_novo/Indicadores'
import { Atendimentos, CurvaTurnover } from '../_novo/Linha2'
import { Destaque, Escolaridade, Geracoes, Genero } from '../_novo/Linha3'
import { Sistemas } from '../_novo/Sistemas'
import { Assiduidade } from '../_novo/Assiduidade'

/* ============================================================
   O PAINEL PRINCIPAL NOVO — PRÉVIA em `/dashboard/novo` (11/09/2026).

   Pedido do dono: refazer a página principal no molde do relatório do setor,
   com o desenho e as cores da imagem conceito, interativa: todo número com
   gente atrás abre quem; todo bloco de sistema abre o resumo numa janela; todo
   nome abre o painel da pessoa; a linha de um setor abre o sistema só dele.

   ⚠️⚠️ OS NÚMEROS SÃO OS DA PÁGINA ATUAL (`/dashboard`). Esta página chama as
   mesmas funções (`buildDashboard`, os mesmos ganchos e as mesmas funções de
   cada sistema); `lib/painel/visao.ts` só dá forma. A prova é
   `scripts/ensaio-painel-novo.ts`.

   ⚠️ É prévia: a atual segue intacta, e a troca é quando o dono disser. Quem
   chega aqui é a Diretoria (o `proxy.ts` cobre `/dashboard/…`); o atalho na
   página atual aparece só para o dono.
   ============================================================ */

type Lista = { tipo: 'kpi'; chave: string } | { tipo: 'grupo'; chave: string } | { tipo: 'minutos' }

const COR_KPI: Record<string, string> = {
  Headcount: 'var(--n-blue)', Advertências: 'var(--n-orange)', Atrasos: 'var(--n-red)', Suspensões: 'var(--n-purple)',
}
/** As listas cujo clique abre o PAINEL DA PESSOA (assiduidade) em vez da ficha. */
const DA_ASSIDUIDADE = new Set(['Advertências', 'Atrasos', 'Suspensões'])

/** O WhatsApp por setor — a mesma rota e o mesmo filtro do cartão da página atual. */
function useWhatsappPorSetor() {
  const { query } = usePeriod()
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let vivo = true
    setLoading(true); setErro(false)
    fetch(`/api/whatsapp-by-dept?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { departments: { name: string; color: string | null; abertos: number }[] }) => { if (vivo) setLinhas(linhasWhatsapp(d.departments)) })
      .catch(() => vivo && setErro(true))
      .finally(() => vivo && setLoading(false))
    return () => { vivo = false }
  }, [query])
  return { linhas, estado: (erro ? 'erro' : !linhas ? 'carregando' : loading ? 'recarregando' : 'ok') as 'erro' | 'carregando' | 'recarregando' | 'ok' }
}

function Conteudo() {
  const { period, from, to, label: periodo, fromDay, toDay } = usePeriod()
  const abrirPessoa = usePainelDaPessoa()
  const { signals, loading: scoreLoading, erro: scoreErro } = useScoreSignals()
  const data = withRealScores(useTalentData(), signals)
  const assid = useAssiduidadePeriod()
  const frescor = useFrescor()
  const detalhe = useDetalhe()
  const wpp = useWhatsappPorSetor()

  /* A MESMA chamada da página atual, com as mesmas opções. */
  const vm = buildDashboard(data, period, {
    assidMap: assid.map ?? undefined,
    from, to,
    janelaComPonto: assid.janelaComPonto,
    motivoSemPonto: assid.motivoSemPonto ?? (assid.erro ? 'não foi possível ler o ponto' : null),
    atrasosPorDia: assid.porDia,
    pontoDesde: assid.pontoDesde,
    pontoAte: assid.pontoAte,
    lgpdSuspensoes: assid.lgpdSuspensoes,
    suspensoesAtraso: assid.suspensoesAtraso,
    lgpdAdvertencias: assid.lgpdAdvertencias,
    pontuacao: signals?.pontuacao,
    competenciaPontuacao: signals?.competenciaPontuacao,
    estadoPontuacao: signals?.estadoPontuacao,
  })
  const gen = generationsVM(data).overall
  const gend = genderVM(data).overall

  /* ── Os selos de Atrasos e Advertências (decisão do dono, 11/09/2026) ──────
     Três travas, cada uma nascida de um número que mentia:
     1. dias MEDIDOS contra dias medidos, recuados em semanas inteiras, só até 4
        meses (`janelaDeComparacao`);
     2. o MESMO número de dias com expediente dos dois lados — senão o feriado
        vira melhora (`diasComExpediente`; achado do crítico: ▼27% falso em 7 dias);
     3. as MESMAS pessoas dos dois lados — senão quem entrou puxa para "piorou"
        (`compararMesmasPessoas`; achado do crítico: ▲9% × ▲6% no Trimestre).
     E base ≥ 10 (`seloVariacao`). A janela anterior vem da MESMA rota. */
  const j = assid.loading ? null : janelaDeComparacao(fromDay, toDay, assid.pontoDesde, assid.pontoAte, assid.janelaComPonto)
  const ant = useAssiduidadePeriod(j ? { de: j.de, ate: j.ate } : null)
  const selos: Partial<Record<string, SeloDoKpi>> = {}
  if (j && assid.map && ant.map && !ant.loading && ant.janelaComPonto) {
    const expAtual = diasComExpediente(assid.porDia, j.atualDe, j.atualAte)
    const expAnt = diasComExpediente(ant.porDia, j.de, j.ate)
    if (expAtual > 0 && expAtual === expAnt) {
      const c = compararMesmasPessoas(data, j.de, assid.map, ant.map)
      for (const [label, campo] of [['Atrasos', 'atrasos'], ['Advertências', 'advertencias']] as const) {
        const selo = seloVariacao(c.atual[campo], c.anterior[campo])
        if (selo) selos[label] = { selo, janela: j, atual: c.atual[campo], anterior: c.anterior[campo], pessoas: c.pessoas, expediente: expAtual }
      }
    }
  }

  /* ── Demografia (retrato de hoje) ──────────────────────────────────────── */
  const gEsc = gruposEscolaridade(data, vm.escSegments)
  const gGer = gruposGeracao(data, gen.segs)
  const gGen = gruposGenero(data)

  /* A lista aberta. Guarda a CHAVE e não a lista: trocar o filtro remonta os
     números, e uma lista congelada ficaria debaixo do título da janela nova.
     ⚠️ Trocar o filtro FECHA a lista (achado do crítico, 09/09/2026). */
  const [lista, setLista] = useState<Lista | null>(null)
  useEffect(() => { setLista(null) }, [period, from, to])

  /* Minutos e abonados do quadro ativo, e quem somou minutos — a mesma população
     dos cartões Atrasos e Advertências. */
  const somaA = assid.map ? somaAssiduidade(data, assid.map) : { minutos: 0, abonados: 0 }
  const minutosPessoas = assid.map ? listaMinutos(data, assid.map) : []

  const painel = (() => {
    if (!lista) return null
    if (lista.tipo === 'minutos') {
      if (!minutosPessoas.length) return null
      return (
        <PainelPessoas titulo="Minutos de atraso, por pessoa" nota="minutos somados na janela" periodo={periodo} pessoas={minutosPessoas}
          cor="var(--n-blue)" sufixo="minutos" mostrarNumero aoFechar={() => setLista(null)}
          aoClicar={(id) => abrirPessoa('assiduidade', id)}
          rodape="Clique numa pessoa para ver, dia a dia, os atrasos e as medidas dela na janela." />
      )
    }
    if (lista.tipo === 'kpi') {
      const k = vm.kpis.find((x) => x.label === lista.chave)
      if (!k?.pessoas?.length) return null
      const assidLista = DA_ASSIDUIDADE.has(k.label)
      return (
        <PainelPessoas titulo={k.label} nota={k.pessoasNota} periodo={periodo} pessoas={k.pessoas}
          cor={COR_KPI[k.label] ?? 'var(--n-blue)'} sufixo={k.pessoasSufixo ?? k.label.toLowerCase()}
          mostrarNumero={assidLista} aoFechar={() => setLista(null)}
          aoClicar={assidLista ? (id) => abrirPessoa('assiduidade', id) : undefined}
          rodape={assidLista ? 'Clique numa pessoa para ver, dia a dia, os atrasos e as medidas dela na janela.' : undefined} />
      )
    }
    const todos: Grupo[] = [...gEsc.map((g) => ({ ...g, chave: `esc:${g.chave}`, rotulo: `Escolaridade · ${g.rotulo}` })),
      ...gGer.map((g) => ({ ...g, chave: `ger:${g.chave}` })), ...gGen.map((g) => ({ ...g, chave: `gen:${g.chave}`, rotulo: `Gênero · ${g.rotulo}` }))]
    const g = todos.find((x) => x.chave === lista.chave)
    if (!g) return null
    return (
      <PainelPessoas titulo={g.rotulo} nota="retrato de hoje — não acompanha o filtro" pessoas={g.pessoas}
        cor={g.cor} sufixo="pessoas" aoFechar={() => setLista(null)} />
    )
  })()

  const abrirGrupo = (prefixo: string) => (g: Grupo) => setLista({ tipo: 'grupo', chave: `${prefixo}:${g.chave}` })
  const setorAberto = detalhe.setorId
    ? { id: detalhe.setorId, nome: data.departments.find((d) => d.id === detalhe.setorId)?.nome ?? data.deptMeta[detalhe.setorId] ?? 'Setor' }
    : null
  const erroPeriodo = scoreErro || assid.erro

  return (
    <>
      {/* ⚠️ `.painel` é um container de CSS (as grades respondem à largura do
          conteúdo, não da tela). Container com `container-type` vira o bloco de
          referência de quem é `position: fixed` — por isso a lista e a janela
          ficam FORA dele, lá embaixo. */}
      <div className={p.painel}>
      <Cabecalho periodo={periodo} frescor={frescor} />

      {erroPeriodo && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--n-red)', background: 'var(--n-red-soft)', border: '1px solid var(--n-red)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
          <b>Não foi possível ler os números do período.</b> Os cartões que dependem deles mostram "—". Recarregue antes de decidir qualquer coisa com estes números.
        </div>
      )}

      <Indicadores kpis={vm.kpis} selos={selos} esperandoPonto={assid.loading && !assid.map} recarregandoPonto={assid.loading && !!assid.map}
        abrirLista={(label) => setLista({ tipo: 'kpi', chave: label })} abrirTurnover={() => detalhe.abrir('turnover')} />

      <div className={p.linha2}>
        <Atendimentos linhas={wpp.linhas ?? []} estado={wpp.estado} abrirCasa={() => detalhe.abrir('whatsapp')} />
        <CurvaTurnover taxa={vm.turnoverWinRate} saidas={vm.turnoverSaidas} dias={vm.turnoverDias}
          vals={vm.turnoverVals} rotulos={vm.turnoverLabels} abrir={() => detalhe.abrir('turnover')} />
      </div>

      <div className={p.linha3}>
        {/* ⚠️ Enquanto os sinais do período não chegam, a pontuação ainda não
            existe — esqueleto, e não o destaque de outra competência. */}
        <Destaque lista={vm.deptHighlights} info={vm.pontuacaoInfo} carregando={scoreLoading && !signals} recarregando={scoreLoading && !!signals} erro={scoreErro && !signals} />
        <Escolaridade total={vm.headcountTotal} grupos={gEsc} fatias={vm.escSegments} topPct={vm.escTopPct} topRotulo={vm.escTopLabel} abrir={abrirGrupo('esc')} abrirDetalhe={() => detalhe.abrir('formacao')} />
        <Geracoes media={gen.avg} grupos={gGer}
          pcts={Object.fromEntries(gen.segs.map((s) => [s.key, s.pct]))}
          idades={Object.fromEntries(gen.segs.map((s) => [s.key, s.ages]))} abrir={abrirGrupo('ger')} />
      </div>

      {(() => {
        const kA = vm.kpis.find((k) => k.label === 'Atrasos')
        const kV = vm.kpis.find((k) => k.label === 'Advertências')
        return (
          <Assiduidade periodo={periodo} fromDay={fromDay} toDay={toDay}
            semPonto={!assid.loading && !assid.janelaComPonto} motivo={assid.motivoSemPonto ?? (assid.erro ? 'não foi possível ler o ponto' : 'sem dado de ponto nesta janela')}
            esperando={assid.loading && !assid.map} recarregando={assid.loading && !!assid.map}
            atrasos={kA?.value ?? '—'} advertencias={kV?.value ?? '—'} minutos={somaA.minutos} abonados={somaA.abonados}
            nAtrasos={kA?.pessoas?.length ?? 0} nMinutos={minutosPessoas.length} nAdvertencias={kV?.pessoas?.length ?? 0}
            abrirLista={(q) => setLista(q === 'minutos' ? { tipo: 'minutos' } : { tipo: 'kpi', chave: q })}
            abrirDetalhe={() => detalhe.abrir('assiduidade')} abrirPessoa={(id) => abrirPessoa('assiduidade', id)} />
        )
      })()}

      <Genero grupos={gGen} pcts={{ M: gend.mPct, F: gend.fPct }} idades={{ M: gend.avgM, F: gend.avgF }} abrir={abrirGrupo('gen')} />

      <Sistemas periodo={periodo} abrir={detalhe.abrir} />
      </div>

      {painel}
      {detalhe.aberto && (
        <JanelaDetalhe chave={detalhe.aberto} setor={setorAberto} comQuemSaiu={!!setorAberto} onFechar={detalhe.fechar} />
      )}
    </>
  )
}

export default function PainelNovo() {
  return (
    <div className={`tc-anim ${v.raiz}`}>
      {/* ⚠️ O provedor do painel da pessoa AQUI DENTRO da `.raiz`: aberto de uma
          lista ou de uma janela, ele nasce com a paleta nova (o molde do setor). */}
      <PainelDaPessoaProvider>
        <Conteudo />
      </PainelDaPessoaProvider>
    </div>
  )
}
