'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Truck, AlertTriangle, Info } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'
import { useEntregas, type PessoaEntregas, type EntregasMetrics } from '@/lib/ui/entregas-period'
import Avatar from '../Avatar'
import { ConclusoesPorDia } from './ConclusoesPorDia'

/* ============================================================
   A ÁREA DO SETOR ENTREGAS — a mensageria, no espírito do Relatório Geral da
   Gerência, que é a tela que o dono usa como referência.

   QUEM LÊ: a Diretoria e a chefia do setor (que mora no Legal), decidindo se a
   entrega está de pé e como está cada um dos dois mensageiros.

   ⚠️⚠️ AS TRÊS COISAS QUE ESTA TELA FAZ DIFERENTE DE UM PAINEL COMUM, e cada
   uma nasceu de uma medição de 09/09/2026:

   1. **Zero com data ao lado.** O Gilberto tem 14.936 serviços no espelho e o
      último em 24/02/2026. Em qualquer janela recente ele marca zero — e zero,
      aqui, se lê como "não trabalhou". A tela nunca mostra o zero sozinho:
      mostra "sem registro desde …" e o quanto faz. Nenhum sistema da casa
      registra afastamento (o Nexus só tem ativo/inativo), então a tela diz o
      que sabe e não inventa o motivo.

   2. **A jornada diz quanto dela é TETO.** A conta é a mesma do Relatório
      Geral, mas quando não há saída do ponto nem fim de saída registrado ela
      cai no `ended_at` — que também recebe o fecho tardio — e para no teto de
      16 h. Em agosto/2026 são 59,2 h das 176,3 h do Elton: um terço. Um número
      com um terço de teto, exibido inteiro, é jornada cheia aos olhos de quem
      lê.

   3. **O que a fonte não cobre está escrito, com a data medida.** Serviço vem
      desde 2001; km, saída e jornada só desde que o app passou a registrar. Sem
      isso, o filtro de Ano mostra "0 km" e parece defeito.
   ============================================================ */

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const dataLonga = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
const mesAno = (c: string | null) => (c ? `${MES[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}` : '—')
const num = (v: number) => v.toLocaleString('pt-BR')
const horas = (min: number) => (min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 20,
}

/* ── Um cartão de número ─────────────────────────────────────────────────── */
/* ⚠️⚠️ `valor === null` imprime "—", nunca 0. É a regra da casa no componente,
   e não em cada chamada: um cartão novo que esquecer a distinção passaria a
   afirmar "zero medido" sobre uma janela que a fonte não cobre — que foi
   exatamente o defeito encontrado pelo crítico em 09/09/2026 nos cartões de
   Jornada e Saídas, sobre junho/2026. */
function Kpi({ label, valor, unidade, cor, nota, atencao }: {
  label: string; valor: string | null; unidade?: string; cor?: string; nota?: string; atencao?: boolean
}) {
  const vazio = valor === null
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span className="cnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: vazio ? 'var(--text-mute)' : cor ?? 'var(--text)' }}>{vazio ? '—' : valor}</span>
        {unidade && !vazio ? <span style={{ fontSize: 12, color: 'var(--text-mute)', fontWeight: 600 }}>{unidade}</span> : null}
      </div>
      {nota ? (
        <div style={{ fontSize: 10.5, color: atencao ? 'var(--warn)' : 'var(--text-mute)', marginTop: 3, lineHeight: 1.45 }}>{nota}</div>
      ) : null}
    </div>
  )
}

/* ── A faixa que diz o que a fonte não cobre ─────────────────────────────── */
function Cobertura({ m }: { m: EntregasMetrics }) {
  const c = m.cobertura
  return (
    <div style={{
      display: 'flex', gap: 9, alignItems: 'flex-start', background: 'var(--surface-2)',
      border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)',
      padding: '10px 14px', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55,
    }}>
      <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <span>
        <strong>As janelas da fonte são desiguais, e isso muda o que cada filtro mostra.</strong>{' '}
        {/* ⚠️ O "2001" era CRAVADO aqui, com a condição olhando outro valor. A rota
            mede `min(day)`; o texto só repete o que ela disser. */}
        Serviço concluído existe no espelho desde{' '}
        <strong>{c.servicosDesde ? c.servicosDesde.slice(0, 4) : '—'}</strong> (veio do import do
        Access);{' '}
        {c.kmDesde
          ? <>km e jornada só a partir de <strong>{dataLonga(c.kmDesde)}</strong>, quando o app passou a registrar a saída</>
          : <>km e jornada ainda não têm um único dia com valor</>}
        {c.saidasDesde && c.saidasDesde !== c.kmDesde ? <> · saídas desde <strong>{dataLonga(c.saidasDesde)}</strong></> : null}.
        Num período anterior a isso, o zero é falta de registro — não é dia sem rodar.
      </span>
    </div>
  )
}

/* ── A linha de uma pessoa ───────────────────────────────────────────────── */
function LinhaPessoa({ p, competencia, appFora }: { p: PessoaEntregas; competencia: string; appFora: boolean }) {
  const router = useRouter()
  /* ⚠️⚠️ A DECISÃO CENTRAL DESTA TELA. Quem tem história na fonte e parou antes
     da janela não recebe uma fileira de zeros: recebe "—" e a data. Zero é uma
     afirmação sobre a pessoa; "—" com data é uma afirmação sobre o dado. */
  const mudo = p.fontePara
  const semFonte = !p.naFonte

  /* ⚠️⚠️ Km e Saídas só existem desde que o app mede. Numa janela anterior a
     isso a célula é "—", não 0: em 01/03–31/03 a linha do Elton lia
     `152 · 0 · 0 · 0`, e os três zeros eram sobre colunas que não existiam.
     Achado do crítico, 09/09/2026. */
  const cols: { label: string; v: number | null; destaque?: boolean }[] = [
    { label: 'Serviços', v: p.servicos, destaque: true },
    { label: 'Saídas', v: appFora ? null : p.saidas },
    { label: 'Km', v: appFora ? null : p.km },
    { label: 'Viagens', v: p.viagens },
  ]

  return (
    <div
      className="tc-row"
      onClick={() => router.push(`/funcionarios/${p.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) repeat(4, 78px) 96px',
        alignItems: 'center', gap: 10, padding: '11px 6px',
        borderBottom: '1px solid var(--border-soft)', cursor: 'pointer',
        opacity: p.ativo ? 1 : 0.72,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.nome}
            {!p.ativo ? <span style={{ fontSize: 10.5, color: 'var(--text-mute)', fontWeight: 500 }}> · desligado</span> : null}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.cargo}
            {p.jornadaMin > 0 ? <> · {horas(p.jornadaMin)} h de jornada</> : null}
            {p.diasComRegistro > 0 ? <> · {p.diasComRegistro} {p.diasComRegistro === 1 ? 'dia' : 'dias'} com registro</> : null}
          </div>
        </div>
      </div>

      {cols.map((c) => (
        <div key={c.label} className="cnum" style={{
          fontSize: 13.5, fontWeight: c.destaque ? 800 : 600, textAlign: 'right',
          color: mudo || semFonte || c.v === null || c.v === 0 ? 'var(--text-mute)' : c.destaque ? 'var(--text)' : 'var(--text-dim)',
        }}>
          {mudo || semFonte || c.v === null ? '—' : num(c.v)}
        </div>
      ))}

      {/* A nota do mês — mensal por natureza, não obedece ao filtro. */}
      <div style={{ textAlign: 'right' }}>
        {p.pontos != null ? (
          <>
            <div className="cnum" style={{ fontSize: 15, fontWeight: 800, color: p.pontos < 0 ? 'var(--danger)' : 'var(--text)' }}>
              {num(p.pontos)}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-mute)' }}>
              {p.pontosOrigem === 'informado' ? 'informado' : p.pontosOrigem === 'previa' ? 'prévia' : 'gravado'}
            </div>
          </>
        ) : (
          <>
            {/* ⚠️ O "—" diz o MOTIVO. "Sem pontuação" sozinho se lê como
                "não pontuou", que é uma afirmação sobre a pessoa. */}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mute)' }} title={p.semNota ?? undefined}>—</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-mute)' }}>
              {p.semNota ? p.semNota.slice(0, 22) : `sem nota em ${mesAno(competencia)}`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── O aviso de quem a fonte parou de cobrir ─────────────────────────────── */
function FonteParada({ pessoas, fonteAte }: { pessoas: PessoaEntregas[]; fonteAte: string | null }) {
  const parados = pessoas.filter((p) => p.fontePara)
  if (parados.length === 0) return null

  return (
    <div style={{
      ...card, borderColor: 'var(--warn)', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <AlertTriangle size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
          {parados.length === 1 ? 'Uma pessoa deste setor não tem registro nesta janela' : `${parados.length} pessoas deste setor não têm registro nesta janela`}
        </div>
        {parados.map((p) => (
          <div key={p.id} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 4 }}>
            <strong style={{ color: 'var(--text)' }}>{p.nome}</strong> — último registro na Gerência em{' '}
            <strong>{dataLonga(p.ultimoDia!)}</strong>
            {p.diasParado != null ? <> ({num(p.diasParado)} dias atrás)</> : null}, com{' '}
            <strong className="cnum">{num(p.servicosNaVida)}</strong> serviços concluídos ao longo da história.
          </div>
        ))}
        {/* ⚠️⚠️ O parágrafo que impede a leitura errada. Sem ele, "sem registro"
            vira, na cabeça de quem decide, "não está trabalhando". */}
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          O espelho da Gerência está em dia{fonteAte ? <> (a fonte tem dado até <strong>{dataLonga(fonteAte)}</strong> para as outras pessoas)</> : null},
          então isto <strong>não é o sync parado</strong>. O que a casa não sabe dizer é o motivo:
          nenhum sistema registra afastamento — o cadastro do Nexus só tem ativo e inativo, e quem
          está aqui está <strong>ativo</strong>. Este painel decide aumento e intervenção, então ele
          mostra a lacuna em vez de um zero: <strong>ausência de dado não é ausência de trabalho</strong>.
        </div>
      </div>
    </div>
  )
}

/* ── Os registros que a pessoa faz no sistema ────────────────────────────── */
function Escritorio({ m }: { m: EntregasMetrics }) {
  const t = m.totais
  const protocolo = t.protAbertos + t.protAprovados + t.reagendados + t.cancelados + t.datasAlteradas
  const linhas = [
    { label: 'Serviços criados', v: t.servCriados, forte: true },
    { label: 'Protocolos abertos', v: t.protAbertos },
    { label: 'Protocolos aprovados', v: t.protAprovados },
    { label: 'Reagendados', v: t.reagendados },
    { label: 'Cancelados', v: t.cancelados },
    { label: 'Datas alteradas', v: t.datasAlteradas },
  ]
  return (
    <div className="tc-card" style={card}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Registros no sistema</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        O que estas pessoas <strong>lançaram</strong> na Gerência — a outra face da fonte, ao lado
        do que elas executaram.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {linhas.map((l) => (
          <div key={l.label} style={{
            background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px',
            border: l.forte && l.v > 0 ? '1px solid var(--border)' : '1px solid transparent',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{l.label}</div>
            <div className="cnum" style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: l.v === 0 ? 'var(--text-mute)' : 'var(--text)' }}>
              {num(l.v)}
            </div>
          </div>
        ))}
      </div>
      {/* ⚠️⚠️ O RÓTULO SOZINHO ENGANARIA, e isto foi medido: nos últimos 30 dias o
          Elton tem 65 "serviços criados" — e nenhum deles saiu de uma mesa. O campo
          `serv_criados` abriga DOIS caminhos da origem: quem cria pelo escritório
          (`created_by`) e quem cria pelo app, na rua (`created_by_boy_id`). Para o
          mensageiro é sempre o segundo. Chamar isso de "demanda de escritório", como
          a primeira versão desta tela chamava, contaria trabalho de rua como trabalho
          de mesa. */}
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 12, lineHeight: 1.6 }}>
        <strong>Serviço criado pelo mensageiro vem do app, na rua</strong> — a origem guarda os dois
        caminhos (escritório e app) no mesmo campo, e para quem entrega é sempre o app. É trabalho
        de execução, não demanda de mesa.
        {protocolo === 0 ? (
          <> Protocolo, esse sim, ninguém daqui abriu no período: quem entrega não costuma demandar,
          e o bloco fica na tela para que a ausência seja <strong>vista</strong> — no dia em que
          aparecer um número, ele aparece sozinho.</>
        ) : null}
      </div>
    </div>
  )
}

/* ── O que esta tela não mostra, e por quê ───────────────────────────────── */
function ForaDaTela() {
  return (
    <div className="tc-card" style={{ ...card, background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
        O que o Relatório Geral tem e esta tela não — de propósito
      </div>
      {/* ⚠️ Os números abaixo são LITERAIS, medidos uma vez na origem — o
          TalentCare não espelha `protocols` nem o status dos serviços, então não
          há como recalculá-los aqui. Literal sem data envelhece calado (foi o
          caso do "Atualizado há 12 min"), então cada um vem DATADO: quem ler em
          2027 sabe que está lendo uma medição de 2026, não uma afirmação sobre
          hoje. Achado do crítico, 09/09/2026. */}
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
        <div style={{ marginBottom: 7 }}>
          <strong>Protocolos baixados por pessoa.</strong> O campo de autoria da entrega é lixo do
          import do Access: <em>medido em 09/09/2026</em>, dos 27.804 protocolos entregues em
          2026, <strong className="cnum">27.488</strong> saíram no nome de um usuário chamado
          &ldquo;Sistema&rdquo; e o resto está quase todo sem autor. Nenhum dos mensageiros
          aparece uma vez. Creditar entrega a partir daí seria inventar autoria.
        </div>
        <div style={{ marginBottom: 7 }}>
          <strong>Taxa de conclusão em anel.</strong> <em>Medido em 09/09/2026</em>: em toda a base
          da Gerência havia <strong className="cnum">8</strong> serviços pendentes e{' '}
          <strong className="cnum">2</strong> em andamento, todos do mês corrente, contra 56.845
          concluídos — junho, julho e agosto fecharam em 100%. Um anel cravado em 100% é enfeite,
          não medição.
        </div>
        <div>
          <strong>A faixa de acumulado do sistema.</strong> No Relatório Geral ela é honesta porque
          avisa que não obedece ao filtro. Aqui teria dois desvios — nem o período nem o setor —, e
          um total da casa inteira ao lado do nome de duas pessoas é exatamente o número plausível
          que responde outra pergunta.
        </div>
      </div>
    </div>
  )
}

/* ── A página ────────────────────────────────────────────────────────────── */
export default function EntregasPage() {
  const { label } = usePeriod()
  const { m, loading, erro } = useEntregas()

  if (erro) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ ...card, borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Não foi possível ler os dados</div>
          {/* ⚠️ Falha de leitura não vira tela zerada: zero se lê como "não houve trabalho". */}
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {erro} Nada é mostrado aqui enquanto a leitura falhar — uma tela zerada seria lida como
            um setor parado.
          </div>
        </div>
      </div>
    )
  }

  if (loading || !m) {
    return (
      <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Carregando a área de Entregas…</div>
      </div>
    )
  }

  const t = m.totais
  const c = m.cobertura

  /* ⚠️⚠️ AS DUAS JANELAS DA FONTE, aplicadas número a número.
     Serviço tem 25 anos de espelho; km, saída e jornada só existem desde que o
     app passou a registrar. Quando a janela pedida é ANTERIOR a isso, o valor
     não é zero — é inexistente, e a tela mostra "—". Quando ela CRUZA a borda,
     o número é real mas fala de menos dias do que o rótulo sugere, e o cartão
     diz de quantos. */
  const appFora = c.appFora
  const appParcial = !appFora && !!c.kmDesde && m.fromDay < c.kmDesde
  const notaApp = appParcial
    ? `só os ${num(c.appDiasNaJanela)} dias desde ${dataLonga(c.kmDesde!)} — o app não media antes`
    : c.kmDesde ? `medido desde ${dataLonga(c.kmDesde)}` : undefined
  const notaForaApp = c.kmDesde ? `o app só passou a medir em ${dataLonga(c.kmDesde)}` : 'sem um dia com valor no espelho'

  /* ⚠️ `null` = a coluna do teto ainda não existe no banco. Não é "nenhuma hora
     de teto": é "não sabemos", e a tela tem de dizer a diferença. */
  const teto = t.jornadaTetoMin
  const pctTeto = teto != null && t.jornadaMin > 0 ? Math.round((teto / t.jornadaMin) * 100) : null
  /* O que foi MEDIDO entre um início e um fim de verdade. Nos dias que batem o
     teto, `jornadaMin` É o teto, então a subtração é exata. */
  const jornadaMedida = teto != null ? t.jornadaMin - teto : null

  /* ⚠️⚠️ "por saída" cruza DUAS janelas de cobertura e por isso só sai quando a
     janela inteira está dentro do que o app mede. Medido pelo crítico: no
     preset "Ano" o numerador conta 1.336 serviços de jan a set e o denominador
     conta 48 saídas de 55 dias — a tela dizia **27,8 por saída** onde o medido
     é 7,5. É o "59 cursos" outra vez: número plausível respondendo outra
     pergunta. */
  const mediaPorSaida = !appFora && !appParcial && t.saidas > 0 ? t.servicos / t.saidas : null

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>
          Setor · dados da Gerência · {label}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={24} aria-hidden="true" /> {m.setor.nome}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 5, lineHeight: 1.55 }}>
          {t.pessoasComRegistro} de {t.pessoasNaEquipe} {t.pessoasNaEquipe === 1 ? 'pessoa' : 'pessoas'} do
          setor {t.pessoasComRegistro === 1 ? 'teve' : 'tiveram'} registro na janela ·{' '}
          <Link href={`/departamentos/${m.setor.id}`} style={{ color: 'var(--info)' }}>
            relatório completo do setor
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}><Cobertura m={m} /></div>

      {/* ── Os números da janela ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi
          label="Serviços concluídos"
          valor={num(t.servicos)}
          cor="var(--chart-2)"
          nota={
            mediaPorSaida != null
              ? `${mediaPorSaida.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por saída`
              : appFora || appParcial
                ? 'a média por saída não sai nesta janela: serviço tem 25 anos de espelho e saída só existe desde que o app mede'
                : undefined
          }
        />
        <Kpi
          label="Km rodados"
          valor={appFora ? null : num(t.km)}
          unidade="km"
          nota={appFora ? notaForaApp : notaApp}
          atencao={appParcial}
        />
        <Kpi
          label="Saídas"
          valor={appFora ? null : num(t.saidas)}
          nota={appFora ? notaForaApp : appParcial ? notaApp : 'roteiros registrados no app'}
          atencao={appParcial}
        />
        <Kpi
          label="Viagens"
          valor={num(t.viagens)}
          cor="var(--accent)"
          nota="dias em rota marcada como viagem"
        />
        {/* ⚠️⚠️ O NÚMERO GRANDE É O MEDIDO, e o teto vai ao lado.
            Antes o cartão trazia 176,3 h em 26 px e a ressalva em 10,5 px — mas
            "quantas horas o Elton fez" tem duas respostas, 176 e 117, e a que o
            olho pega tinha de ser a medida. O total continua escrito, porque é
            ele que bate com o Relatório Geral da Gerência. */}
        <Kpi
          label="Jornada medida"
          valor={appFora ? null : jornadaMedida != null ? horas(jornadaMedida) : horas(t.jornadaMin)}
          unidade="h"
          nota={
            appFora
              ? notaForaApp
              : teto == null
                ? `total de ${horas(t.jornadaMin)} h — quanto disto é teto de 16 h ainda não é medido (coluna do espelho não criada)`
                : teto > 0
                  ? `⚠ + ${horas(teto)} h de teto de 16 h (${pctTeto}% do total), em dias que ninguém encerrou · o Relatório Geral soma as duas: ${horas(t.jornadaMin)} h`
                  : 'todas entre um início e um fim registrados'
          }
          atencao={teto == null || (teto ?? 0) > 0}
        />
        <Kpi
          label="Com serviço"
          valor={`${t.pessoasComRegistro}`}
          unidade={`de ${t.pessoasNaEquipe}`}
          cor="var(--info)"
          nota="mensageiros com registro na janela"
        />
      </div>

      {/* ── Quem a fonte parou de cobrir ───────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <FonteParada pessoas={m.pessoas} fonteAte={m.cobertura.fonteAte} />
      </div>

      {/* ── A equipe ───────────────────────────────────────────────────── */}
      <div className="tc-card" style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Quem saiu na rua</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
              Serviços, saídas, km e viagens <strong>no período</strong>
              {' '}· a pontuação é de <strong>{mesAno(m.competencia)}</strong>
              {m.pontuacao.parcial
                ? <>, <strong>parcial</strong> (o mês não fechou — falta o que ainda não aconteceu)</>
                : m.pontuacao.previa
                  ? <>, <strong>prévia</strong> (mês fechado, régua ainda não gravada)</>
                  : <> (gravada)</>}
              {' '}— ela é mensal e <strong>não acompanha o filtro</strong>, mas
              <strong> troca de competência</strong> com ele
              {m.pontuacao.motivo ? <> · ⚠ {m.pontuacao.motivo}</> : null}
            </div>
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) repeat(4, 78px) 96px',
          gap: 10, padding: '0 6px 8px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600 }}>Pessoa · cargo</div>
          {['Serviços', 'Saídas', 'Km', 'Viagens'].map((l) => (
            <div key={l} style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textAlign: 'right' }}>{l}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, textAlign: 'right' }}>
            {mesAno(m.competencia)}
          </div>
        </div>
        {m.pessoas.map((p) => <LinhaPessoa key={p.id} p={p} competencia={m.competencia} appFora={appFora} />)}
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.55 }}>
          &ldquo;—&rdquo; não é zero: é a fonte sem dado para aquela pessoa nesta janela. O zero
          aparece como <span className="cnum">0</span> e quer dizer que houve dia medido sem
          resultado.
        </div>
      </div>

      {/* ── A série ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}><ConclusoesPorDia m={m} /></div>

      {/* ── Escritório + o que ficou de fora ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Escritorio m={m} />
        <ForaDaTela />
      </div>
    </div>
  )
}
