'use client'
import { useEffect, useRef, useState } from 'react'
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

   1ª versão (14/09/2026): folha própria, de texto e tabela — "ficou muito feio".
   2ª: montada com AS PEÇAS DA TELA (azulejos, anéis, cartões com gráficos,
   calendário) — "bem melhor", mas passou de uma página.
   4ª rodada (17/09/2026), para caber DE FATO numa página: fora o período
   repetido nos subtítulos (a faixa do topo já o traz), o tempo médio do
   WhatsApp, a linha dos sistemas sem registro, a explicação do ponto e a
   legenda no pé da assiduidade (subiu para o lado do título) e as ressalvas do
   rodapé — mais a trava de zoom em `FichaImpressa`, abaixo.

   3ª: o LAYOUT QUE O DONO DESENHOU para caber numa folha —
     faixa · hero em duas linhas (identidade e formação em cima, as pílulas numa
     fileira embaixo, os anéis à direita ocupando as duas) · seis azulejos sem
     explicação · serviços só com os quatro números · TODOS os sistemas numa
     fileira · assiduidade com calendário, contadores e gravidade, SEM a lista
     de advertências (só o contador) · rodapé.

   ⚠️⚠️ COMO CABE: a folha é desenhada com 1000 px de largura e reduzida com
   `zoom` para os ~188 mm úteis do A4. As peças foram feitas para tela larga e as
   grades delas abrem por `@media` — na impressão a "tela" é a folha e elas
   cairiam para uma coluna. As grades são forçadas aqui pelas classes REAIS dos
   módulos (`s.indicadores`, `f.assid`, `f.sistemas`).

   ⚠️⚠️ COMO FUNCIONA: portal direto no <body>, escondido na tela; na impressão
   só ele aparece. Os dados são os DESTA tela e DESTE filtro.

   ⚠️⚠️ FORA DA FOLHA, POR DECISÃO DO DONO: a Rádio e as MENSAGENS do Chat Interno
   (`Sistemas` em modo `impressao`; do Chat, só chamados).

   ⚠️ ANIMAÇÃO DESLIGADA (sairia no quadro zero) e PALETA CLARA FORÇADA (papel
   é branco, mesmo com o tema escuro ligado).
   ============================================================ */

const CSS = `
.fi-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 8mm 9mm 9mm; }
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
.fi-folha { width: 1000px; zoom: .72; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
.fi-folha .${s.cartao}, .fi-folha .tc-card { break-inside: avoid; box-shadow: none !important; padding: 14px 16px !important; margin-bottom: 0 !important; }
.fi-folha .${s.pilha} { gap: 10px; }
.fi-folha [data-nota] { display: none !important; }
/* seis azulejos numa fileira, mais baixos */
.fi-folha .${s.indicadores} { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; gap: 8px !important; margin-bottom: 10px; }
.fi-folha .${s.indicadores} > * { padding: 11px 12px !important; gap: 10px !important; }
.fi-folha .${s.indicadores} > * > span:first-child { width: 38px !important; height: 38px !important; border-radius: 10px !important; }
/* ⚠️⚠️ OS SISTEMAS EM QUATRO COLUNAS, não numa fileira só (17/09/2026). A regra
   anterior ("grid-auto-flow: column") punha TODOS na mesma linha: com oito
   sistemas registrando, cada cartão ficava com ~120 px e o conteúdo saía do
   desenho — rótulo de coluna por cima do vizinho, título em três linhas, e a
   fileira transbordando a folha pela direita. Quatro colunas dão ~230 px por
   cartão, que é a largura para a qual eles foram desenhados; quem tiver menos
   de quatro sistemas continua ocupando a linha inteira ("auto-fit").
   ⚠️ A altura que isto custa é devolvida pela trava de zoom, no fim do arquivo:
   a folha continua cabendo numa página. */
.fi-folha .${f.sistemas} { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important; gap: 8px !important; }
/* ⚠️ "min-width: 0" e "overflow: hidden": numa grade, o filho tem largura mínima
   igual ao conteúdo dele — sem isto, um número grande ou um nome comprido empurra
   a coluna e estoura a folha em vez de quebrar a linha. */
.fi-folha .${f.sistemas} > * { padding: 12px 12px 14px !important; min-width: 0; overflow: hidden; }
/* assiduidade: calendário | contadores + gravidade */
.fi-folha .${f.assid} { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) !important; gap: 16px !important; }
/* os anéis do placar, menores */
.fi-folha .fi-hero svg[viewBox="-66 -66 132 132"] { width: 92px !important; height: 92px !important; }
`

type Props = { vm: EmployeeVM; m: EmployeeMetrics; periodo: string }

/** A redução padrão: 1000 px de folha viram os ~188 mm úteis da largura do A4. */
const ZOOM = 0.72
/** A altura útil do A4 com as margens do `@page` (297 − 8 − 9 mm), em px de tela,
 *  com uma folga de 1% para o arredondamento do navegador. */
const ALTURA_UTIL = ((297 - 8 - 9) / 25.4) * 96 * 0.99
/** E a largura útil (210 − 9 − 9 mm). ⚠️ A folha é desenhada com 1000 px e a
 *  redução padrão existe justamente para caber aqui; esta constante serve para o
 *  caso em que ALGO dentro dela ficou mais largo que os 1000 px. */
const LARGURA_UTIL = ((210 - 9 - 9) / 25.4) * 96 * 0.99

export function FichaImpressa(props: Props) {
  /* O portal só existe no navegador — no servidor não há <body> para mirar. */
  const [pronto, setPronto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  useEffect(() => { setPronto(true) }, [])

  /* ⚠️⚠️ A TRAVA DE UMA PÁGINA (17/09/2026). Os cortes deste dia devolveram o
     espaço que faltava para o Ezequiel — mas a folha não tem tamanho fixo: quem
     tem mais sistemas com registro, mais cursos ou um filtro de vários meses
     estica o conteúdo, e a segunda página volta sem avisar. Aqui, ANTES de
     imprimir, a folha é medida em tamanho natural (fora da tela, escondida) e a
     redução cai o tanto que for preciso para caber na altura útil do A4. Quando
     já cabe — o caso comum — nada muda: o teto continua sendo os 0,72 que
     preenchem a largura da folha. */
  useEffect(() => {
    if (!pronto) return
    const ajustar = () => {
      const root = raiz.current
      const folha = root?.querySelector<HTMLElement>('.fi-folha')
      if (!root || !folha) return
      const antes = root.getAttribute('style')
      root.setAttribute('style', 'display:block;position:fixed;left:-20000px;top:0;visibility:hidden')
      folha.style.setProperty('zoom', '1')
      const alto = folha.getBoundingClientRect().height
      /* ⚠️⚠️ A LARGURA também: `scrollWidth` acusa o que passou dos 1000 px da
         folha (um cartão que não coube, um número que não quebrou). Sem esta
         conta, o excesso não encolhe — ele é CORTADO pela borda da página, e a
         ficha sai com meia coluna faltando sem nada avisar. */
      const largo = Math.max(folha.scrollWidth, 1000)
      if (antes == null) root.removeAttribute('style'); else root.setAttribute('style', antes)
      /* Piso de 0,5: abaixo disso o número fica ilegível no papel, e uma folha
         que ninguém lê é pior que duas páginas. */
      /* ⚠️ `LARGURA_UTIL / largo` dá os mesmos ~0,72 quando nada passou dos
         1000 px — é a própria conta de onde o teto saiu. Ela só morde quando
         algo ficou mais largo que a folha. */
      const z = alto > 0
        ? Math.max(0.5, Math.min(ZOOM, ALTURA_UTIL / alto, LARGURA_UTIL / largo))
        : ZOOM
      folha.style.setProperty('zoom', String(z))
    }
    window.addEventListener('beforeprint', ajustar)
    return () => window.removeEventListener('beforeprint', ajustar)
  }, [pronto])

  if (!pronto) return null
  return createPortal(
    <div className="fi-root" aria-hidden="true" ref={raiz}>
      <style>{CSS}</style>
      <Folha {...props} />
    </div>,
    document.body,
  )
}

const br = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

/* ⚠️ Logo com id de degradê PRÓPRIO: o `Logo` do app usa `tc-logo-bg`, e a cópia
   do topo da tela fica `display:none` na impressão — o `url(#…)` apontava para
   ela e a marca saía em branco. */
function Marca() {
  return (
    <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 10, whiteSpace: 'nowrap' }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={13} strokeWidth={2.2} />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 9.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>{rotulo}</span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: valor ? 'var(--n-text)' : 'var(--n-text-3)', fontStyle: valor ? 'normal' : 'italic' }}>{valor || 'a informar'}</span>
      </span>
    </span>
  )
}

function Folha({ vm, m, periodo }: Props) {
  const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="fi-folha">
      {/* ── FAIXA ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', marginBottom: 10, borderRadius: 14, color: '#fff', background: 'linear-gradient(120deg, #1e3a8a, #2563eb 55%, #7c3aed)' }}>
        <Marca />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', lineHeight: 1.1 }}>Ficha do colaborador</div>
          <div style={{ fontSize: 11.5, opacity: .85 }}>TalentCare · Grupo Itamarathy</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{periodo}</div>
          <div style={{ fontSize: 12, opacity: .9 }}>{br(m.fromDay)} a {br(m.toDay)} · gerado em {agora}</div>
        </div>
      </div>

      {/* ── HERO em duas linhas (desenho do dono) ─────────────────────────────
          | identidade | formação | anéis (2 linhas) |
          | pílulas numa fileira    |                  |                          */}
      <header className="fi-hero" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr) auto', gridTemplateRows: 'auto auto',
        columnGap: 22, rowGap: 12, alignItems: 'start', padding: '14px 18px', marginBottom: 10,
        border: '1px solid var(--n-border)', borderRadius: 16,
        background: 'radial-gradient(420px 200px at 100% 0%, var(--n-purple-soft), transparent 70%), radial-gradient(480px 220px at 70% 120%, var(--n-blue-soft), transparent 70%), var(--n-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span style={{ padding: 3, borderRadius: 20, background: 'linear-gradient(135deg, var(--n-blue), var(--n-purple))', flex: 'none', lineHeight: 0 }}>
            <span style={{ display: 'block', padding: 2, borderRadius: 18, background: 'var(--n-card)' }}>
              <Avatar id={vm.id} hasAvatar={vm.hasAvatar} initials={vm.initials} color={vm.color} size={70} radius={15} />
            </span>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* ⚠️ Sem `nowrap`: um nome comprido em 26 px empurrava a coluna do
                  hero e levava o resto para fora da folha. Duas linhas de nome é
                  feio; meia ficha cortada é pior. */}
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.1, color: 'var(--n-text)', minWidth: 0, overflowWrap: 'anywhere' }}>{vm.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, color: vm.statusColor, background: vm.statusBg, padding: '2px 9px', borderRadius: 20 }}>{vm.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--n-text-2)', marginTop: 4 }}>
              <Briefcase size={13} color="var(--n-text-3)" />
              <span>{vm.cargo}</span><span style={{ color: 'var(--n-text-3)' }}>·</span><b style={{ color: 'var(--n-text)' }}>{vm.dept}</b>
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: suave('green'), color: forte('green'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={12} /></span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--n-text-3)' }}>Formação</span>
            {vm.grauLevels.map((l) => (
              <span key={l.label} style={{ fontSize: 11, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, padding: '2px 9px', borderRadius: 20 }}>{l.label}</span>
            ))}
          </div>
          {vm.cursos.length > 0 ? vm.cursos.slice(0, 3).map((c, i) => (
            <div key={i} style={{ paddingLeft: 9, borderLeft: `3px solid ${formCor(c.quando, i)}`, marginTop: 5 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', lineHeight: 1.25 }}>{c.nome}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: formCor(c.quando, i) }}>{c.quando}</div>
            </div>
          )) : <div style={{ fontSize: 11.5, color: 'var(--n-text-3)' }}>Sem cursos informados no cadastro.</div>}
        </div>

        <div style={{ gridColumn: 3, gridRow: '1 / span 2', alignSelf: 'center' }}>
          {m.posicao && (
            <Placar compacto enxuto p={m.posicao} meses={m.posicao.mesesDoPlacar} setor={vm.dept} competenciaLabel={competenciaLabel(m.posicao.competencia)}
              motivoSemNota={m.posicao.de === 0 ? `ninguém do ${vm.dept} pontuou em ${competenciaLabel(m.posicao.competencia)}` : null} />
          )}
        </div>

        <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <Pilula Icone={BadgeCheck} tom="purple" rotulo="Cargo" valor={vm.cargoOficial} />
          <Pilula Icone={Home} tom="green" rotulo="Tempo de casa" valor={vm.tempo} />
          <Pilula Icone={CalendarPlus} tom="blue" rotulo="Admissão" valor={vm.admissao} />
          {vm.dataSaida && <Pilula Icone={CalendarX} tom="red" rotulo="Data de saída" valor={vm.dataSaida} />}
          {(vm.idade != null || vm.nascimento) && (
            <Pilula Icone={Cake} tom="pink" rotulo="Idade" valor={<>{vm.idade != null ? `${vm.idade} anos` : '—'}{vm.nascimento && <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}> · {vm.nascimento}</span>}</>} />
          )}
        </div>
      </header>

      <Indicadores m={m} periodo={periodo} semNotas />

      <div className={s.pilha}>
        <ServicosCard servicos={m.servicos} pontuacao={m.pontuacao} periodo={periodo} semPontuacao soNumeros />
        <Sistemas m={m} periodo={periodo} pessoaId={vm.id} impressao />
        <Assiduidade m={m} periodo={periodo} pontoAteVm={vm.pontoAte ?? null} impressao />
      </div>

      {/* ── RODAPÉ ──────────────────────────────────────────────────────────
          ⚠️ Só a assinatura (pedido do dono, 17/09/2026). As duas linhas de
          ressalva — "não são a nota" e o que não consta — saíram: quem recebe a
          folha é quem avalia, e já sabe. */}
      <div style={{ marginTop: 10, paddingTop: 7, borderTop: '1px solid var(--n-border)', display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 10.5, color: 'var(--n-text-3)', breakInside: 'avoid' }}>
        <div style={{ textAlign: 'right' }}>{vm.name} · {br(m.fromDay)} a {br(m.toDay)}</div>
      </div>
    </div>
  )
}
