'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, BookOpen, Radio, Clock3 } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { EmployeeVM } from '@/lib/mock/employee'
import type { useEmployeeTimeline } from '@/lib/ui/employee-timeline'
import { Cartao, LinkAcao } from '../../../_visao/ui'
import FormacaoEditor from '../FormacaoEditor'
import TreinamentosEditor from '../TreinamentosEditor'
import { formCor, num } from './derivar'
import f from './ficha.module.css'

/* ============================================================
   A COLUNA DE QUEM VAI AVALIAR — mesma lógica da ficha atual
   (`PainelDoAvaliador`, `RadioLateral`, `UltimaAtividade`), no desenho novo.
   ⚠️ O cartão "Conduta" não veio: os números dele agora são os azulejos do
   topo e o bloco de assiduidade — trazê-lo seria a mesma coisa três vezes.
   ============================================================ */

export function AntesDeAvaliar({ vm, m, periodo, estado }: { vm: EmployeeVM; m: EmployeeMetrics | null; periodo: string; estado: ReturnType<typeof useEmployeeTimeline>['estado'] }) {
  const router = useRouter()
  /* ⚠️ A janela vs. a vida da pessoa: sem isto, zero de recém-admitida se lê como zero de trabalho. */
  const admissao = vm.hireISO ? new Date(vm.hireISO) : null
  const saida = vm.leftISO ? new Date(vm.leftISO) : null
  const desde = m ? new Date(`${m.fromDay}T00:00:00`) : null
  const recemAdmitida = admissao && desde && admissao > desde
  const saiuNoPeriodo = saida && desde && saida > desde
  const fmtD = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

  /* O que PERGUNTAR — escrito como pergunta, nunca como conclusão. */
  const pontos: { texto: string; cor: string }[] = []
  if (m) {
    const c = m.chat, a = m.assiduidade
    if (c.hasChamado && c.chamadosConcluidos > 0) pontos.push({ texto: `Concluiu ${c.chamadosConcluidos} ${c.chamadosConcluidos === 1 ? 'chamado' : 'chamados'} de outros setores, em média ${c.tempoMedio}. Isso corresponde ao que você via no dia a dia?`, cor: 'var(--n-pink)' })
    if (m.helpdesk.has && m.helpdesk.resolved > 0) pontos.push({ texto: `Resolveu ${m.helpdesk.resolved} ${m.helpdesk.resolved === 1 ? 'chamado' : 'chamados'} no HelpDesk. Vale reconhecer, ou foi tarefa de rotina?`, cor: 'var(--n-blue)' })
    if (m.classroom.created > 0) pontos.push({ texto: `Criou ${m.classroom.created} ${m.classroom.created === 1 ? 'curso' : 'cursos'} no ClassRoom — ensinar alguém conta como colaboração.`, cor: 'var(--n-green)' })
    if (m.whatsapp.has && m.whatsapp.finalizados > 0) pontos.push({ texto: `Finalizou ${m.whatsapp.finalizados} atendimentos no WhatsApp, em média ${m.whatsapp.tempoMedio}.`, cor: 'var(--n-whats)' })
    if (m.gerencia.hasSaida && m.gerencia.servicos > 0) pontos.push({ texto: `Entregou ${m.gerencia.servicos} serviços na rua, ${m.gerencia.km} km rodados.`, cor: 'var(--n-orange)' })
    const susp = (a.suspensoesAtraso ?? 0) + (a.suspensoes ?? 0)
    if (susp > 0) pontos.push({ texto: `${susp} ${susp === 1 ? 'suspensão' : 'suspensões'} no período. O que mudou depois dela?`, cor: 'var(--n-purple)' })
    if (a.advertencias > 0) pontos.push({ texto: `${a.advertencias} ${a.advertencias === 1 ? 'advertência' : 'advertências'} no período. Já foi conversado?`, cor: 'var(--n-red)' })
    if (a.atrasos > 0) pontos.push({ texto: `${a.atrasos} ${a.atrasos === 1 ? 'atraso' : 'atrasos'} (${a.minutos} min). ${a.atrasosAbon > 0 ? `Outros ${a.atrasosAbon} foram abonados.` : 'Há um motivo conhecido?'}`, cor: 'var(--n-amber)' })
    /* ⚠️ Silêncio nos sistemas não é inatividade. */
    if (pontos.length === 0) pontos.push({ texto: 'Os sistemas não registraram atividade desta pessoa no período. Isso não quer dizer que ela não trabalhou — o trabalho dela pode não passar por nenhuma das fontes medidas.', cor: 'var(--n-text-3)' })
  }

  return (
    <Cartao titulo="Antes de avaliar" Icone={ClipboardCheck} sub={`O que os sistemas registraram · ${periodo}`}>
      {(recemAdmitida || saiuNoPeriodo) && (
        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--n-text-2)', background: 'var(--n-amber-soft)', borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>
          {recemAdmitida && admissao && <>Admitida em <b>{fmtD(admissao)}</b> — o período cobre só parte do tempo de casa dela.</>}
          {saiuNoPeriodo && saida && <>{recemAdmitida ? ' ' : ''}Desligada em <b>{fmtD(saida)}</b> — os números param aí.</>}
        </div>
      )}
      {!m && (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)', padding: '4px 0' }}>
          {estado === 'negado' ? 'Você não tem acesso à atividade desta pessoa.' : estado === 'erro' ? 'Não deu para carregar o que os sistemas registraram.' : 'Carregando o que os sistemas registraram…'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pontos.map((p, i) => (
          <div key={i} className="cpop" style={{ animationDelay: `${i * 55}ms`, fontSize: 12.5, lineHeight: 1.55, color: 'var(--n-text-2)', background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderLeft: `4px solid ${p.cor}`, borderRadius: 10, padding: '9px 12px' }}>
            {p.texto}
          </div>
        ))}
      </div>
      {/* ⚠️ Desligado não entra na fila: o botão levaria a uma tela que recusa. */}
      <button type="button" className={f.botaoPrimario} style={{ marginTop: 16 }} disabled={!!saida}
        onClick={() => router.push(`/avaliacoes/${vm.id}`)} title={saida ? 'Pessoa desligada — fora da fila de avaliação' : undefined}>
        {saida ? 'Desligada — fora da avaliação' : `Avaliar ${vm.name.split(' ')[0]}`}
      </button>
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.5 }}>
        Estes números são o que os sistemas viram — não são a nota. A nota é sua, e o que ela mede (entrega, prazo, conduta, equipe) nenhum sistema registra.
      </div>
    </Cartao>
  )
}

export function Formacao({ vm }: { vm: EmployeeVM }) {
  const [editando, setEditando] = useState(false)
  return (
    <Cartao titulo="Formação" Icone={BookOpen} corIcone="var(--n-green)" sub="Retrato de hoje · não acompanha o filtro"
      acao={<LinkAcao onClick={() => setEditando((v) => !v)}>{editando ? 'Fechar edição' : 'Editar'}</LinkAcao>}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {vm.grauLevels.length === 0 ? <span style={{ fontSize: 12, color: 'var(--n-text-3)' }}>Escolaridade não informada.</span>
          : vm.grauLevels.map((l) => (
            <span key={l.label} style={{ fontSize: 12, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, padding: '3px 11px', borderRadius: 20 }}>{l.label}</span>
          ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Formação acadêmica · cadastro RH</div>
      {vm.cursos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {vm.cursos.map((c, i) => {
            const cor = formCor(c.quando, i)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: `color-mix(in srgb, ${cor} 11%, var(--n-card-2))`, borderLeft: `4px solid ${cor}`, borderRadius: 10, padding: '9px 12px' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-text)', minWidth: 0 }}>{c.nome}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cor, flex: 'none' }}>{c.quando}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)', background: 'var(--n-card-2)', borderRadius: 10, padding: '10px 12px' }}>Sem cursos informados no cadastro.</div>
      )}
      {editando && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--n-border-2)' }}>
          <FormacaoEditor nexusUserId={vm.nexusUserId ?? vm.id} level={vm.grau} detail={vm.eduDetail} />
          <TreinamentosEditor nexusUserId={vm.nexusUserId ?? vm.id} cursos={vm.treinoCursos} certs={vm.treinoCerts} />
        </div>
      )}
    </Cartao>
  )
}

/* ⚠️ Escuta de rádio NÃO entra no score, e o cartão diz. Enquanto carrega, não desenha. */
export function RadioCartao({ m, periodo }: { m: EmployeeMetrics | null; periodo: string }) {
  const r = m?.radio
  if (!r) return null
  const nada = r.horas === 0 && r.sessoes === 0
  return (
    <Cartao titulo="Rádio Itamarathy" Icone={Radio} sub={periodo}>
      {nada ? <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Sem escuta no período.</div> : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span className="cnum" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1.2px', color: 'var(--n-blue)' }}>{num(r.horas)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-text-2)' }}>horas ouvidas</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 2 }}>
            {num(r.sessoes)} {r.sessoes === 1 ? 'sessão' : 'sessões'}{r.ultimaDay && <> · última em {r.ultimaDay.split('-').reverse().join('/')}</>}
          </div>
        </>
      )}
      <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--n-border-2)' }}>
        Escuta é contexto, não desempenho — <b>não entra no score</b>.
      </div>
    </Cartao>
  )
}

const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)
const br = (iso: string) => iso.split('-').reverse().join('/')

/* "Ela parou" ou "a FONTE dela parou"? O que informa é o par de datas. */
export function UltimaAtividade({ m }: { m: EmployeeMetrics | null }) {
  const linhas = m?.ultimaAtividade
  if (!linhas?.length) return null
  const com = linhas.filter((l) => l.dela).sort((a, b) => (b.dela ?? '').localeCompare(a.dela ?? ''))
  const sem = linhas.filter((l) => !l.dela).map((l) => l.fonte)
  if (!com.length) return null
  return (
    <Cartao titulo="Última atividade por fonte" Icone={Clock3} corIcone="var(--n-orange)" sub="Retrato de sempre · não acompanha o filtro">
      {com.map((l) => {
        /* ⚠️ "Parada" = a fonte seguiu por mais de 30 dias depois da última dela. */
        const atraso = l.dela && l.fonteAte ? diasEntre(l.dela, l.fonteAte) : 0
        const parada = atraso > 30
        return (
          <div key={l.fonte} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--n-border-2)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--n-text)', fontWeight: 600 }}>{l.fonte}</div>
              {parada && <div style={{ fontSize: 10.5, color: 'var(--n-red)', marginTop: 1 }}>a fonte seguiu até {br(l.fonteAte!)} · {atraso} dias sem ela</div>}
            </div>
            <span className="cnum" style={{ fontSize: 11.5, fontWeight: 700, flex: 'none', padding: '2px 8px', borderRadius: 6, color: parada ? 'var(--n-red)' : 'var(--n-text-2)', background: parada ? 'var(--n-red-soft)' : 'var(--n-card-2)' }}>{br(l.dela!)}</span>
          </div>
        )
      })}
      {sem.length > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', paddingTop: 9, borderTop: '1px solid var(--n-border-2)', lineHeight: 1.5 }}>Nunca registrou em: {sem.join(' · ')}.</div>
      )}
    </Cartao>
  )
}
