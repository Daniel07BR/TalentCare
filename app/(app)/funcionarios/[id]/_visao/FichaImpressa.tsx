'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, CalendarPlus, CalendarX, Cake, Briefcase, BadgeCheck, BookOpen, type LucideIcon } from 'lucide-react'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { EmployeeVM } from '@/lib/mock/employee'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../../Avatar'
import { forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import s from '../../../_visao/visao.module.css'
import { Placar } from '../Placar'
import ServicosCard from '../ServicosCard'
import f from './ficha.module.css'
import { Indicadores } from './Indicadores'
import { Sistemas } from './Sistemas'
import { Assiduidade } from './Assiduidade'
import { formCor } from './derivar'

/* ============================================================
   A FICHA EM A4 — o que o botão "Gerar PDF" imprime.

   1ª versão (14/09/2026): uma folha própria, de texto e tabela. O dono: "perfeito,
   mas ficou muito feio — preciso que fique o mais próximo dos gráficos do
   relatório web". Então a folha agora é MONTADA COM AS PEÇAS DA TELA: os azulejos
   (`Indicadores`), os anéis do placar (`Placar compacto`), os cartões de sistema
   com seus gráficos (`Sistemas`), o cartão de serviços e o de assiduidade com o
   calendário. Uma correção na tela chega ao PDF sozinha.

   ⚠️⚠️ COMO CABE NUMA FOLHA: a folha é desenhada com 1000 px de largura e
   reduzida com `zoom` para os ~188 mm úteis do A4. As peças foram feitas para
   tela larga; sem isso as grades (que abrem por `@media`, e na impressão a
   "tela" é a folha) cairiam para uma coluna. As grades que importam são
   forçadas aqui, pelas classes REAIS dos módulos (`s.indicadores`, `f.assid`…).

   ⚠️⚠️ COMO FUNCIONA: portal direto no <body>, escondido na tela; na impressão só
   ele aparece. Os dados são os DESTA tela e DESTE filtro — o PDF não tem como
   mostrar outro período.

   ⚠️⚠️ FORA DA FOLHA, POR DECISÃO DO DONO: a Rádio e as MENSAGENS do Chat Interno
   (`Sistemas` em modo `impressao` tira o bloco de conversa; do Chat, só chamados).

   ⚠️ ANIMAÇÃO DESLIGADA na folha: ela passa de `display:none` a visível na hora
   de imprimir, e uma animação que começa nesse instante sai no PDF no quadro
   zero (cartão transparente, barra vazia).
   ⚠️ PALETA CLARA FORÇADA: papel é branco — com o tema escuro ligado a folha
   sairia azul-noite.
   ============================================================ */

const CSS = `
.fi-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 9mm 10mm 10mm; }
  html, body { background: #fff !important; }
  body > *:not(.fi-root) { display: none !important; }
  .fi-root { display: block !important; }
}
html body .fi-root.fi-root {
  --n-bg: #f4f6fb; --n-card: #ffffff; --n-card-2: #f6f8fc; --n-border: #e6eaf2; --n-border-2: #eef1f6;
  --n-text: #0f172a; --n-text-2: #475569; --n-text-3: #8a97ad;
  --n-blue: #2563eb; --n-blue-soft: #e8efff; --n-red: #e5484d; --n-red-soft: #fdecec;
  --n-orange: #f97316; --n-orange-soft: #fff0e3; --n-amber: #f59e0b; --n-amber-soft: #fff6e0;
  --n-purple: #7c3aed; --n-purple-soft: #f1ebff; --n-green: #16a34a; --n-green-soft: #e7f7ee;
  --n-pink: #e11d48; --n-pink-soft: #fde8ee; --n-whats: #25D366; --n-whats-soft: #e2f8ea;
  --n-shadow: none;
  --n-heat-0: #f1f4f9; --n-heat-1: #fde7c4; --n-heat-2: #fbc778; --n-heat-3: #f59e0b; --n-heat-4: #ea580c;
  --bg: var(--n-bg); --surface: var(--n-card); --surface-2: var(--n-card-2); --surface-3: #e9edf5;
  --border: var(--n-border); --border-soft: var(--n-border-2);
  --text: var(--n-text); --text-dim: var(--n-text-2); --text-mute: var(--n-text-3);
  --accent: var(--n-blue); --info: var(--n-blue); --success: var(--n-green); --warning: var(--n-amber); --danger: var(--n-red);
  --chart-1: var(--n-green); --chart-2: var(--n-blue); --chart-3: var(--n-purple); --chart-4: var(--n-orange); --chart-5: var(--n-pink);
  color: var(--n-text); background: #fff;
}
.fi-root *, .fi-root *::before, .fi-root *::after {
  animation: none !important; transition: none !important;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.fi-folha { width: 1000px; zoom: .705; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
.fi-folha .${s.cartao}, .fi-folha .tc-card { break-inside: avoid; box-shadow: none !important; }
.fi-folha .${s.pilha} { gap: 12px; }
.fi-folha .${s.indicadores} { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; margin-bottom: 12px; }
.fi-folha .${f.hero} { grid-template-columns: minmax(0, 1.35fr) minmax(0, .9fr) auto !important; align-items: start; column-gap: 34px; box-shadow: none; margin-bottom: 12px; }
.fi-folha .${f.assid} { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) !important; }
.fi-folha .${f.sistemas} { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
.fi-folha .${f.lista2} { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
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

const br = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

/* ⚠️ Logo com id de degradê PRÓPRIO: o `Logo` do app usa `tc-logo-bg`, e a cópia
   dele no topo da tela fica `display:none` na impressão — o `url(#…)` apontava para
   ela e a marca saía em branco na 1ª versão do PDF. */
function Marca() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <defs><linearGradient id="fi-logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7b733" /><stop offset="1" stopColor="#d98a15" /></linearGradient></defs>
      <rect width="64" height="64" rx="15" fill="url(#fi-logo-bg)" />
      <path d="M14 41 A18 18 0 0 1 50 41" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="41" x2="41" y2="30" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="41" r="4.5" fill="#fff" />
    </svg>
  )
}

function Pilula({ Icone, tom, rotulo, valor }: { Icone: LucideIcon; tom: Tom; rotulo: string; valor: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 12px 6px 6px', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={15} strokeWidth={2.2} />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>{rotulo}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--n-text)', whiteSpace: 'nowrap', fontStyle: valor ? 'normal' : 'italic' }}>{valor || 'a informar'}</span>
      </span>
    </span>
  )
}

function Folha({ vm, m, periodo }: Props) {
  const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="fi-folha">
      {/* ── FAIXA ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', marginBottom: 12, borderRadius: 16, color: '#fff', background: 'linear-gradient(120deg, #1e3a8a, #2563eb 55%, #7c3aed)' }}>
        <Marca />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1.1 }}>Ficha do colaborador</div>
          <div style={{ fontSize: 12, opacity: .85 }}>TalentCare · Grupo Itamarathy</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{periodo}</div>
          <div style={{ fontSize: 12.5, opacity: .9 }}>{br(m.fromDay)} a {br(m.toDay)}</div>
          <div style={{ fontSize: 11, opacity: .75 }}>gerado em {agora}</div>
        </div>
      </div>

      {/* ── HERO (o mesmo desenho da tela, sem os botões de edição) ─────────── */}
      <header className={f.hero} style={{ padding: '18px 22px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ padding: 3, borderRadius: 24, background: 'linear-gradient(135deg, var(--n-blue), var(--n-purple))', flex: 'none', lineHeight: 0 }}>
              <span style={{ display: 'block', padding: 3, borderRadius: 21, background: 'var(--n-card)' }}>
                <Avatar id={vm.id} hasAvatar={vm.hasAvatar} initials={vm.initials} color={vm.color} size={84} radius={18} />
              </span>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--n-text)' }}>{vm.name}</h1>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: vm.statusColor, background: vm.statusBg, padding: '3px 10px', borderRadius: 20 }}>{vm.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--n-text-2)', marginTop: 5 }}>
                <Briefcase size={14} color="var(--n-text-3)" />
                <span>{vm.cargo}</span><span style={{ color: 'var(--n-text-3)' }}>·</span><b style={{ color: 'var(--n-text)' }}>{vm.dept}</b>
              </div>
            </div>
          </div>
          <div className={f.info} style={{ marginTop: 14 }}>
            <Pilula Icone={BadgeCheck} tom="purple" rotulo="Cargo" valor={vm.cargoOficial} />
            <Pilula Icone={Home} tom="green" rotulo="Tempo de casa" valor={vm.tempo} />
            <Pilula Icone={CalendarPlus} tom="blue" rotulo="Admissão" valor={vm.admissao} />
            {vm.dataSaida && <Pilula Icone={CalendarX} tom="red" rotulo="Data de saída" valor={vm.dataSaida} />}
            {(vm.idade != null || vm.nascimento) && (
              <Pilula Icone={Cake} tom="pink" rotulo="Idade" valor={<>{vm.idade != null ? `${vm.idade} anos` : '—'}{vm.nascimento && <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}> · {vm.nascimento}</span>}</>} />
            )}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: suave('green'), color: forte('green'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={14} /></span>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--n-text-3)' }}>Formação</div>
              <div style={{ fontSize: 10, color: 'var(--n-text-3)' }}>cadastro do RH · retrato de hoje</div>
            </div>
          </div>
          {vm.grauLevels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {vm.grauLevels.map((l) => (
                <span key={l.label} style={{ fontSize: 11.5, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, padding: '3px 10px', borderRadius: 20 }}>{l.label}</span>
              ))}
            </div>
          )}
          {vm.cursos.length > 0 ? vm.cursos.slice(0, 4).map((c, i) => (
            <div key={i} style={{ paddingLeft: 10, borderLeft: `3px solid ${formCor(c.quando, i)}`, marginTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)', lineHeight: 1.25 }}>{c.nome}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: formCor(c.quando, i) }}>{c.quando}</div>
            </div>
          )) : <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>Sem cursos informados no cadastro.</div>}
        </div>

        {m.posicao && (
          <Placar compacto p={m.posicao} meses={m.posicao.mesesDoPlacar} setor={vm.dept} competenciaLabel={competenciaLabel(m.posicao.competencia)}
            motivoSemNota={m.posicao.de === 0 ? `ninguém do ${vm.dept} pontuou em ${competenciaLabel(m.posicao.competencia)}` : null} />
        )}
      </header>

      <Indicadores m={m} periodo={periodo} />

      <div className={s.pilha}>
        <ServicosCard servicos={m.servicos} pontuacao={m.pontuacao} periodo={periodo} semPontuacao />
        <Sistemas m={m} periodo={periodo} pessoaId={vm.id} impressao />
        <Assiduidade m={m} periodo={periodo} pontoAteVm={vm.pontoAte ?? null} />
      </div>

      {/* ── RODAPÉ ────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--n-border)', display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: 'var(--n-text-3)', breakInside: 'avoid' }}>
        <div style={{ maxWidth: 680, lineHeight: 1.45 }}>
          Números registrados pelos sistemas integrados no período — não são a nota; a nota é de quem avalia.
          Não constam deste documento a escuta da Rádio nem as mensagens do Chat Interno.
        </div>
        <div style={{ textAlign: 'right' }}>{vm.name}<br />{br(m.fromDay)} a {br(m.toDay)}</div>
      </div>
    </div>
  )
}
