'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlarmClock, AlertTriangle, ShieldAlert, LogOut, Users2, GraduationCap, FileSpreadsheet, Cake, CalendarClock, UsersRound, UserMinus } from 'lucide-react'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import Avatar from '../../Avatar'
import { PainelPessoas, type PessoaDoPainel } from '../../PainelPessoas'

/* ============================================================
   O TOPO DA PÁGINA — quem responde pelo setor, e o que está aceso.

   ⚠️⚠️ O SCORE e a AVALIAÇÃO saíram daqui (decisão do dono, 03/09/2026): o score
   ainda não foi validado e não vale, e a nota do mês tem o bloco dela mais
   abaixo. Um número grande no topo é lido como o veredito da página — e não
   pode ser o veredito um número que ninguém validou.

   ⚠️ O que ficou é o que se sustenta hoje: rotatividade, atrasos e
   advertências, todos medidos. E a equipe, que é o contexto para ler os três.
   ============================================================ */

const CIN = { display: 'flex', filter: 'grayscale(1)', opacity: 0.9 } as React.CSSProperties

export function Hero({ m }: { m: DeptMetrics }) {
  const router = useRouter()
  /* Qual sinal está aberto (pelo rótulo). ⚠️ Pelo RÓTULO e não pelo objeto: ao
     trocar o filtro de período o `m` é remontado, e uma lista congelada no
     estado mostraria a janela anterior debaixo do título da nova. */
  const [aberto, setAberto] = useState<string | null>(null)
  /* ⚠️ Trocar o filtro fecha o painel — ver o comentário gêmeo no dashboard. */
  useEffect(() => { setAberto(null) }, [m.period, m.fromDay, m.toDay])

  /* ── QUEM ESTÁ ATRÁS DE CADA SINAL ───────────────────────────────────────
     ⚠️⚠️ Sai de `m.pessoas`, que a rota já montou sob a régua de `alcance` —
     não de uma busca nova. É a mesma decisão do painel do dashboard: uma
     segunda origem para "os envolvidos" seria uma segunda régua de conteúdo.
     ⚠️ Corta os zeros: uma lista de "quem se atrasou" com o setor inteiro em
     zero acusaria 20 pessoas para mostrar 3. */
  const base = (p: DeptMetrics['pessoas'][number]): Omit<PessoaDoPainel, 'valor' | 'detalhe'> =>
    ({ id: p.id, nome: p.nome, cargo: p.cargo, setor: m.setor.nome, hasAvatar: p.hasAvatar })
  const pessoasAtraso: PessoaDoPainel[] = m.pessoas
    .filter((p) => p.atrasos > 0)
    .map((p) => ({ ...base(p), valor: p.atrasos, detalhe: p.minutosAtraso ? `${p.minutosAtraso} min somados` : '' }))
    .sort((a, b) => b.valor - a.valor)
  const pessoasAdvert: PessoaDoPainel[] = m.pessoas
    .filter((p) => p.advertencias > 0)
    .map((p) => ({ ...base(p), valor: p.advertencias }))
    .sort((a, b) => b.valor - a.valor)
  /* ⚠️ Inclui quem levou ADVERTÊNCIA de LGPD sem suspensão: mesma natureza
     (medida assinada por vazamento), e deixá-la de fora esconderia gente
     envolvida numa lista que se propõe a mostrar os envolvidos. O cartão conta
     só as suspensões; o painel avisa. */
  /* ⚠️⚠️ A suspensão por ATRASO entrou nesta lista em 10/09/2026, com o
     histórico real do DP. Ela é ato assinado pelo encarregado (6º atraso do
     mês, ou 4º acima de 10 min) — natureza diferente da medida de LGPD, que é
     por vazamento de dado pessoal. Ficam no MESMO cartão porque a pergunta de
     quem lê é "quem foi suspenso neste setor", e um cartão que respondesse só
     metade dela mostraria 0 num mês em que houve suspensão de verdade.
     ⚠️ Mas o `detalhe` de cada linha diz de QUE tipo é cada uma: somar sem
     dizer faria "2 suspensões" que ninguém sabe de quê — e as duas levam a
     conversas diferentes com a pessoa. */
  const pessoasLgpd: PessoaDoPainel[] = m.pessoas
    .map((p) => {
      const sa = p.suspensoesAtraso ?? 0
      const s = p.lgpdSuspensoes ?? 0
      const a = p.lgpdAdvertencias ?? 0
      const partes = [
        sa ? `${sa} suspensão${sa === 1 ? '' : 'es'} por atraso` : '',
        s ? `${s} suspensão${s === 1 ? '' : 'es'} de LGPD` : '',
        a ? `${a} advertência${a === 1 ? '' : 's'} de LGPD` : '',
      ].filter(Boolean)
      return { ...base(p), valor: sa + s + a, detalhe: partes.join(' · ') }
    })
    .filter((p) => p.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const gestores = m.chefia.filter((c) => c.nivel === 'gestor')
  const subs = m.chefia.filter((c) => c.nivel !== 'gestor')
  const d = m.demografia
  const anos = d.tempoCasaMeses != null ? Math.floor(d.tempoCasaMeses / 12) : null
  const meses = d.tempoCasaMeses != null ? d.tempoCasaMeses % 12 : null

  /* ⚠️ A conta do turnover fica no `title` E escrita por extenso quando o
     número é alto: um percentual de rotatividade sem a conta ao lado é um número
     que se discute sem se verificar. */
  const contaTurnover =
    `${m.turnover.saidas12m} ${m.turnover.saidas12m === 1 ? 'saída' : 'saídas'} nos últimos 12 meses`
    + ` ÷ ${m.equipe.ativos + m.turnover.saidas12m} pessoas que passaram pelo setor`
    + ` (${m.equipe.ativos} ativas hoje + ${m.turnover.saidas12m} que saíram) = ${m.turnover.taxa12m}%`

  /* ⚠️ `?? true` aqui, ao contrário do `?? false` dos hooks: uma resposta ANTIGA
     em cache, de antes desta rota devolver a bandeira, traz números que eram
     válidos. O que não pode é a bandeira nova dizer `false` e a tela ignorar. */
  const semPonto = m.assiduidade.janelaComPonto === false
  const motivoPonto = m.assiduidade.motivoSemPonto ?? 'sem dado de ponto nesta janela'

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, marginBottom: 16 }}>
      <div className="hero-setor" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 26, alignItems: 'center' }}>
        {/* ── A CHEFIA: o rosto de quem responde pelo setor ──────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {gestores.length === 0 && subs.length === 0 ? (
            // ⚠️ Setor sem chefia definida não ganha um rosto genérico: ele
            // ganha o aviso, porque é isso que precisa de ação.
            <div style={{ textAlign: 'center', maxWidth: 150 }}>
              <div style={{ width: 74, height: 74, borderRadius: 20, background: 'var(--surface-2)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Users2 size={26} color="var(--text-mute)" />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 9, lineHeight: 1.45 }}>
                {m.setor.pelaDiretoria ? 'Avaliado pela Diretoria' : 'Sem chefia definida'}
              </div>
            </div>
          ) : (
            <>
              {gestores.map((c) => (
                <button key={c.id} onClick={() => router.push(`/funcionarios/${c.id}`)} className="cpop"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', maxWidth: 130 }}>
                  <Avatar id={c.id} hasAvatar={c.hasAvatar} initials={c.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--accent)" size={78} radius={21} />
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 9, lineHeight: 1.25 }}>{c.nome.split(' ').slice(0, 2).join(' ')}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
                    {c.cargo}{c.deOutroSetor && ' · de outro setor'}
                  </div>
                </button>
              ))}
              {/* ⚠️ Sub-encarregados MENORES, de propósito: a hierarquia da tela
                  espelha a hierarquia da avaliação (quem é gestor é avaliado pela
                  Diretoria; o sub, pelo gestor). Do mesmo tamanho, a foto diria
                  que os dois respondem igual. */}
              {subs.map((c, i) => (
                <button key={c.id} onClick={() => router.push(`/funcionarios/${c.id}`)} className="cpop"
                  style={{ animationDelay: `${(i + 1) * 70}ms`, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', maxWidth: 106 }}>
                  <Avatar id={c.id} hasAvatar={c.hasAvatar} initials={c.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-3)" size={54} radius={15} />
                  <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 7, lineHeight: 1.25 }}>{c.nome.split(' ')[0]}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>
                    {c.deOutroSetor ? 'sub · outro setor' : 'sub-encarregado'}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* ── O QUE ESTÁ ACESO + a equipe ─────────────────────────────────── */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, marginBottom: 14 }}>
            {/* ⚠️⚠️ A HEAD RESPONDE AO FILTRO (pedido do dono, 08/09/2026), e por
                isso o número grande é a CONTAGEM de saídas do período, não a
                taxa. A taxa é de 12 meses por necessidade: em "7 dias" ela daria
                **0% para quase todo setor**, e esse zero se lê como "ninguém sai
                daqui" — o oposto do que o cartão existe para mostrar. Contagem é
                honesta em qualquer janela; percentual não é. A taxa continua
                logo abaixo, com a janela dela escrita. */}
            <Sinal
              Icone={LogOut} rotulo="Saídas no período"
              valor={String(m.turnover.saidasNoPeriodo)}
              nota={`${m.turnover.taxa12m}% de rotatividade em 12 meses`}
              dica={`${m.turnover.saidasNoPeriodo} ${m.turnover.saidasNoPeriodo === 1 ? 'pessoa saiu' : 'pessoas saíram'} no intervalo selecionado.\nA TAXA ao lado é de 12 meses e não acompanha o filtro: ${contaTurnover}`}
              cor={m.turnover.saidasNoPeriodo > 0 ? 'var(--danger)' : m.turnover.taxa12m >= 20 ? 'var(--warning)' : 'var(--text-mute)'}
            />
            {/* ⚠️⚠️ "—" e não 0 quando a janela não foi medida. O ponto é a única
                fonte sem cron (entra por import à mão) e parava em 25/06/2026:
                em "Últimos 30 dias" estes dois cartões diziam **0**, em cinza
                tranquilo, sobre um setor que ninguém mediu. Zero se lê como "não
                houve ocorrência" — e é a leitura que inocenta e a que acusa,
                dependendo do cartão, sempre sem base. */}
            {/* ⚠️⚠️ A PLANILHA DO SETOR ENTRA NO RESUMO (pedido do dono,
                04/09/2026), e não só lá embaixo no bloco de fontes. É a fonte
                que o setor mantém à mão e a que ele reconhece como o próprio
                trabalho — enterrá-la entre oito espelhos de sistemas que ele usa
                de passagem é dizer que ela vale o mesmo que as outras. Vale
                mais, para quem lê ESTE relatório. */}
            {m.servicos?.temFonte && (
              <Sinal
                Icone={FileSpreadsheet} rotulo="Serviços concluídos"
                valor={m.servicos.concluidos.toLocaleString('pt-BR')}
                nota={m.servicos.total && m.servicos.total.concluidos > m.servicos.concluidos
                  ? `no período · ${m.servicos.total.concluidos.toLocaleString('pt-BR')} na planilha inteira`
                  : (m.servicos.minutos ? `${Math.round(m.servicos.minutos / 60)} h somadas` : 'no período')}
                dica={m.servicos.cobertura
                  ? `Da planilha do setor, que cobre de ${m.servicos.cobertura.de.split('-').reverse().join('/')} a ${m.servicos.cobertura.ate.split('-').reverse().join('/')}. Fora dessa janela o setor não mediu — não é zero.`
                  : 'Da planilha que o setor envia.'}
                cor="var(--chart-2)"
              />
            )}
            <Sinal
              Icone={AlertTriangle} rotulo="Advertências"
              valor={semPonto ? '—' : String(m.assiduidade.advertencias)}
              nota={semPonto ? motivoPonto : 'no período'}
              dica={semPonto
                ? 'O ponto entra por importação manual e não alcançou esta janela. Zero aqui significaria "não houve advertência", e o que houve foi ninguém medir.'
                : 'Eventos de advertência registrados no ponto, dentro do intervalo selecionado.'}
              cor={!semPonto && m.assiduidade.advertencias > 0 ? 'var(--danger)' : 'var(--text-mute)'}
              aoAbrir={!semPonto && pessoasAdvert.length ? () => setAberto('Advertências') : undefined}
              quantos={pessoasAdvert.length}
            />
            <Sinal
              Icone={AlarmClock} rotulo="Atrasos"
              valor={semPonto ? '—' : String(m.assiduidade.atrasos)}
              nota={semPonto ? motivoPonto : `${m.assiduidade.minutos.toLocaleString('pt-BR')} min somados`}
              dica={semPonto
                ? 'O ponto entra por importação manual e não alcançou esta janela.'
                : `Atrasos NÃO abonados no período. Os abonados (${m.assiduidade.abonados}) são justificados e não punem.`}
              cor={!semPonto && m.assiduidade.atrasos > 0 ? 'var(--warning)' : 'var(--text-mute)'}
              aoAbrir={!semPonto && pessoasAtraso.length ? () => setAberto('Atrasos') : undefined}
              quantos={pessoasAtraso.length}
            />
            {/* ⚠️⚠️ SUSPENSÕES — e ele NÃO é regido por `semPonto`. A medida vem
                do Controle da LGPD do Nexus, não do dump do ponto: numa janela
                que o ponto não alcança, atraso e advertência viram "—" e a
                suspensão continua sendo um fato registrado. Amarrá-la ao ponto
                seria a ausência de uma fonte apagando o dado de outra. */}
            <Sinal
              Icone={ShieldAlert} rotulo="Suspensões"
              /* ⚠️ `?? '—'` e NÃO `?? 0`: resposta velha em cache ou deploy pela
                 metade viraria "0 suspensões", que é a melhor notícia da tela.
                 Mesmo argumento do `?? false` do `janelaComPonto` acima. */
              valor={m.assiduidade.lgpdSuspensoes == null ? '—' : String((m.assiduidade.lgpdSuspensoes ?? 0) + (m.assiduidade.suspensoesAtraso ?? 0))}
              nota={m.assiduidade.lgpdSuspensoes == null
                ? 'não foi possível ler'
                : [
                    m.assiduidade.suspensoesAtraso ? `${m.assiduidade.suspensoesAtraso} por atraso` : '',
                    m.assiduidade.lgpdSuspensoes ? `${m.assiduidade.lgpdSuspensoes} por vazamento (LGPD)` : '',
                    m.assiduidade.lgpdAdvertencias ? `e ${m.assiduidade.lgpdAdvertencias} advertência${m.assiduidade.lgpdAdvertencias === 1 ? '' : 's'} de LGPD` : '',
                  ].filter(Boolean).join(' · ') || 'nenhuma no período'}
              dica="Medidas ASSINADAS, de duas naturezas: suspensão por ATRASO (6º atraso do mês, ou 4º acima de 10 min, registrada pelo encarregado) e as do Controle da LGPD do Nexus (vazamento de dado pessoal). As duas são de natureza diferente da advertência ao lado, que é derivada do 2º atraso do mês. Nenhuma depende do import de ponto."
              cor={((m.assiduidade.lgpdSuspensoes ?? 0) + (m.assiduidade.suspensoesAtraso ?? 0)) > 0 ? 'var(--danger)' : 'var(--text-mute)'}
              /* ⚠️ O selo conta a LISTA, e a lista sai de `m.pessoas` (ativos do
                 setor) enquanto o número sai da rota (que não corta inativo).
                 Quando divergirem, é o número que manda — o selo diz "N na
                 lista", não "N no total". */
              aoAbrir={pessoasLgpd.length ? () => setAberto('Suspensões') : undefined}
              quantos={pessoasLgpd.length}
            />
          </div>

          {/* A equipe — retrato de hoje, o contexto para ler os três acima.
              ⚠️ Alinhada NO MESMO grid dos sinais (pedido do dono): eram quatro
              blocos soltos num `flex`, encostados à esquerda, e a fileira de
              cima já era uma grade — as duas linhas não se olhavam. O ícone é o
              que faz o número ser encontrado antes de ser lido. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, paddingTop: 13, borderTop: '1px solid var(--border-soft)' }}>
            <Dado Icone={Users2} rotulo="Pessoas ativas" valor={String(m.equipe.ativos)} />
            <Dado Icone={Cake} rotulo="Idade média" valor={d.idadeMedia != null ? `${d.idadeMedia} anos` : '—'}
              nota={d.idadesInformadas < m.equipe.ativos ? `${d.idadesInformadas} de ${m.equipe.ativos}` : undefined} />
            <Dado Icone={CalendarClock} rotulo="Tempo de casa" valor={anos != null ? (anos > 0 ? `${anos}a ${meses}m` : `${meses}m`) : '—'} />
            <Dado Icone={UsersRound} rotulo="Mulheres / homens" valor={`${d.generos.F ?? 0} / ${d.generos.M ?? 0}`}
              nota={d.generos['?'] ? `${d.generos['?']} não informado` : undefined} />
            {m.equipe.comNexus < m.equipe.ativos && (
              <Dado Icone={UserMinus} rotulo="Sem conta no Nexus" valor={String(m.equipe.ativos - m.equipe.comNexus)} nota="fora das 8 fontes" />
            )}

          </div>
        </div>
      </div>
      {(() => {
        /* ⚠️ Lido do `m` recém-chegado, pelo rótulo — nunca de uma cópia no
           estado: trocar o filtro remonta o setor, e uma lista congelada
           apareceria debaixo do título da janela nova. */
        const alvo = aberto === 'Atrasos'
          ? { pessoas: pessoasAtraso, cor: 'var(--warning)', nota: 'quantos atrasos cada um teve na janela', sufixo: 'atrasos' }
          : aberto === 'Advertências'
            ? { pessoas: pessoasAdvert, cor: 'var(--danger)', nota: 'quantas advertências cada um teve na janela', sufixo: 'advertências' }
          : aberto === 'Suspensões'
            ? { pessoas: pessoasLgpd, cor: 'var(--danger)', nota: 'medidas assinadas na janela — suspensão por atraso e medidas de LGPD; o cartão conta as suspensões das duas naturezas', sufixo: 'medidas' }
            : null
        if (!alvo?.pessoas.length) return null
        return (
          <PainelPessoas
            titulo={`${aberto} · ${m.setor.nome}`} nota={alvo.nota} periodo={m.label}
            pessoas={alvo.pessoas} cor={alvo.cor} sufixo={alvo.sufixo}
            aoFechar={() => setAberto(null)}
          />
        )
      })()}
    </div>
  )
}

function Sinal({ Icone, rotulo, valor, nota, dica, cor, aoAbrir, quantos }: {
  Icone: typeof AlarmClock; rotulo: string; valor: string; nota: string; dica: string; cor: string
  /** ⚠️ Só quando HÁ lista: cartão que parece botão e não abre nada ensina o
   *  leitor a não clicar em nenhum. Mesma regra do painel do dashboard. */
  aoAbrir?: () => void
  quantos?: number
}) {
  const abre = !!aoAbrir
  return (
    <div
      title={abre ? `${dica}\n\nClique para ver as ${quantos} pessoas.` : dica}
      onClick={aoAbrir}
      role={abre ? 'button' : undefined}
      tabIndex={abre ? 0 : undefined}
      onKeyDown={abre ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir!() } } : undefined}
      style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', borderLeft: `3px solid ${cor}`, cursor: abre ? 'pointer' : 'help' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Icone size={13} color={cor} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rotulo}</span>
        {abre && <span style={{ fontSize: 9, color: 'var(--text-mute)', border: '1px solid var(--border)', borderRadius: 20, padding: '0 5px' }}>{quantos}</span>}
      </div>
      <div className="cnum" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.8px', color: cor }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 1 }}>{nota}</div>
    </div>
  )
}

/** Um dado da equipe. Mesma caixa dos `Sinal` acima, sem a barra colorida — é
 *  contexto, não alerta, e a cor é o que separa os dois. */
function Dado({ Icone, rotulo, valor, nota }: {
  Icone: typeof Users2; rotulo: string; valor: string; nota?: string
}) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Icone size={13} color="var(--text-mute)" />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rotulo}</span>
      </div>
      <div className="cnum" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 1 }}>{nota ?? '\u00A0'}</div>
    </div>
  )
}

/** A escolaridade, no topo — dado fixo, que não depende do filtro. */
export function Escolaridade({ segs, informed, total }: {
  segs: { label: string; count: number; color: string; pct: number }[]
  informed: number; total: number
}) {
  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GraduationCap size={15} color="var(--chart-2)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Escolaridade do setor</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>Retrato de hoje · não acompanha o filtro</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{informed} de {total} informados</span>
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {segs.map((s) => <div key={s.label} className="cbar" title={`${s.label}: ${s.count}`} style={{ width: `${s.pct}%`, background: s.color }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', marginTop: 14 }}>
        {segs.map((s) => (
          <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} /> {s.label} <b style={{ color: 'var(--text)' }}>{s.count}</b>
            {/* ⚠️ O `pct` é fatia ENTRE FORMAÇÕES (multi-contagem: quem tem
                graduação e pós conta duas vezes), NÃO percentual da equipe — e a
                barra empilhada afirma visualmente que é da equipe. */}
            <span style={{ color: 'var(--text-mute)' }}>({s.pct}% das formações)</span>
          </span>
        ))}
      </div>
    </div>
  )
}
