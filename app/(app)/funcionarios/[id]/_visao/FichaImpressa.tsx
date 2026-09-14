'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { EmployeeVM } from '@/lib/mock/employee'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import Logo from '../../../Logo'
import { comPonto, concluidas, ehSuspensao, formCor, num, rotuloDisciplina } from './derivar'

/* ============================================================
   A FICHA EM A4 — o que o botão "Gerar PDF" imprime (14/09/2026).

   Pedido do dono: "um botão de gerar PDF, padronizado em A4, pense em como
   organizar os dados numa folha, conforme o filtro de período. Não apresente
   dados da rádio nem quantidade de mensagens trocadas no Chat Interno."

   ⚠️⚠️ COMO FUNCIONA: esta folha é montada com os MESMOS dados que a tela já
   carregou (`m`, `vm`, o período do filtro) e fica ESCONDIDA na tela. Na
   impressão, só ela aparece — o navegador salva como PDF. Sem biblioteca nova
   e sem rota nova: o PDF não tem como mostrar um período diferente da tela.
   Ela é um PORTAL direto no <body>, porque a regra de impressão esconde todo
   o resto do <body>; dentro do layout ela sumiria junto.

   ⚠️⚠️ FORA DA FOLHA, POR DECISÃO DO DONO: a Rádio (horas, sessões) e as
   MENSAGENS do Chat Interno (canais, diretas, dentro de chamados). Do Chat
   entram só os CHAMADOS. As "mensagens" da Consultoria Plus são outra coisa
   (troca dentro de um estudo/chamado de consultoria) e entram com o nome dela.
   Quem mexer aqui: não acrescente essas duas por "completude".

   ⚠️ A folha herda as regras da tela: "—" quando não há como afirmar (nunca 0
   por falta de fonte), a ressalva de que advertência é contagem pela regra, e
   o aviso de que números de sistema não são a nota.
   ============================================================ */

const COR = {
  texto: '#0f172a', texto2: '#475569', texto3: '#8a97ad', borda: '#e2e8f0', fundo2: '#f5f7fb',
  azul: '#2563eb', verde: '#16a34a', whats: '#128c4a', laranja: '#ea580c', ambar: '#d97706',
  roxo: '#7c3aed', vermelho: '#dc2626', rosa: '#db2777',
}

const br = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const nota1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const horas = (min: number) => (min >= 60 ? `${num(Math.round(min / 60))} h` : `${min} min`)
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotMes = (ym: string) => `${MES[parseInt(ym.slice(5, 7), 10) - 1]}/${ym.slice(2, 4)}`

const CSS = `
.fi-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 11mm 11mm 13mm; }
  html, body { background: #fff !important; }
  body > *:not(.fi-root) { display: none !important; }
  .fi-root { display: block !important; }
}
.fi-root, .fi-root * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.fi-root { font-family: Inter, 'Segoe UI', system-ui, sans-serif; color: ${COR.texto}; font-size: 8.6pt; line-height: 1.35; }
.fi-secao { break-inside: avoid; margin-top: 3.2mm; }
.fi-titulo { font-size: 7.4pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: ${COR.texto3}; margin: 0 0 1.6mm; display: flex; align-items: center; gap: 2mm; }
.fi-titulo::after { content: ''; flex: 1; height: 1px; background: ${COR.borda}; }
.fi-caixa { border: 1px solid ${COR.borda}; border-radius: 2.4mm; padding: 2.6mm 3mm; }
.fi-rot { font-size: 7pt; color: ${COR.texto3}; }
.fi-val { font-size: 9pt; font-weight: 700; }
.fi-tabela { width: 100%; border-collapse: collapse; }
.fi-tabela td, .fi-tabela th { padding: 1.3mm 1.6mm; border-bottom: 1px solid ${COR.borda}; vertical-align: top; text-align: left; }
.fi-tabela th { font-size: 6.8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: ${COR.texto3}; }
.fi-tabela tr { break-inside: avoid; }
.fi-num { font-variant-numeric: tabular-nums; }
`

type Props = { vm: EmployeeVM; m: EmployeeMetrics; periodo: string }

export function FichaImpressa(props: Props) {
  /* O portal só existe no navegador — no servidor não há <body> para mirar. */
  const [pronto, setPronto] = useState(false)
  useEffect(() => { setPronto(true) }, [])
  if (!pronto) return null
  return createPortal(
    <div className="fi-root" aria-hidden="true">
      <style>{CSS}</style>
      <Folha {...props} />
    </div>,
    document.body,
  )
}

function Folha({ vm, m, periodo }: Props) {
  const a = m.assiduidade
  const ponto = comPonto(m)
  const { total: concl } = concluidas(m)
  const suspAtraso = a.suspensoesAtraso ?? null
  const suspLgpd = a.suspensoes ?? null
  const susp = suspAtraso == null && suspLgpd == null ? null : (suspAtraso ?? 0) + (suspLgpd ?? 0)
  const p = m.posicao
  const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  /* Os sistemas com registro — sem Rádio, e do Chat só os chamados. */
  const { whatsapp: w, helpdesk: hd, classroom: cr, gerencia: gr, chat: ch, cide, consultoria: co } = m
  const linhas: { nome: string; cor: string; itens: [string, string][]; nota?: string }[] = []
  const sem: string[] = []
  const add = (tem: boolean, nome: string, cor: string, itens: () => [string, string][], nota?: () => string | undefined) => {
    if (tem) linhas.push({ nome, cor, itens: itens(), nota: nota?.() }); else sem.push(nome)
  }
  add(w.has && w.abertos + w.finalizados > 0, 'WhatsApp', COR.whats, () => [
    ['Abertos', num(w.abertos)],
    ['Finalizados', `${num(w.finalizados)}${w.abertos ? ` (${Math.round((w.finalizados / w.abertos) * 100)}%)` : ''}`],
    ['Tempo médio', w.tempoMedio],
    /* ⚠️ Nota só com quantas notas a formam; `null` = não conferido, nunca "sem nota". */
    ['Avaliação do cliente', w.verificados == null ? 'não conferida'
      : w.avaliados && w.notaSum != null ? `${nota1(w.notaSum / w.avaliados)} de 5 (${w.avaliados} ${w.avaliados === 1 ? 'nota' : 'notas'})` : 'sem nota'],
  ], () => (w.verificados != null && w.pedidos != null ? `pediu avaliação em ${num(w.pedidos)} de ${num(w.verificados)} atendimentos conferidos` : undefined))
  add(hd.has && hd.opened + hd.resolved > 0, 'HelpDesk', COR.azul, () => [
    ['Abertos', num(hd.opened)], ['Resolvidos', num(hd.resolved)], ['Formalizados', num(hd.formalized)], ['Tempo médio', hd.tempoMedio],
  ])
  add(cr.courses + cr.created + cr.videos > 0, 'ClassRoom', COR.verde, () => [
    ['Vídeos assistidos', num(cr.videos)], ['Cursos concluídos', num(cr.courses)], ['Cursos criados', num(cr.created)],
  ])
  add(gr.hasSaida, 'Gerência · na rua', COR.laranja, () => [
    ['Serviços entregues', num(gr.servicos)], ['Km rodados', num(gr.km)], ['Saídas', num(gr.saidas)],
    ...(gr.viagens > 0 ? [['Viagens', num(gr.viagens)] as [string, string]] : []),
    ['Jornada', `${num(Math.round(gr.jornadaMin / 60))} h`],
  ])
  add(gr.hasEscritorio, 'Gerência · escritório', COR.laranja, () => [
    ['Serviços criados', num(gr.servCriados)], ['Protocolos abertos', num(gr.protAbertos)], ['Aprovações', num(gr.protAprovados)],
    ...(gr.datasAlteradas > 0 ? [['Datas alteradas', num(gr.datasAlteradas)] as [string, string]] : []),
    ...(gr.reagendados + gr.cancelados > 0 ? [['Reagend. / cancel.', `${gr.reagendados} / ${gr.cancelados}`] as [string, string]] : []),
  ])
  /* ⚠️ Chat Interno: SÓ chamados. Nenhuma contagem de mensagem (decisão do dono). */
  add(ch.hasChamado || ch.hasConversa, 'Chat Interno · chamados', COR.rosa, () => [
    ['Abriu', num(ch.chamadosAbertos)], ['Atendeu', num(ch.chamadosAssumidos)], ['Concluiu', num(ch.chamadosConcluidos)],
    ...(ch.chamadosConcluidos > 0 ? [['Tempo médio (expediente)', ch.tempoMedio] as [string, string]] : []),
  ])
  add(cide.has && cide.atividades > 0, 'CIDE', COR.vermelho, () => [['Empresas atendidas', num(cide.atividades)]])
  add(co.has && co.total > 0, 'Consultoria Plus', COR.roxo, () => [
    ['Estudos', num(co.studies)], ['Chamados', num(co.tickets)], ['Mensagens da consultoria', num(co.messages)], ['Comentários', num(co.comments)],
  ])

  /* Atrasos por mês — só quando o período cobre mais de um mês. */
  const porMes = new Map<string, { atrasos: number; minutos: number }>()
  for (const d of a.dias ?? []) {
    const k = d.day.slice(0, 7)
    const x = porMes.get(k) ?? { atrasos: 0, minutos: 0 }
    x.atrasos += d.atrasos; x.minutos += d.minutos
    porMes.set(k, x)
  }
  const meses = m.fromDay.slice(0, 7) !== m.toDay.slice(0, 7)
  const serieMes = [...porMes].sort((x, y) => x[0].localeCompare(y[0]))
  const maxMes = Math.max(1, ...serieMes.map(([, v]) => v.atrasos))
  const fx = a.faixas
  const medidos = fx ? fx.ate5 + fx.ate30 + fx.mais30 : 0
  const sv = m.servicos

  const Indic = ({ rot, val, cor, nota }: { rot: string; val: string; cor: string; nota?: string }) => (
    <div className="fi-caixa" style={{ borderTop: `2.2px solid ${cor}`, padding: '2mm 2.4mm' }}>
      <div className="fi-num" style={{ fontSize: '15pt', fontWeight: 800, color: cor, lineHeight: 1.05 }}>{val}</div>
      <div style={{ fontSize: '7.6pt', fontWeight: 700, marginTop: '.6mm' }}>{rot}</div>
      {nota && <div className="fi-rot" style={{ marginTop: '.4mm' }}>{nota}</div>}
    </div>
  )

  return (
    <div>
      {/* ── FAIXA ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', paddingBottom: '2.6mm', borderBottom: `2px solid ${COR.texto}` }}>
        <Logo size={30} radius={8} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13pt', fontWeight: 800, letterSpacing: '-.02em' }}>Ficha do colaborador</div>
          <div className="fi-rot">TalentCare · Grupo Itamarathy</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9.4pt', fontWeight: 800 }}>{periodo}</div>
          <div style={{ fontSize: '8pt', color: COR.texto2 }}>{br(m.fromDay)} a {br(m.toDay)}</div>
          <div className="fi-rot">gerado em {agora}</div>
        </div>
      </div>

      {/* ── IDENTIDADE · FORMAÇÃO · PONTUAÇÃO ─────────────────────────────── */}
      <div className="fi-secao" style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr .95fr', gap: '3mm' }}>
        <div className="fi-caixa" style={{ display: 'flex', gap: '3mm' }}>
          {vm.hasAvatar
            ? <img src={`/api/avatar/${vm.id}`} alt="" style={{ width: '19mm', height: '19mm', borderRadius: '3mm', objectFit: 'cover', flex: 'none' }} />
            : <div style={{ width: '19mm', height: '19mm', borderRadius: '3mm', background: vm.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15pt', fontWeight: 800, flex: 'none' }}>{vm.initials}</div>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '14pt', fontWeight: 800, lineHeight: 1.1 }}>{vm.name}</div>
            <div style={{ fontSize: '8.4pt', color: COR.texto2, margin: '.6mm 0 1.6mm' }}>
              {vm.cargo} · <b style={{ color: COR.texto }}>{vm.dept}</b> · <span style={{ color: vm.dataSaida ? COR.vermelho : COR.verde, fontWeight: 700 }}>{vm.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2mm 3mm' }}>
              <div><div className="fi-rot">Cargo oficial</div><div className="fi-val">{vm.cargoOficial ?? 'a informar'}</div></div>
              <div><div className="fi-rot">Tempo de casa</div><div className="fi-val">{vm.tempo}</div></div>
              <div><div className="fi-rot">Admissão</div><div className="fi-val">{vm.hireISO ? br(vm.hireISO) : vm.admissao}</div></div>
              {vm.dataSaida
                ? <div><div className="fi-rot">Data de saída</div><div className="fi-val" style={{ color: COR.vermelho }}>{vm.dataSaida}</div></div>
                : <div><div className="fi-rot">Idade</div><div className="fi-val">{vm.idade != null ? `${vm.idade} anos` : '—'}{vm.nascimento ? ` · ${vm.nascimento}` : ''}</div></div>}
            </div>
          </div>
        </div>

        <div className="fi-caixa">
          <div className="fi-titulo" style={{ marginBottom: '1.4mm' }}>Formação</div>
          <div style={{ fontSize: '8.6pt', fontWeight: 700, marginBottom: '1.2mm' }}>{vm.grauLevels.map((l) => l.label).join(' · ') || 'Escolaridade não informada'}</div>
          {vm.cursos.length > 0 ? vm.cursos.slice(0, 4).map((c, i) => (
            <div key={i} style={{ borderLeft: `2px solid ${formCor(c.quando, i)}`, paddingLeft: '1.8mm', marginTop: '1mm' }}>
              <div style={{ fontWeight: 700 }}>{c.nome}</div>
              <div className="fi-rot">{c.quando}</div>
            </div>
          )) : <div className="fi-rot">Sem cursos informados no cadastro.</div>}
          {vm.cursos.length > 4 && <div className="fi-rot" style={{ marginTop: '1mm' }}>e mais {vm.cursos.length - 4}</div>}
        </div>

        <div className="fi-caixa">
          <div className="fi-titulo" style={{ marginBottom: '1.4mm' }}>Pontuação</div>
          {p ? (
            <>
              <div className="fi-num" style={{ fontSize: '20pt', fontWeight: 800, color: COR.azul, lineHeight: 1 }}>{num(p.acumulado)}</div>
              <div className="fi-rot">pontos no período · {p.meses} {p.meses === 1 ? 'mês' : 'meses'}</div>
              <div style={{ marginTop: '1.8mm', fontSize: '10.5pt', fontWeight: 800 }}>
                {p.posicao != null ? `${p.posicao}º de ${p.de}` : '—'}
                <span style={{ fontSize: '7.4pt', fontWeight: 600, color: COR.texto2 }}> no {vm.dept}</span>
              </div>
              <div className="fi-rot">
                {competenciaLabel(p.competencia)}{p.pontosNoMes != null ? ` · ${num(p.pontosNoMes)} pontos no mês` : ''}
                {p.estado === 'parcial' ? ' · parcial (mês em curso)' : p.estado === 'previa' ? ' · prévia' : ''}
              </div>
              {p.posicao == null && <div className="fi-rot">{p.semNota === 'chefia' ? 'encarregado: não é ranqueado contra a equipe' : p.motivo ?? 'sem pontuação no mês'}</div>}
              {p.mesesCortados.length > 0 && <div className="fi-rot" style={{ color: COR.ambar }}>mês cortado pelo filtro entra inteiro</div>}
            </>
          ) : <div className="fi-rot">Sem pontuação para este período.</div>}
        </div>
      </div>

      {/* ── INDICADORES ───────────────────────────────────────────────────── */}
      <div className="fi-secao" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2mm' }}>
        <Indic rot="Atividades concluídas" val={concl == null ? '—' : num(concl)} cor={COR.verde} nota="nos sistemas" />
        <Indic rot="Índice de assiduidade" val={ponto ? `${a.assid}%` : '—'} cor={COR.azul} nota={ponto ? '100 − atr.×2 − adv.×5' : (a.motivoSemPonto ?? 'sem ponto')} />
        <Indic rot="Atrasos" val={ponto ? num(a.atrasos) : '—'} cor={COR.ambar} nota={ponto && a.atrasosAbon ? `+ ${a.atrasosAbon} abonados` : undefined} />
        <Indic rot="Minutos de atraso" val={ponto ? num(a.minutos) : '—'} cor={COR.azul} />
        <Indic rot="Advertências" val={ponto ? num(a.advertencias) : '—'} cor={COR.laranja} nota="do 2º atraso do mês" />
        <Indic rot="Suspensões" val={susp == null ? '—' : num(susp)} cor={COR.roxo}
          nota={susp ? [suspAtraso ? `${suspAtraso} por atraso` : '', suspLgpd ? `${suspLgpd} LGPD` : ''].filter(Boolean).join(' · ') : undefined} />
      </div>

      {/* ── SISTEMAS ──────────────────────────────────────────────────────── */}
      <div className="fi-secao">
        <div className="fi-titulo">O que os sistemas registraram</div>
        {linhas.length === 0 ? (
          <div className="fi-rot">Nenhum sistema medido registrou atividade no período — o trabalho da pessoa pode não passar por eles.</div>
        ) : (
          <table className="fi-tabela">
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome}>
                  <td style={{ width: '37mm', fontWeight: 800, borderLeft: `2.2px solid ${l.cor}` }}>{l.nome}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6mm 5mm' }}>
                      {l.itens.map(([k, v]) => (
                        <span key={k}><span className="fi-rot">{k} </span><b className="fi-num">{v}</b></span>
                      ))}
                    </div>
                    {l.nota && <div className="fi-rot" style={{ marginTop: '.4mm' }}>{l.nota}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sem.length > 0 && linhas.length > 0 && <div className="fi-rot" style={{ marginTop: '1mm' }}>Sem registro no período: {sem.join(', ')}.</div>}
      </div>

      {/* ── SERVIÇOS · ASSIDUIDADE ────────────────────────────────────────── */}
      <div className="fi-secao" style={{ display: 'grid', gridTemplateColumns: sv?.temFonte ? '1fr 1fr' : '1fr', gap: '3mm' }}>
        {sv?.temFonte && (
          <div className="fi-caixa">
            <div className="fi-titulo">Serviços do setor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2mm', marginBottom: '1.6mm' }}>
              {([['Concluídos', num(sv.concluidos), COR.verde], ['Em aberto', num(sv.abertos), COR.ambar], ['Tempo somado', horas(sv.minutos), COR.texto], ['Média', sv.concluidos ? horas(Math.round(sv.minutos / sv.concluidos)) : '—', COR.texto]] as [string, string, string][]).map(([k, v, c]) => (
                <div key={k}><div className="fi-rot">{k}</div><div className="fi-num" style={{ fontSize: '11pt', fontWeight: 800, color: c }}>{v}</div></div>
              ))}
            </div>
            {sv.porTarefa.length > 0 && (
              <table className="fi-tabela">
                <thead><tr><th>O que mais fez</th><th style={{ textAlign: 'right' }}>Qtd.</th><th style={{ textAlign: 'right' }}>Tempo</th></tr></thead>
                <tbody>
                  {sv.porTarefa.slice(0, 5).map((t) => (
                    <tr key={t.tarefa}><td>{t.tarefa}</td><td className="fi-num" style={{ textAlign: 'right', fontWeight: 700 }}>{t.n}</td><td className="fi-num" style={{ textAlign: 'right', color: COR.texto2 }}>{horas(t.minutos)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {sv.totalConcluidos != null && sv.totalConcluidos > sv.concluidos && <div className="fi-rot" style={{ marginTop: '1mm' }}>Na planilha inteira: {num(sv.totalConcluidos)} concluídos.</div>}
          </div>
        )}

        <div className="fi-caixa">
          <div className="fi-titulo">Assiduidade</div>
          {!ponto ? (
            <div className="fi-rot">{a.motivoSemPonto ?? 'O ponto eletrônico não cobre esta pessoa ou este período.'}</div>
          ) : a.atrasos === 0 ? (
            <div style={{ fontWeight: 700, color: COR.verde }}>Nenhum atraso no período.</div>
          ) : (
            <>
              {medidos > 0 && fx && (
                <>
                  <div className="fi-rot" style={{ marginBottom: '1mm' }}>Gravidade · sobre {medidos} {medidos === 1 ? 'atraso cronometrado' : 'atrasos cronometrados'}{fx.semMedida ? ` · ${fx.semMedida} sem medida` : ''}</div>
                  <div style={{ display: 'flex', height: '2.6mm', borderRadius: '2mm', overflow: 'hidden', gap: '.4mm', marginBottom: '1mm' }}>
                    {([[fx.ate5, '#fbc778'], [fx.ate30, COR.laranja], [fx.mais30, COR.vermelho]] as [number, string][]).filter(([n]) => n > 0).map(([n, c], i) => (
                      <div key={i} style={{ width: `${(n / medidos) * 100}%`, background: c }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '4mm', marginBottom: '1.8mm' }}>
                    {([['até 5 min', fx.ate5], ['6 a 30 min', fx.ate30], ['acima de 30', fx.mais30]] as [string, number][]).map(([k, n]) => (
                      <span key={k}><b className="fi-num">{Math.round((n / medidos) * 100)}%</b> <span className="fi-rot">{k} ({n})</span></span>
                    ))}
                  </div>
                </>
              )}
              {meses && serieMes.length > 0 && (
                <table className="fi-tabela">
                  <thead><tr><th>Mês</th><th>Atrasos</th><th style={{ textAlign: 'right' }}>Min.</th></tr></thead>
                  <tbody>
                    {serieMes.map(([mes, v]) => (
                      <tr key={mes}>
                        <td style={{ width: '13mm' }}>{rotMes(mes)}</td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '1.6mm' }}>
                          <div style={{ height: '2mm', width: `${Math.max(2, (v.atrasos / maxMes) * 40)}mm`, background: COR.ambar, borderRadius: '1mm' }} />
                          <b className="fi-num">{v.atrasos}</b>
                        </div></td>
                        <td className="fi-num" style={{ textAlign: 'right', color: COR.texto2 }}>{v.minutos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
          <div className="fi-rot" style={{ marginTop: '1.4mm' }}>Faltas: sem fonte (o ponto não traz).</div>
        </div>
      </div>

      {/* ── ADVERTÊNCIAS E SUSPENSÕES ─────────────────────────────────────── */}
      <div style={{ marginTop: '3.2mm' }}>
        <div className="fi-titulo">
          {m.disciplina.some((d) => ehSuspensao(d.tipo)) ? 'Advertências e suspensões' : 'Advertências'} · {m.disciplina.length} no período
          {m.disciplinaTotal > m.disciplina.length ? ` · ${m.disciplinaTotal} no histórico` : ''}
        </div>
        {m.disciplina.length === 0 ? (
          <div style={{ fontWeight: 700, color: COR.verde }}>Nenhuma ocorrência no período.</div>
        ) : (
          <>
            <div className="fi-rot" style={{ marginBottom: '1mm' }}>A casa aplica advertência a partir do 2º atraso do mês — é a contagem por essa regra, não registro de advertência assinada.</div>
            <div style={{ columnCount: 2, columnGap: '4mm' }}>
              {m.disciplina.map((d, i) => {
                const grave = ehSuspensao(d.tipo)
                return (
                  <div key={i} style={{ breakInside: 'avoid', display: 'flex', gap: '2mm', padding: '.9mm 0 .9mm 1.8mm', borderBottom: `1px solid ${COR.borda}`, borderLeft: `2px solid ${grave ? COR.roxo : d.tipo === 'lgpd_advertencia' ? COR.vermelho : COR.laranja}` }}>
                    <span className="fi-num" style={{ width: '15mm', flex: 'none', color: COR.texto2 }}>{br(d.data)}</span>
                    <span style={{ width: '27mm', flex: 'none', fontWeight: 700, color: grave ? COR.roxo : COR.texto }}>{rotuloDisciplina(d.tipo)}{grave && d.dias ? ` · ${d.dias}d` : ''}</span>
                    <span style={{ color: COR.texto2, minWidth: 0 }}>{d.motivo ?? 'sem motivo registrado'}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── RODAPÉ ────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '4mm', paddingTop: '1.8mm', borderTop: `1px solid ${COR.borda}`, display: 'flex', justifyContent: 'space-between', gap: '4mm', breakInside: 'avoid' }}>
        <div className="fi-rot" style={{ maxWidth: '140mm' }}>
          Números registrados pelos sistemas integrados no período — não são a nota. A nota é de quem avalia.
          Não constam deste documento a escuta da Rádio nem as mensagens do Chat Interno.
        </div>
        <div className="fi-rot" style={{ textAlign: 'right' }}>{vm.name} · {br(m.fromDay)} a {br(m.toDay)}</div>
      </div>
    </div>
  )
}
