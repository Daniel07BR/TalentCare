'use client'
import { Activity, LifeBuoy, GraduationCap, Truck, MessagesSquare, Landmark, MessageCircle, MessageSquareText, ClipboardList, type LucideIcon } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { Sistema } from '@/lib/pessoa-sistema-tipos'
import { usePainelDaPessoa } from '../../../PainelDaPessoa'
import { Estrelas } from '../../../whatsapp/AvaliacaoClientes'
import { Cartao, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import s from '../../../_visao/visao.module.css'
import { num } from './derivar'
import f from './ficha.module.css'

/* ============================================================
   O QUE OS SISTEMAS REGISTRARAM — UMA ilustração por número (14/09/2026).

   ⚠️⚠️ Pedido do dono, sobre a primeira prévia: o mesmo dado aparecia em DOIS
   formatos — o total com as partes em pílulas, as barras "Atividade por
   sistema" e, embaixo, os cartões. Ficaram só os cartões (os mais
   detalhados), e só dos sistemas COM registro no período; o total de
   concluídas já é o primeiro azulejo do topo.

   ⚠️ Cada sistema com um desenho PRÓPRIO, escolhido pela pergunta que o número
   responde — não uma fileira de cartões iguais.

   ⚠️ E CADA CARTÃO ABRE O RESUMO (pedido do dono, 2ª rodada): o clique abre o
   painel da pessoa naquele sistema (`PainelDaPessoa`), o mesmo dos resumos do
   setor — a lista do que ela fez, dia a dia ou item a item.
   ============================================================ */

function Titulo({ nome, sub, Icone, tom }: { nome: string; sub?: string; Icone: LucideIcon; tom: Tom }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={16} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)' }}>{nome}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{sub}</div>}
      </div>
    </div>
  )
}

/** O cartão de um sistema. Com `onClick` vira botão e mostra "ver resumo ›". */
function Bloco({ children, fundo, onClick, dica }: { children: React.ReactNode; fundo?: string; onClick?: () => void; dica?: string }) {
  const Raiz = onClick ? 'button' : 'div'
  return (
    <Raiz type={onClick ? 'button' : undefined} onClick={onClick} title={dica} className={onClick ? s.clicavel : undefined}
      style={{ position: 'relative', background: fundo ?? 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 14, padding: '16px 16px 26px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {children}
      {onClick && <span className={s.verQuem} aria-hidden="true">ver resumo ›</span>}
    </Raiz>
  )
}

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: 'var(--n-text-2)', lineHeight: 1.35 }}>{children}</div>
)
const Grande = ({ children, cor, tam = 22 }: { children: React.ReactNode; cor?: string; tam?: number }) => (
  <div className="cnum" style={{ fontSize: tam, fontWeight: 800, letterSpacing: '-.6px', lineHeight: 1.1, color: cor ?? 'var(--n-text)' }}>{children}</div>
)
const Nota = ({ children }: { children: React.ReactNode }) => (
  /* `data-nota`: a folha A4 esconde estas explicações para caber numa página. */
  <div data-nota style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 'auto', paddingTop: 10, lineHeight: 1.45 }}>{children}</div>
)

/** Anel de fração, com o percentual no meio. */
function Anel({ fracao, tom, tam = 104 }: { fracao: number; tom: Tom; tam?: number }) {
  const r = (tam - 14) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, fracao))
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={`${Math.round(p * 100)}%`} style={{ flex: 'none' }}>
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={suave(tom)} strokeWidth={12} />
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={forte(tom)} strokeWidth={12} strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: Math.round(tam * 0.19), fontWeight: 800, fill: 'var(--n-text)' }}>{Math.round(p * 100)}%</text>
    </svg>
  )
}

/** Barras horizontais, cada uma com a cor e o valor na ponta. */
function Barras({ linhas }: { linhas: { rot: string; n: number; tom: Tom }[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.n))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {linhas.map((l) => (
        <div key={l.rot}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <Rotulo>{l.rot}</Rotulo>
            <b className="cnum" style={{ fontSize: 13, color: forte(l.tom) }}>{num(l.n)}</b>
          </div>
          <div style={{ height: 9, borderRadius: 20, background: 'var(--n-card-2)', overflow: 'hidden' }}>
            <div className="cbar" style={{ height: '100%', width: `${(l.n / max) * 100}%`, minWidth: l.n > 0 ? 6 : 0, background: forte(l.tom), borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Colunas verticais lado a lado. */
function Colunas({ colunas, alto = 92 }: { colunas: { rot: string; n: number; tom: Tom }[]; alto?: number }) {
  const max = Math.max(1, ...colunas.map((c) => c.n))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))`, gap: 12, alignItems: 'end' }}>
      {colunas.map((c) => (
        <div key={c.rot} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <b className="cnum" style={{ fontSize: 15, color: forte(c.tom) }}>{num(c.n)}</b>
          <div style={{ width: '100%', maxWidth: 44, height: alto, display: 'flex', alignItems: 'flex-end', background: 'var(--n-card-2)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: `${(c.n / max) * 100}%`, minHeight: c.n > 0 ? 4 : 0, background: forte(c.tom), borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--n-text-2)', textAlign: 'center', lineHeight: 1.25 }}>{c.rot}</div>
        </div>
      ))}
    </div>
  )
}

/** Barra 100% com legenda — "de onde vem o todo". */
function Empilhada({ partes }: { partes: { rot: string; n: number; tom: Tom }[] }) {
  const total = partes.reduce((a, p) => a + p.n, 0) || 1
  const vis = partes.filter((p) => p.n > 0)
  return (
    <>
      <div style={{ display: 'flex', height: 12, borderRadius: 20, overflow: 'hidden', gap: 2 }}>
        {vis.map((p) => <div key={p.rot} title={`${p.rot}: ${num(p.n)}`} style={{ width: `${(p.n / total) * 100}%`, background: forte(p.tom) }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
        {vis.map((p) => (
          <div key={p.rot} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: forte(p.tom) }} />
            <span style={{ fontSize: 11, color: 'var(--n-text-2)' }}>{p.rot}</span>
            <b className="cnum" style={{ fontSize: 12, color: 'var(--n-text)' }}>{num(p.n)}</b>
          </div>
        ))}
      </div>
    </>
  )
}

const nota1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function Sistemas({ m, periodo, pessoaId, impressao = false }: {
  m: EmployeeMetrics | null; periodo: string; pessoaId: string
  /** Modo da folha A4 (`FichaImpressa`): cartões sem clique e SEM o cartão do
   *  Chat Interno — decisão do dono, a folha não leva mensagens. Os CHAMADOS
   *  continuam na folha: mudaram de casa (Chat → Fluxo) em 16/09/2026, e é o
   *  cartão do Fluxo que os leva. */
  impressao?: boolean
}) {
  const abrirPainel = usePainelDaPessoa()
  if (!m) {
    return (
      <Cartao titulo="O que os sistemas registraram" Icone={Activity} sub={`Por sistema · ${periodo}`}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)' }}>Carregando o período…</div>
      </Cartao>
    )
  }
  const abrir = (sis: Sistema) => (impressao ? undefined : () => abrirPainel(sis, pessoaId))
  const { whatsapp: wpp, helpdesk: hd, classroom: cr, gerencia: gr, chat: ch, fluxo: fx, cide, consultoria: co } = m
  const blocos: { chave: string; no: React.ReactNode }[] = []
  const sem: string[] = []
  const add = (tem: boolean, nome: string, chave: string, no: () => React.ReactNode) => {
    if (tem) blocos.push({ chave, no: no() }); else sem.push(nome)
  }

  add(wpp.has && wpp.abertos + wpp.finalizados > 0, 'WhatsApp', 'wpp', () => {
    /* ⚠️⚠️ A NOTA DO CLIENTE (pedido do dono, 14/09/2026). Três estados, e só um
       deles é nota: `verificados == null` = o Painel ainda não conferiu os dias
       (nada se afirma); conferido e sem avaliação = "sem nota no período"; e a
       média SEMPRE com quantas notas a formam — 65 de 69 notas da casa são 5,
       então "5,0" sozinho diz pouco. */
    const conferido = wpp.verificados != null
    const media = wpp.avaliados && wpp.notaSum != null ? wpp.notaSum / wpp.avaliados : null
    return (
      <Bloco onClick={abrir('whatsapp')} dica="Ver os atendimentos dia a dia">
        <Titulo nome="WhatsApp" sub="atendimentos" Icone={MessageCircle} tom="whats" />
        <div style={{ display: 'flex', alignItems: 'center', gap: impressao ? 10 : 16, flexWrap: 'wrap' }}>
          <Anel fracao={wpp.abertos ? wpp.finalizados / wpp.abertos : 0} tom="whats" tam={impressao ? 70 : 104} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div><Grande cor="var(--n-whats)">{num(wpp.finalizados)}</Grande><Rotulo>finalizados de {num(wpp.abertos)} abertos</Rotulo></div>
            {/* ⚠️ Fora da folha (pedido do dono, 17/09/2026): o tempo médio por
                atendimento não entra no papel. */}
            {!impressao && <div><Grande tam={17}>{wpp.tempoMedio}</Grande><Rotulo>tempo médio por atendimento</Rotulo></div>}
          </div>
        </div>
        {/* ⚠️⚠️ ESTA CAIXA VAI NO PAPEL SEMPRE, inclusive quando NÃO há nota
            (correção do dono, 17/09/2026, no mesmo dia em que tentei cortá-la
            para ganhar espaço). "Pediu avaliação em 0 de 57 conferidos" não é
            ressalva: é o dado. Quem nunca pediu a avaliação do cliente tem de
            aparecer pedindo zero — esconder isso apaga a diferença entre quem
            pediu e ninguém respondeu e quem nunca pediu. */}
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--n-amber-soft)' }}>
          {!conferido ? (
            <Rotulo>Avaliação do cliente ainda não conferida neste período.</Rotulo>
          ) : media != null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Estrelas media={media} tamanho={15} />
                <Grande tam={18}>{nota1(media)}</Grande>
                <span style={{ fontSize: 11, color: 'var(--n-text-2)' }}>nota média · {wpp.avaliados} {wpp.avaliados === 1 ? 'nota' : 'notas'}</span>
              </div>
              {wpp.pedidos != null && <Rotulo>pediu avaliação em {num(wpp.pedidos)} de {num(wpp.verificados!)} atendimentos conferidos</Rotulo>}
            </>
          ) : (
            <Rotulo>Sem nota do cliente no período{wpp.pedidos != null ? ` · pediu avaliação em ${num(wpp.pedidos)} de ${num(wpp.verificados!)} conferidos` : ''}.</Rotulo>
          )}
        </div>
      </Bloco>
    )
  })

  add(hd.has && hd.opened + hd.resolved > 0, 'HelpDesk', 'hd', () => (
    <Bloco onClick={abrir('helpdesk')} dica="Ver os chamados do HelpDesk">
      <Titulo nome="HelpDesk" sub="chamados" Icone={LifeBuoy} tom="blue" />
      <Barras linhas={[{ rot: 'Abertos por ela', n: hd.opened, tom: 'blue' }, { rot: hd.formalized > 0 ? `Resolvidos · ${hd.formalized} formalizados` : 'Resolvidos por ela', n: hd.resolved, tom: 'green' }]} />
      <div style={{ marginTop: 12 }}><Grande tam={17}>{hd.tempoMedio}</Grande><Rotulo>tempo médio de resolução</Rotulo></div>
      {/* ⚠️ Sem anel: quem abre é a casa toda e quem resolve é o T.I. */}
      <Nota>Sem taxa de resolução: abrir e resolver não são a mesma fila.</Nota>
    </Bloco>
  ))

  add(cr.courses + cr.created + cr.videos > 0, 'ClassRoom', 'cr', () => (
    <Bloco onClick={abrir('classroom')} dica="Ver os cursos e vídeos">
      <Titulo nome="ClassRoom" sub="aprender e ensinar" Icone={GraduationCap} tom="green" />
      <Colunas alto={impressao ? 54 : 92} colunas={[
        { rot: 'Vídeos assistidos', n: cr.videos, tom: 'blue' },
        { rot: 'Cursos concluídos', n: cr.courses, tom: 'green' },
        { rot: 'Cursos criados', n: cr.created, tom: 'purple' },
      ]} />
      {cr.created > 0 && <Nota>Criar curso vale mais que concluir: ensinar alguém conta como colaboração.</Nota>}
    </Bloco>
  ))

  add(gr.hasSaida, 'Gerência na rua', 'grs', () => (
    <Bloco onClick={abrir('gerencia')} dica="Ver os serviços e saídas" fundo="linear-gradient(160deg, var(--n-orange-soft), var(--n-card) 60%)">
      <Titulo nome="Gerência · na rua" sub="saídas externas" Icone={Truck} tom="orange" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <Grande cor="var(--n-orange)" tam={38}>{num(gr.km)}</Grande><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-2)' }}>km rodados</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--n-border)' }}>
        <div><Grande tam={18}>{num(gr.servicos)}</Grande><Rotulo>serviços entregues</Rotulo></div>
        <div><Grande tam={18}>{num(gr.saidas)}</Grande><Rotulo>saídas</Rotulo></div>
        <div><Grande tam={18}>{num(Math.round(gr.jornadaMin / 60))}h</Grande><Rotulo>jornada</Rotulo></div>
        {gr.viagens > 0 && <div><Grande tam={18} cor="var(--n-blue)">{num(gr.viagens)}</Grande><Rotulo>viagens fora do estado</Rotulo></div>}
      </div>
    </Bloco>
  ))

  add(gr.hasEscritorio, 'Gerência escritório', 'gre', () => (
    <Bloco onClick={abrir('gerencia')} dica="Ver protocolos e serviços criados">
      <Titulo nome="Gerência · escritório" sub="demanda do escritório" Icone={Truck} tom="orange" />
      <Barras linhas={[
        { rot: 'Serviços criados', n: gr.servCriados, tom: 'orange' },
        { rot: 'Protocolos abertos', n: gr.protAbertos, tom: 'blue' },
        { rot: 'Aprovações', n: gr.protAprovados, tom: 'green' },
        ...(gr.datasAlteradas > 0 ? [{ rot: 'Datas alteradas', n: gr.datasAlteradas, tom: 'amber' as Tom }] : []),
      ]} />
      {(gr.reagendados > 0 || gr.cancelados > 0) && <Nota>{gr.reagendados} reagendados · {gr.cancelados} cancelados</Nota>}
    </Bloco>
  ))

  /* ⚠️⚠️ O CARTÃO DOS CHAMADOS É DO FLUXO desde 17/09/2026. Ele era do Chat
     Interno — os chamados mudaram de casa em 16/09 com a história inteira, e o
     cartão foi junto. O do Chat, abaixo, ficou só com a conversa. */
  add(fx.hasChamado || fx.hasTarefa, 'Fluxo', 'fluxo', () => (
    <Bloco onClick={abrir('fluxo')} dica="Ver os chamados e as tarefas dia a dia">
      <Titulo nome="Fluxo" sub="chamados entre setores" Icone={ClipboardList} tom="purple" />
      {/* ⚠️ Na folha A4 o cartão é estreito (todos os sistemas numa fileira) e três
          caixas lado a lado sobrepunham "Atendeu"/"Concluiu" — pedido do dono,
          14/09/2026: um abaixo do outro, número à esquerda e o rótulo ao lado. */}
      <div style={impressao
        ? { display: 'flex', flexDirection: 'column', gap: 6 }
        : { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {([['Abriu', fx.chamadosAbertos, 'purple', 'pedidos que fez'], ['Atendeu', fx.chamadosAssumidos, 'blue', 'que assumiu'], ['Concluiu', fx.chamadosConcluidos, 'green', 'que finalizou']] as [string, number, Tom, string][]).map(([rot, n, t, sub]) => (
          impressao ? (
            <div key={rot} style={{ display: 'flex', alignItems: 'center', gap: 10, background: suave(t), borderRadius: 10, padding: '6px 10px', minWidth: 0 }}>
              <span style={{ minWidth: 30, textAlign: 'right' }}><Grande cor={forte(t)} tam={20}>{num(n)}</Grande></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-text)', lineHeight: 1.2 }}>{rot}</div>
                <div style={{ fontSize: 10, color: 'var(--n-text-2)', lineHeight: 1.2 }}>{sub}</div>
              </div>
            </div>
          ) : (
            <div key={rot} style={{ background: suave(t), borderRadius: 10, padding: '9px 10px', minWidth: 0 }}>
              <Grande cor={forte(t)} tam={22}>{num(n)}</Grande>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--n-text)' }}>{rot}</div>
              <div style={{ fontSize: 10, color: 'var(--n-text-2)' }}>{sub}</div>
            </div>
          )
        ))}
      </div>
      {fx.chamadosConcluidos > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--n-text-2)', marginTop: 8 }}>
          Tempo médio até concluir: <b style={{ color: 'var(--n-text)' }}>{fx.tempoMedio}</b> <span style={{ color: 'var(--n-text-3)' }}>· só expediente</span>
        </div>
      )}
      {/* ⚠️⚠️ A TAREFA DELEGADA aparece SEPARADA, e não somada aos chamados: ela
          é trabalho passado dentro do próprio setor, e somá-la faria a pessoa
          parecer ter pedido a outros setores o que nunca saiu de casa. */}
      {fx.hasTarefa && (
        <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed var(--n-border)', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {([['delegou', fx.tarefasAbertas], ['recebeu', fx.tarefasAssumidas], ['concluiu', fx.tarefasConcluidas]] as [string, number][])
            .filter(([, n]) => n > 0)
            .map(([rot, n]) => (
              <span key={rot} style={{ fontSize: 11, color: 'var(--n-text-2)' }}>
                <b style={{ color: 'var(--n-text)' }}>{num(n)}</b> {rot}
              </span>
            ))}
          <span style={{ fontSize: 10.5, color: 'var(--n-text-3)', width: '100%' }}>tarefas delegadas no próprio setor</span>
        </div>
      )}
    </Bloco>
  ))

  /* ⚠️ O Chat ficou com a CONVERSA. Ele fica FORA da folha A4 (decisão do dono):
     mensagem é vitrine, não entra no score e não vai para o papel. */
  add(ch.hasConversa && !impressao, 'Chat Interno', 'chat', () => (
    <Bloco onClick={abrir('chat')} dica="Ver as mensagens dia a dia">
      <Titulo nome="Chat Interno" sub="conversa" Icone={MessageSquareText} tom="pink" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <Grande cor="var(--n-purple)" tam={18}>{num(ch.mensagens)}</Grande>
        <span style={{ fontSize: 11.5, color: 'var(--n-text-2)' }}>mensagens · <b>não entram no score</b></span>
      </div>
      <Empilhada partes={[
        { rot: 'Em canais', n: ch.msgCanais, tom: 'purple' },
        { rot: 'Diretas', n: ch.msgDiretas, tom: 'pink' },
        { rot: 'Em chamados', n: ch.msgChamados, tom: 'blue' },
      ]} />
      <Nota>Só a contagem das mensagens chega aqui — o texto nunca sai do chat.</Nota>
    </Bloco>
  ))

  add(cide.has && cide.atividades > 0, 'CIDE', 'cide', () => (
    <Bloco onClick={abrir('cide')} dica="Ver as empresas atendidas" fundo="linear-gradient(160deg, var(--n-red-soft), var(--n-card) 65%)">
      <Titulo nome="CIDE" sub="cadastro de empresas" Icone={Landmark} tom="red" />
      <div style={{ margin: 'auto 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Grande cor="var(--n-red)" tam={44}>{num(cide.atividades)}</Grande>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{cide.atividades === 1 ? 'empresa atendida' : 'empresas atendidas'}</span>
      </div>
    </Bloco>
  ))

  add(co.has && co.total > 0, 'Consultoria Plus', 'co', () => (
    <Bloco onClick={abrir('consultoria')} dica="Ver estudos e chamados da Consultoria">
      <Titulo nome="Consultoria Plus" sub={`${num(co.total)} atividades`} Icone={MessagesSquare} tom="purple" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
        {([['Estudos', co.studies, 'purple'], ['Chamados', co.tickets, 'blue'], ['Mensagens', co.messages, 'pink'], ['Comentários', co.comments, 'amber']] as [string, number, Tom][]).map(([rot, n, t]) => (
          <div key={rot} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: forte(t) }} />
            <div><Grande tam={18}>{num(n)}</Grande><Rotulo>{rot}</Rotulo></div>
          </div>
        ))}
      </div>
    </Bloco>
  ))

  return (
    /* ⚠️ Na folha, o subtítulo NÃO repete o período: ele já está na faixa do topo. */
    <Cartao titulo="O que os sistemas registraram" Icone={Activity} sub={impressao ? 'Só os sistemas com registro' : `Só os sistemas com registro · ${periodo} · clique num sistema para o resumo`}>
      {blocos.length === 0 ? (
        /* ⚠️ Silêncio nos sistemas não é inatividade. */
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', background: 'var(--n-card-2)', borderRadius: 10, padding: '12px 14px' }}>
          Nenhum sistema medido registrou atividade desta pessoa no período — o trabalho dela pode não passar por eles.
        </div>
      ) : (
        <div className={f.sistemas}>{blocos.map((b) => <div key={b.chave} style={{ display: 'contents' }}>{b.no}</div>)}</div>
      )}
      {/* ⚠️ Fora da folha (pedido do dono, 17/09/2026): o que não registrou nada não
          ganha linha no papel — o subtítulo já avisa que só vêm os sistemas com
          registro. Na tela ela fica: ali o leitor pode querer saber por que o
          sistema sumiu. */}
      {sem.length > 0 && blocos.length > 0 && !impressao && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10 }}>Sem registro no período: {sem.join(', ')}.</div>
      )}
    </Cartao>
  )
}
