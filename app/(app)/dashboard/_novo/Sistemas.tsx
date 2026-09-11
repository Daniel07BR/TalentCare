'use client'
import { Settings2, GraduationCap, Radio, MessagesSquare, Headphones, Landmark, MessageSquareText, Truck } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import { useClassroomPeriod } from '@/lib/ui/classroom-period'
import { useRadioPeriod } from '@/lib/ui/radio-period'
import { useConsultoriaPeriod } from '@/lib/ui/consultoria-period'
import { useHelpdeskPeriod } from '@/lib/ui/helpdesk-period'
import { useCidePeriod } from '@/lib/ui/cide-period'
import { useChatPeriod } from '@/lib/ui/chat-period'
import { useGerenciaPeriod } from '@/lib/ui/gerencia-period'
import { classroomVM } from '@/lib/mock/classroom'
import { radioVM } from '@/lib/mock/radio'
import { consultoriaVM } from '@/lib/mock/consultoria'
import { helpdeskVM } from '@/lib/mock/helpdesk'
import { cideVM } from '@/lib/mock/cide'
import { chatVM } from '@/lib/mock/chat'
import { gerenciaVM } from '@/lib/mock/gerencia'
import { linhasClassroom, linhasDe } from '@/lib/painel/visao'
import v from '../../_visao/visao.module.css'
import p from './painel.module.css'
import { precarregarDetalhe, type ChaveDetalhe } from '../../_visao/Detalhe'
import { Barras, CabecaBotao, Esqueleto, Tabela, Vazio, num } from './pecas'

/* ============================================================
   SISTEMAS E PRODUTIVIDADE — um cartão por sistema, com as linhas por setor.

   ⚠️ Cada cartão chama o MESMO gancho e a MESMA função do cartão da página
   atual (`useClassroomPeriod` + `classroomVM`…): o número é o de sempre.
   - clicar no TÍTULO abre o resumo do sistema da casa inteira (janela);
   - clicar numa LINHA abre o mesmo resumo só com aquele setor — com quem já
     saiu dele no período, que é a população da barra (ver `JanelaDetalhe`).

   Chat Interno e Gerência entraram aqui (decisão do dono, 11/09/2026) com os
   números das páginas deles; a página atual não tinha cartão para os dois.
   ============================================================ */

export type Abrir = (chave: ChaveDetalhe, setorId?: string | null) => void

/** O estado de um cartão: esqueleto na primeira carga, apagado na troca de filtro,
 *  e ERRO quando a leitura falhou — nunca "nenhuma atividade" por queda de rede. */
type Estado = 'carregando' | 'recarregando' | 'erro' | 'ok'
const estadoDe = (loading: boolean, temMapa: boolean, erro = false): Estado =>
  erro && !loading ? 'erro' : !temMapa ? 'carregando' : loading ? 'recarregando' : 'ok'

function CartaoSistema({ chave, titulo, sub, Icone, cor, abrir, estado, vazio, className, children }: {
  chave: ChaveDetalhe; titulo: string; sub: React.ReactNode
  Icone: typeof GraduationCap; cor: string; abrir: Abrir
  estado: Estado; vazio: string | null
  className?: string; children: React.ReactNode
}) {
  return (
    <section className={`${v.cartao} ${className ?? ''}`}>
      {/* ⚠️ O subtítulo carrega TOTAIS: na troca de filtro ele apaga junto com o
          corpo — senão os totais da janela anterior ficam em cor cheia. */}
      <CabecaBotao Icone={Icone} cor={cor} titulo={titulo}
        sub={estado === 'carregando' ? 'carregando…' : estado === 'erro' ? 'não foi possível ler' : <span className={estado === 'recarregando' ? p.recarregando : undefined}>{sub}</span>}
        onClick={() => abrir(chave)} onPreparar={() => precarregarDetalhe(chave)}
        dica={`Abrir o resumo de ${titulo.split(' · ')[0]} (a casa inteira)`} />
      {estado === 'carregando' ? <Esqueleto linhas={6} alto={14} />
        : estado === 'erro' ? <Vazio><span style={{ color: 'var(--n-red)' }}>Não foi possível ler este sistema agora — recarregue a página. (Não é "nenhuma atividade".)</span></Vazio>
        : vazio ? <Vazio>{vazio}</Vazio>
        : <div className={estado === 'recarregando' ? p.recarregando : undefined}>{children}</div>}
    </section>
  )
}

function ClassRoom({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useClassroomPeriod()
  const vm = classroomVM(data, map ?? undefined)
  const linhas = linhasClassroom(vm.deptBars)
  return (
    <CartaoSistema chave="classroom" titulo="ClassRoom · cursos criados por departamento" Icone={GraduationCap} cor="var(--n-green)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={linhas.length ? null : 'Nenhuma atividade no ClassRoom no período.'}
      sub={`${num(vm.totals.created)} cursos criados · ${num(vm.totals.courses)} concluídos · ${num(vm.totals.videos)} vídeos assistidos`}>
      <Barras linhas={linhas} abrir={(id) => abrir('classroom', id)} />
    </CartaoSistema>
  )
}

function RadioCartao({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useRadioPeriod()
  const vm = radioVM(data, map ?? undefined)
  const linhas = linhasDe(vm.deptBars, (d) => d.horas)
  return (
    <CartaoSistema chave="radio" titulo="Rádio Itamarathy · horas ouvidas" Icone={Radio} cor="var(--n-green)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={linhas.length ? null : 'Nenhuma escuta no período.'}
      sub={`${num(vm.totalHoras)} horas · ${num(vm.totalSessoes)} sessões · ${vm.ouvintes} ouvintes`}>
      <Barras linhas={linhas} cor="var(--n-green)" sufixo="h" abrir={(id) => abrir('radio', id)} />
    </CartaoSistema>
  )
}

function Consultoria({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useConsultoriaPeriod()
  const vm = consultoriaVM(data, map ?? undefined)
  const t = vm.totals
  return (
    <CartaoSistema chave="consultoria" titulo="Consultoria Plus · atividade por departamento" Icone={MessagesSquare} cor="var(--n-purple)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={vm.deptBars.length ? null : 'Nenhuma atividade no período.'}
      sub="Estudos postados, chamados abertos, mensagens e comentários">
      <Tabela linhas={vm.deptBars} abrir={(id) => abrir('consultoria', id)}
        colunas={[
          { rotulo: 'Estudos', cor: 'var(--n-purple)', valor: (r) => r.studies },
          { rotulo: 'Chamados', cor: 'var(--n-blue)', valor: (r) => r.tickets },
          { rotulo: 'Mensag.', cor: 'var(--n-green)', valor: (r) => r.messages },
          { rotulo: 'Coment.', cor: 'var(--n-pink)', valor: (r) => r.comments },
        ]}
        total={[t.studies, t.tickets, t.messages, t.comments]} />
    </CartaoSistema>
  )
}

function HelpDesk({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useHelpdeskPeriod()
  const vm = helpdeskVM(data, map ?? undefined)
  return (
    <CartaoSistema chave="helpdesk" titulo="HelpDesk · chamados por departamento" Icone={Headphones} cor="var(--n-blue)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={vm.deptBars.length ? null : 'Nenhum chamado no período.'}
      sub={`${num(vm.totals.opened)} abertos · ${num(vm.totals.resolved)} resolvidos · tempo médio ${vm.tempoMedioGeral}`}>
      <Tabela linhas={vm.deptBars} abrir={(id) => abrir('helpdesk', id)}
        colunas={[
          { rotulo: 'Abertos', cor: 'var(--n-blue)', valor: (r) => r.opened },
          { rotulo: 'Resolvidos', cor: 'var(--n-green)', valor: (r) => r.resolved },
        ]}
        total={[vm.totals.opened, vm.totals.resolved]} />
    </CartaoSistema>
  )
}

function Cide({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useCidePeriod()
  const vm = cideVM(data, map ?? undefined)
  const linhas = linhasDe(vm.deptBars, (d) => d.atividades)
  return (
    <CartaoSistema chave="cide" titulo="CIDE · empresas atendidas" Icone={Landmark} cor="var(--n-red)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={linhas.length ? null : 'Nenhuma atividade no período.'}
      sub={`${num(vm.totalAtividades)} empresas atendidas · ${vm.ativos} pessoas · ${vm.deptCount} setores`}>
      <Barras linhas={linhas} cor="var(--n-red)" abrir={(id) => abrir('cide', id)} />
    </CartaoSistema>
  )
}

function Chat({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, setores, loading, erro } = useChatPeriod()
  const vm = chatVM(data, map ?? undefined, setores)
  const t = vm.totaisSetor
  return (
    <CartaoSistema chave="chat" titulo="Chat Interno · chamados entre setores" Icone={MessageSquareText} cor="var(--n-purple)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={vm.porSetor.length ? null : 'Sem chamados no período (o chamado entre setores existe desde 21/08/2026).'}
      sub={`${num(t.recebidosAbertos)} abertos · ${num(t.recebidosConcluidos)} concluídos · tempo médio ${vm.tempoMedioSetor}`}>
      {/* ⚠️⚠️ "Pediu" e "Recebeu" são as DUAS FACES do mesmo chamado e não se
          somam — somar dobraria a casa inteira. É a tabela da página do Chat. */}
      <Tabela linhas={vm.porSetor} abrir={(id) => abrir('chat', id)}
        colunas={[
          { rotulo: 'Pediu', cor: 'var(--n-blue)', valor: (r) => r.pedidosAbertos },
          { rotulo: 'Recebeu', cor: 'var(--n-purple)', valor: (r) => r.recebidosAbertos },
          { rotulo: 'Concluiu', cor: 'var(--n-green)', valor: (r) => r.recebidosConcluidos },
        ]}
        total={[t.pedidosAbertos, t.recebidosAbertos, t.recebidosConcluidos]} />
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 8 }}>Pediu e recebeu são as duas faces do mesmo chamado — não se somam.</div>
    </CartaoSistema>
  )
}

function Gerencia({ abrir }: { abrir: Abrir }) {
  const data = useTalentData()
  const { map, loading, erro } = useGerenciaPeriod()
  const vm = gerenciaVM(data, map ?? undefined)
  const servicos = linhasDe(vm.execBars, (d) => d.valor)
  const km = linhasDe(vm.kmBars, (d) => d.valor)
  return (
    <CartaoSistema chave="gerencia" className={p.dois} titulo="Gerência · saídas externas por departamento" Icone={Truck} cor="var(--n-orange)" abrir={abrir}
      estado={estadoDe(loading, !!map, erro)} vazio={servicos.length || km.length ? null : 'Nenhuma saída registrada no período.'}
      sub={`${num(vm.totais.servicos)} serviços concluídos · ${num(vm.totais.km)} km rodados · ${vm.execPessoas} pessoas saíram · km desde 17/07/2026`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '6px 28px' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-text-3)', marginBottom: 6 }}>Serviços concluídos</div>
          {servicos.length ? <Barras linhas={servicos} cor="var(--n-orange)" abrir={(id) => abrir('gerencia', id)} /> : <Vazio>Nenhum.</Vazio>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--n-text-3)', marginBottom: 6 }}>Km rodados</div>
          {km.length ? <Barras linhas={km} cor="var(--n-amber)" sufixo=" km" abrir={(id) => abrir('gerencia', id)} /> : <Vazio>Nenhum.</Vazio>}
        </div>
      </div>
    </CartaoSistema>
  )
}

export function Sistemas({ periodo, abrir }: { periodo: string; abrir: Abrir }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', margin: '6px 0 12px' }}>
        <Settings2 size={18} color="var(--n-blue)" style={{ alignSelf: 'center' }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-.3px' }}>Sistemas e produtividade</h2>
        <span style={{ fontSize: 11.5, color: 'var(--n-text-3)' }}>
          Dados consolidados dos sistemas · {periodo} · o título abre o resumo do sistema; a linha de um setor, só aquele setor
        </span>
      </div>
      <div className={p.sistemas}>
        <ClassRoom abrir={abrir} />
        <RadioCartao abrir={abrir} />
        <Consultoria abrir={abrir} />
        <HelpDesk abrir={abrir} />
        <Cide abrir={abrir} />
        <Chat abrir={abrir} />
        <Gerencia abrir={abrir} />
      </div>
    </>
  )
}
