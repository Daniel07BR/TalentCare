'use client'
import { useRouter } from 'next/navigation'
import { AlarmClock, AlertTriangle, LogOut, Users2, GraduationCap, FileSpreadsheet, Upload } from 'lucide-react'
import type { DeptMetrics } from '@/lib/ui/dept-period'
import Avatar from '../../Avatar'

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

export function Hero({ m, podeEnviar }: { m: DeptMetrics; podeEnviar?: boolean }) {
  const router = useRouter()
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
            <Sinal
              Icone={LogOut} rotulo="Rotatividade"
              valor={m.turnover.saidas12m > 0 ? `${m.turnover.taxa12m}%` : '0%'}
              nota="últimos 12 meses"
              dica={contaTurnover}
              cor={m.turnover.taxa12m >= 20 ? 'var(--danger)' : m.turnover.taxa12m > 0 ? 'var(--warning)' : 'var(--text-mute)'}
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
            />
            <Sinal
              Icone={AlarmClock} rotulo="Atrasos"
              valor={semPonto ? '—' : String(m.assiduidade.atrasos)}
              nota={semPonto ? motivoPonto : `${m.assiduidade.minutos.toLocaleString('pt-BR')} min somados`}
              dica={semPonto
                ? 'O ponto entra por importação manual e não alcançou esta janela.'
                : `Atrasos NÃO abonados no período. Os abonados (${m.assiduidade.abonados}) são justificados e não punem.`}
              cor={!semPonto && m.assiduidade.atrasos > 0 ? 'var(--warning)' : 'var(--text-mute)'}
            />
          </div>

          {/* A equipe — retrato de hoje, o contexto para ler os três acima. */}
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', paddingTop: 13, borderTop: '1px solid var(--border-soft)' }}>
            <Dado rotulo="Pessoas ativas" valor={String(m.equipe.ativos)} />
            <Dado rotulo="Idade média" valor={d.idadeMedia != null ? `${d.idadeMedia} anos` : '—'}
              nota={d.idadesInformadas < m.equipe.ativos ? `${d.idadesInformadas} de ${m.equipe.ativos}` : undefined} />
            <Dado rotulo="Tempo de casa" valor={anos != null ? (anos > 0 ? `${anos}a ${meses}m` : `${meses}m`) : '—'} />
            <Dado rotulo="Mulheres / homens" valor={`${d.generos.F ?? 0} / ${d.generos.M ?? 0}`}
              nota={d.generos['?'] ? `${d.generos['?']} não informado` : undefined} />
            {m.equipe.comNexus < m.equipe.ativos && (
              <Dado rotulo="Sem conta no Nexus" valor={String(m.equipe.ativos - m.equipe.comNexus)} nota="fora das 8 fontes" />
            )}

            {/* ⚠️⚠️ O CAMINHO PARA A PLANILHA MORA AQUI (pedido do dono,
                04/09/2026), e não num item de menu lá em cima. O gestor abre o
                relatório do PRÓPRIO setor — é aqui que ele está quando lembra da
                planilha, e é aqui que ele vê o que ela produziu. Um botão de
                menu obriga a lembrar que a tela existe; um botão no resumo
                aparece na hora em que faz sentido.

                ⚠️ Ele também LEVA O SETOR na URL: era um dropdown no alto da
                outra tela, e em 04/09 uma planilha do Legal foi importada para
                Entregas justamente porque ninguém olhou aquele campo. */}
            {podeEnviar && (
              <button
                onClick={() => router.push(`/servicos?setor=${m.setor.id}`)}
                style={{ marginLeft: 'auto', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                title="Enviar a planilha de serviços e definir a régua de pontuação deste setor"
              >
                <Upload size={14} />
                {m.servicos?.temFonte ? 'Atualizar planilha do setor' : 'Enviar planilha do setor'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sinal({ Icone, rotulo, valor, nota, dica, cor }: {
  Icone: typeof AlarmClock; rotulo: string; valor: string; nota: string; dica: string; cor: string
}) {
  return (
    <div title={dica} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', borderLeft: `3px solid ${cor}`, cursor: 'help' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Icone size={13} color={cor} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rotulo}</span>
      </div>
      <div className="cnum" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.8px', color: cor }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 1 }}>{nota}</div>
    </div>
  )
}

function Dado({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{rotulo}</div>
      <div className="cnum" style={{ fontSize: 16, fontWeight: 700 }}>{valor}</div>
      {nota && <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>{nota}</div>}
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
