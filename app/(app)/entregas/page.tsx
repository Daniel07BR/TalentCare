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
function Kpi({ label, valor, unidade, cor, nota, atencao }: {
  label: string; valor: string; unidade?: string; cor?: string; nota?: string; atencao?: boolean
}) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span className="cnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: cor ?? 'var(--text)' }}>{valor}</span>
        {unidade ? <span style={{ fontSize: 12, color: 'var(--text-mute)', fontWeight: 600 }}>{unidade}</span> : null}
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
        Serviço concluído existe no espelho desde {c.fonteAte ? '2001' : '—'} (veio do import do
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
function LinhaPessoa({ p, competencia }: { p: PessoaEntregas; competencia: string | null }) {
  const router = useRouter()
  /* ⚠️⚠️ A DECISÃO CENTRAL DESTA TELA. Quem tem história na fonte e parou antes
     da janela não recebe uma fileira de zeros: recebe "—" e a data. Zero é uma
     afirmação sobre a pessoa; "—" com data é uma afirmação sobre o dado. */
  const mudo = p.fontePara
  const semFonte = !p.naFonte

  const cols: { label: string; v: number; destaque?: boolean }[] = [
    { label: 'Serviços', v: p.servicos, destaque: true },
    { label: 'Saídas', v: p.saidas },
    { label: 'Km', v: p.km },
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
          color: mudo || semFonte ? 'var(--text-mute)' : c.v === 0 ? 'var(--text-mute)' : c.destaque ? 'var(--text)' : 'var(--text-dim)',
        }}>
          {mudo || semFonte ? '—' : num(c.v)}
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
              {p.pontosOrigem === 'informado' ? 'informado' : 'pontos'}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mute)' }}>—</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-mute)' }}>
              {competencia ? `sem nota em ${mesAno(competencia)}` : 'régua não rodada'}
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
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
        <div style={{ marginBottom: 7 }}>
          <strong>Protocolos baixados por pessoa.</strong> O campo de autoria da entrega é lixo do
          import do Access: dos protocolos entregues em 2026, <strong className="cnum">27.488</strong>{' '}
          saíram no nome de um usuário chamado &ldquo;Sistema&rdquo; e o resto está quase todo sem
          autor. Nenhum dos mensageiros aparece uma vez. Creditar entrega a partir daí seria
          inventar autoria.
        </div>
        <div style={{ marginBottom: 7 }}>
          <strong>Taxa de conclusão em anel.</strong> Em toda a base da Gerência há{' '}
          <strong className="cnum">8</strong> serviços pendentes e <strong className="cnum">2</strong>{' '}
          em andamento, todos do mês corrente: junho, julho e agosto fecharam em 100%. Um anel
          cravado em 100% é enfeite, não medição.
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
  /* ⚠️ `null` = a coluna do teto ainda não existe no banco. Não é "nenhuma
     hora de teto": é "não sabemos", e a tela tem de dizer a diferença. */
  const teto = t.jornadaTetoMin
  const pctTeto = teto != null && t.jornadaMin > 0 ? Math.round((teto / t.jornadaMin) * 100) : null
  const mediaDia = t.saidas > 0 ? (t.servicos / t.saidas) : null

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
          nota={mediaDia != null ? `${mediaDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por saída` : undefined}
        />
        <Kpi
          label="Km rodados"
          valor={num(t.km)}
          unidade="km"
          nota={m.cobertura.kmDesde ? `só desde ${dataLonga(m.cobertura.kmDesde)}` : 'sem dia com km no espelho'}
        />
        <Kpi label="Saídas" valor={num(t.saidas)} nota="roteiros registrados no app" />
        <Kpi
          label="Viagens"
          valor={num(t.viagens)}
          cor="var(--accent)"
          nota="dias em rota marcada como viagem"
        />
        {/* ⚠️⚠️ A jornada com a fração de teto ESCRITA no próprio cartão. */}
        <Kpi
          label="Jornada"
          valor={horas(t.jornadaMin)}
          unidade="h"
          nota={
            teto == null
              ? 'quanto disto é o teto de 16 h ainda não é medido — a coluna do espelho não foi criada'
              : teto > 0
                ? `⚠ ${horas(teto)} h (${pctTeto}%) são o teto de 16 h — dias em que ninguém encerrou a saída`
                : 'toda medida entre um início e um fim registrados'
          }
          atencao={teto == null || teto > 0}
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
              {m.competencia
                ? <> · a pontuação é de <strong>{mesAno(m.competencia)}</strong>, a última competência
                    gravada — ela é mensal e <strong>não acompanha o filtro</strong></>
                : <> · nenhuma competência foi gravada para este setor ainda</>}
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
        {m.pessoas.map((p) => <LinhaPessoa key={p.id} p={p} competencia={m.competencia} />)}
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
