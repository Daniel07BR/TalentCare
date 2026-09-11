'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, TrendingUp, GraduationCap,
  SlidersHorizontal, Bell, ChevronRight, ChevronDown, Sun, Moon, Radio, MessageCircle,
  MessagesSquare, LifeBuoy, Landmark, AlarmClock, Boxes, Truck, MessageSquareText,
  CalendarDays, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { PeriodProvider, usePeriod } from '@/lib/ui/period'
import { TalentDataProvider } from '@/lib/ui/data'
import { OrigemProvider } from '@/lib/ui/origem'
import { PainelDaPessoaProvider } from './PainelDaPessoa'
import BuscaGlobal from './BuscaGlobal'
import Logo from './Logo'
import Avatar from './Avatar'
import type { Period } from '@/lib/mock/dashboard'
import type { TalentData } from '@/lib/mock/data'

// Visão geral: só até Ranking aparece direto no topo.
const NAV_MAIN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/departamentos', label: 'Departamentos', icon: Building2 },
  /* ⚠️ "Ranking" SAIU do menu (11/09/2026, pedido do dono): com cada setor pontuando
     pela própria régua, um ranking da casa inteira compara números que não se
     comparam. O endereço redireciona para o painel. */
  /* ⚠️ "Avaliações" e "Meu desempenho" SAÍRAM do menu lateral (11/09/2026, pedido do
     dono): as avaliações se acessam DENTRO de cada setor (o cartão "Avaliação
     mensal" do relatório abre a lista só daquele setor), e as duas seguem na
     barra de cima, que aparece ao recolher o menu. */
  // A planilha que cada setor sobe + a régua de pontuação dele. Fica junto das
  // avaliações porque é a outra metade da mesma pergunta: o que a pessoa
  // entregou, e por qual critério isso vira nota.
  /* ⚠️ "Serviços do setor" SAIU do menu (11/09/2026, pedido do dono): a planilha do
     Gestta se sobe só dentro do relatório de cada setor, com o setor na URL. */
]
// Resumos dos sistemas integrados (Turnover p/ baixo) ficam dentro do grupo "Sistemas".
const NAV_SYSTEMS = [
  { href: '/turnover', label: 'Turnover', icon: TrendingUp },
  { href: '/assiduidade', label: 'Assiduidade', icon: AlarmClock },
  { href: '/classroom', label: 'ClassRoom', icon: GraduationCap },
  { href: '/radio', label: 'Rádio', icon: Radio },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/consultoria', label: 'Consultoria Plus', icon: MessagesSquare },
  { href: '/helpdesk', label: 'HelpDesk', icon: LifeBuoy },
  { href: '/cide', label: 'CIDE', icon: Landmark },
  { href: '/gerencia', label: 'Gerência', icon: Truck },
  { href: '/chat', label: 'Chat Interno', icon: MessageSquareText },
]
// Administração: visível apenas para o dono/admin que mantém o sistema.
const NAV_ADMIN = [
  /* ⚠️ UMA entrada só (11/09/2026, pedido do dono): Usuários, Equipe interna,
     Escolaridade, Casar ponto e Quem avalia viraram ABAS de Configurações. */
  { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
  /* ⚠️ SAÍRAM do menu (11/09/2026, pedido do dono: "foram criadas para eu definir
     funções que hoje já estão bem estabelecidas"):
     - Relatórios — nunca saiu do "Em breve"; o endereço leva ao painel.
     - Casar ponto (`/ponto`) — segue por ENDEREÇO: o ponto é import à mão, e cada
       dump novo pode trazer nomes que não casam sozinhos. É lá que se vinculam.
     - Quem avalia (`/avaliadores`) — segue por endereço e pelas portas da tela de
       Avaliações ("Quem avalia" e "Definir quem avalia", que aparece quando um
       setor fica sem avaliador): promoção e gestor novo não mudam o vínculo
       sozinhos. */
]
// ⚠️ `custom` NÃO entra aqui: ele nasce de escolher datas no calendário. Um
// botão "custom" que não abre nada seria um botão que não faz nada.
const PERIODS: Period[] = ['7d', '30d', 'Trimestre', 'Ano']

/* ⚠️⚠️ O CARD DE MESES (pedido do dono, 08/09/2026): atalho para os 3 meses
   FECHADOS anteriores + o mês em curso. Cada botão vira um intervalo `custom`
   (1º dia ao último), e "Atual" vai até HOJE. É dinâmico: em setembro mostra
   jun/jul/ago/Atual; em outubro, jul/ago/set/Atual, sem tocar em nada.
   ⚠️ O último dia sai de `new Date(ano, mes, 0)` — dia 0 do mês seguinte é o
   último do mês pedido, e cobre fevereiro e anos bissextos sem tabela. */
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function mesesDoCard(hoje = new Date()): { chave: string; label: string; from: string; to: string; atual: boolean }[] {
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const item = (ano: number, mes0: number, atual: boolean) => {
    const mm = String(mes0 + 1).padStart(2, '0')
    const ult = new Date(ano, mes0 + 1, 0).getDate()
    return {
      chave: `${ano}-${mm}`,
      label: atual ? 'Atual' : MES_CURTO[mes0][0].toUpperCase() + MES_CURTO[mes0].slice(1),
      from: `${ano}-${mm}-01`,
      to: atual ? hojeISO : `${ano}-${mm}-${String(ult).padStart(2, '0')}`,
      atual,
    }
  }
  const out = []
  for (let i = 3; i >= 1; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    out.push(item(d.getFullYear(), d.getMonth(), false))
  }
  out.push(item(hoje.getFullYear(), hoje.getMonth(), true))
  return out
}


function isActive(pathname: string, href: string): boolean {
  if (href === '/funcionarios') return pathname.startsWith('/funcionarios')
  if (href === '/departamentos') return pathname.startsWith('/departamentos')
  return pathname === href || pathname.startsWith(href + '/')
}

/** Estilo dos dois campos de data do calendário. */
/** Item da barra enxuta de quem não é Diretoria. */
const navChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500,
  padding: '7px 12px', borderRadius: 8, color: 'var(--text-dim)', whiteSpace: 'nowrap',
}

const inputData: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 4,
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  padding: '6px 8px', fontSize: 12.5, fontFamily: 'inherit',
  colorScheme: 'light dark', // o calendário nativo acompanha o tema da conta
}

function Topbar({ soMeuSetor = false, podeVoltar = false, onVoltar, meusSetores = [], nome = '', me, initials = '' }: {
  soMeuSetor?: boolean
  /** Quem recolheu o menu pode trazê-lo de volta. Quem NUNCA o teve, não. */
  podeVoltar?: boolean
  onVoltar?: () => void
  meusSetores?: { id: string; name: string }[]
  nome?: string
  me?: { id: string; cargo: string | null; hasAvatar: boolean }
  initials?: string
}) {
  const { period, setPeriod, from, to, setRange, label, fromDay, toDay, datas } = usePeriod()
  // O que os campos de data mostram: o intervalo manual, ou o período em vigor.
  const deDia = period === 'custom' ? from : fromDay
  const ateDia = period === 'custom' ? to : toDay
  const [calOpen, setCalOpen] = useState(false)
  // Nada de data futura: atividade de amanhã não existe, e o campo aberto até
  // 2099 convida a um intervalo que sempre volta vazio.
  const hojeISO = new Date().toISOString().slice(0, 10)
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  // O tema vive no <html data-theme> (aplicado antes da pintura pelo script inline).
  // Aqui só sincronizamos o estado do ícone com o que já está no DOM.
  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme')
    if (t === 'light' || t === 'dark') setTheme(t)
  }, [])
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('tc-theme', next) } catch { /* noop */ }
    setTheme(next)
  }

  return (
    <header style={{ height: 60, flex: 'none', borderBottom: '1px solid var(--border)', background: 'var(--header-bg)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px' }}>
      {/*
        ⚠️⚠️ A NAVEGAÇÃO DE QUEM NÃO É DIRETORIA. O menu lateral é da Diretoria
        (decisão do dono, 03/09/2026) — mas "sem menu" não pode virar "sem
        saída": o gestor precisa alcançar a fila de avaliações e a própria página
        de desempenho, e quem avalia mais de um setor (a Rosemeire avalia Limpeza
        e Cozinha) precisa trocar entre eles. Tirar tudo o deixaria preso numa
        página só, sem nem conseguir ver a própria nota.
      */}
      {soMeuSetor && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          {/* ⚠️ O botão de VOLTAR só existe para quem recolheu o menu por
              vontade. Para o gestor, trazer o menu da Diretoria de volta seria
              devolver o que a régua acabou de tirar. */}
          {podeVoltar ? (
            <button onClick={onVoltar} className="tc-btn" aria-label="Mostrar o menu"
              title="Voltar ao menu da Diretoria — você está vendo como o gestor vê"
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', cursor: 'pointer', flex: 'none' }}>
              <PanelLeftOpen size={16} />
            </button>
          ) : (
            <Logo size={30} radius={8} />
          )}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, overflowX: 'auto' }}>
            {meusSetores.map((d) => (
              <Link key={d.id} href={`/departamentos/${d.id}`}
                className={'tc-nav' + (pathname === `/departamentos/${d.id}` ? ' on' : '')}
                style={navChip}>{d.name}</Link>
            ))}
            <Link href="/avaliacoes" className={'tc-nav' + (pathname.startsWith('/avaliacoes') ? ' on' : '')} style={navChip}>Avaliações</Link>
            {/* ⚠️ "Serviços" SAIU daqui (pedido do dono, 04/09/2026). O caminho
                para a planilha é o botão no RESUMO DO SETOR, onde o gestor já
                está quando lembra dela e onde ele vê o que ela produziu. Um item
                de menu obriga a lembrar que a tela existe; um botão no resumo
                aparece na hora em que faz sentido — e leva o setor na URL, o que
                fecha a porta pela qual 6.980 linhas foram para o setor errado. */}
            <Link href="/minha-avaliacao" className={'tc-nav' + (pathname === '/minha-avaliacao' ? ' on' : '')} style={navChip}>Meu desempenho</Link>
          </nav>
          {/* ⚠️ O selo é o que impede o preview de virar confusão: sem ele, quem
              recolheu o menu ontem abre o sistema hoje e conclui que perdeu
              acesso — e o preview vira um chamado de suporte. */}
          {podeVoltar && (
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap', flex: 'none' }}>
              VENDO COMO GESTOR
            </span>
          )}
        </div>
      )}

      <div style={{ position: 'relative', flex: soMeuSetor ? 'none' : 1, maxWidth: 420, display: soMeuSetor ? 'none' : 'block' }}>
        {/* A busca de verdade (11/09/2026): pessoas e departamentos — ver BuscaGlobal.tsx.
            Era um campo que só guardava o que se digitava. */}
        <BuscaGlobal />
      </div>
      <div style={{ flex: 1 }} />

      {/* ⚠️ CARD DE MESES — atalho para os 3 meses fechados + o atual. Ele SETA
          o mesmo intervalo `custom` do calendário (setRange), então o resto da
          tela não precisa saber que ele existe: obedece ao mesmo contrato de
          período. Aceso quando o intervalo custom bate com o mês. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, marginRight: 8 }}>
        {mesesDoCard().map((m) => {
          const aceso = period === 'custom' && from === m.from && to === m.to
          return (
            <button key={m.chave} className={'seg' + (aceso ? ' on' : '')}
              onClick={() => setRange(m.from, m.to)}
              title={m.atual ? `Mês atual (até hoje)` : `${m.label} de ${m.chave.slice(0, 4)}`}
              style={{ fontSize: 12, padding: '6px 11px', fontWeight: m.atual ? 700 : 500 }}>
              {m.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
        {PERIODS.map((p) => (
          <button key={p} className={'seg' + (period === p ? ' on' : '')} onClick={() => setPeriod(p)} style={{ fontSize: 12, padding: '6px 11px' }}>{p}</button>
        ))}
        {/*
          O CALENDÁRIO. `<input type="date">` nativo de propósito: ele já abre o
          calendário do sistema, já respeita o idioma e o teclado, e não custa um
          quilobyte de biblioteca (ver `docs/BIBLIOTECAS-GRAFICAS.md` no Nexus —
          declarar não pesa, importar pesa).

          ⚠️ Escolher as duas datas JÁ liga o modo intervalo. Exigir um botão
          "aplicar" deixaria a tela mostrando 30 dias com o calendário mostrando
          outra coisa — e quem confia no calendário leria o número errado.
        */}
        <button
          className={'seg' + (period === 'custom' ? ' on' : '')}
          onClick={() => setCalOpen((v) => !v)}
          title="Escolher um intervalo de datas"
          style={{ fontSize: 12, padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <CalendarDays size={14} />
          {/* ⚠️ As DATAS em qualquer período — não só no intervalo escolhido à
              mão. Em 7d/30d/Trimestre/Ano o botão dizia só "Período", e não havia
              onde ler de que dia a que dia os números falavam. */}
          {datas}
        </button>
      </div>

      {calOpen && (
        <div style={{ position: 'absolute', top: 58, right: 120, zIndex: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,.18)', minWidth: 250 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Intervalo de datas</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)' }}>
              De
              {/* ⚠️ Fora do intervalo manual, os campos mostram o período EM VIGOR
                  (e não o último intervalo escolhido, que fica guardado): mexer
                  numa ponta parte do que está na tela. */}
              <input type="date" value={deDia} max={ateDia || hojeISO} onChange={(e) => setRange(e.target.value, ateDia)}
                style={inputData} />
            </label>
            <label style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)' }}>
              Até
              <input type="date" value={ateDia} min={deDia} max={hojeISO} onChange={(e) => setRange(deDia, e.target.value)}
                style={inputData} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button onClick={() => { setPeriod('30d'); setCalOpen(false) }} className="tc-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
              Voltar a 30 dias
            </button>
            <button onClick={() => setCalOpen(false)} className="tc-btn"
              style={{ marginLeft: 'auto', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
          {/* ⚠️ Só uma ponta escolhida ainda não é intervalo — a tela diz isso em
              vez de mostrar 30 dias calada. */}
          {period === 'custom' && (!from || !to) && (
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 9, lineHeight: 1.5 }}>
              Escolha as duas datas. Enquanto faltar uma, vale o período selecionado acima.
            </div>
          )}
        </div>
      )}
      <button onClick={toggleTheme} className="tc-btn" aria-label="Alternar tema" style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button className="tc-btn" aria-label="Notificações" style={{ position: 'relative', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
        <Bell size={18} />
        <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--surface-2)' }} />
      </button>
      {/* Sem barra lateral, a identidade e a saída moram aqui — senão a pessoa
          não tem como sair do sistema. */}
      {soMeuSetor && me && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 6, borderLeft: '1px solid var(--border)' }}>
          <Avatar id={me.id} hasAvatar={me.hasAvatar} initials={initials} color="var(--chart-1)" size={30} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{nome.split(' ').slice(0, 2).join(' ')}</div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--text-mute)', cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
          </div>
        </div>
      )}
    </header>
  )
}

export default function AppShell({ name, roleLabel, isOwner = false, soMeuSetor = false, meusSetores = [], me, data, children }: {
  name: string; roleLabel: string; isOwner?: boolean
  /** Sem o menu lateral: gestor e sub-encarregado trabalham no setor deles. */
  soMeuSetor?: boolean
  /** Os setores que ele alcança — o dele e os que avalia. */
  meusSetores?: { id: string; name: string }[]
  me: { id: string; cargo: string | null; hasAvatar: boolean }; data: TalentData; children: React.ReactNode
}) {

  /*
   * RECOLHER O MENU — e, com ele, ver a tela como o gestor vê.
   *
   * ⚠️ Não é só esconder a barra: recolhido, a navegação vira a MESMA barra
   * enxuta que o gestor recebe (os setores dele, Avaliações, Meu desempenho).
   * Um preview que mostrasse outra navegação não serviria para conferir nada —
   * e conferir isso é justamente por que o botão existe.
   *
   * ⚠️ Para quem JÁ não tem o menu (gestor, sub-encarregado), não há botão de
   * voltar: trazer o menu da Diretoria de volta seria dar a ele o que a régua
   * acabou de tirar.
   */
  const [recolhido, setRecolhido] = useState(false)
  useEffect(() => {
    try { setRecolhido(localStorage.getItem('tc-menu') === 'off') } catch { /* noop */ }
  }, [])
  const alternarMenu = () => {
    const v = !recolhido
    setRecolhido(v)
    try { localStorage.setItem('tc-menu', v ? 'off' : 'on') } catch { /* noop */ }
  }
  const semLateral = soMeuSetor || recolhido
  const pathname = usePathname()
  const [settled, setSettled] = useState(false)
  const systemsActive = NAV_SYSTEMS.some((it) => isActive(pathname, it.href))
  const [systemsOpen, setSystemsOpen] = useState(systemsActive)

  useEffect(() => {
    setSettled(false)
    const t = setTimeout(() => setSettled(true), 1400)
    return () => clearTimeout(t)
  }, [pathname])

  // Mantém o grupo aberto ao navegar para um resumo de sistema.
  useEffect(() => {
    if (systemsActive) setSystemsOpen(true)
  }, [systemsActive])

  const initials = (name.split(' ')[0]?.[0] ?? '') + (name.split(' ').slice(-1)[0]?.[0] ?? '')

  return (
    <PeriodProvider>
     <TalentDataProvider value={data}>
     {/* O rastro de onde a pessoa veio — o "voltar" das telas de detalhe. Os
         nomes das telas saem do MENU, para não haver uma segunda lista. */}
     <OrigemProvider rotulos={[...NAV_MAIN, ...NAV_SYSTEMS, ...NAV_ADMIN]}>
     {/* O painel lateral "o que a pessoa fez neste sistema" — ver PainelDaPessoa.tsx. */}
     <PainelDaPessoaProvider>
      <div className={'app' + (settled ? ' stld' : '')} style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
{!semLateral && (
        <aside style={{ width: 240, flex: 'none', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
            <Logo size={34} radius={9} />
            <div style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.2px' }}>TalentCare</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Indicadores</div>
            </div>
            <button
              onClick={alternarMenu}
              className="tc-btn"
              aria-label="Recolher o menu"
              title="Recolher o menu — é assim que o gestor vê o sistema"
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-mute)', cursor: 'pointer', flex: 'none' }}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-mute)', padding: '12px 12px 6px' }}>Visão geral</div>
            {NAV_MAIN.map((it) => {
              const Icon = it.icon
              return (
                <Link key={it.href} href={it.href} className={'tc-nav' + (isActive(pathname, it.href) ? ' on' : '')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px', borderRadius: 8, color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                </Link>
              )
            })}

            <button
              type="button"
              onClick={() => setSystemsOpen((v) => !v)}
              aria-expanded={systemsOpen}
              className={'tc-nav' + (!systemsOpen && systemsActive ? ' on' : '')}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px', borderRadius: 8, color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}
            >
              <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Boxes size={18} /></span>
              <span style={{ flex: 1, textAlign: 'left' }}>Sistemas</span>
              <span style={{ display: 'flex', transition: 'transform .18s', transform: systemsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}><ChevronDown size={16} /></span>
            </button>
            {systemsOpen && NAV_SYSTEMS.map((it) => {
              const Icon = it.icon
              return (
                <Link key={it.href} href={it.href} className={'tc-nav' + (isActive(pathname, it.href) ? ' on' : '')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px 9px 28px', borderRadius: 8, color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                </Link>
              )
            })}

            {/* ⚠️ Para TODA a Diretoria desde 11/09/2026 (era só o dono): a régua geral
                de pontuação mora em Configurações e a Diretoria também a altera. As
                abas que são só do dono (usuários, equipe, ponto…) a própria página
                esconde de quem não é dono. */}
            {!soMeuSetor && (
              <>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-mute)', padding: '16px 12px 6px' }}>Administração</div>
                {NAV_ADMIN.map((it) => {
                  const Icon = it.icon
                  return (
                    <Link key={it.href} href={it.href} className={'tc-nav' + (isActive(pathname, it.href) ? ' on' : '')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px', borderRadius: 8, color: 'var(--text-dim)' }}>
                      <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 'var(--radius-sm)' }}>
              <Avatar id={me.id} hasAvatar={me.hasAvatar} initials={initials.toUpperCase()} color="var(--chart-3)" size={34} />
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.cargo ? `${me.cargo} · ${roleLabel}` : roleLabel}</div>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })} aria-label="Sair" title="Sair" className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-mute)', display: 'flex', cursor: 'pointer', padding: 2 }}><ChevronRight size={16} /></button>
            </div>
          </div>
        </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar soMeuSetor={semLateral} podeVoltar={!soMeuSetor} onVoltar={alternarMenu} meusSetores={meusSetores} nome={name} me={me} initials={initials} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 56px' }}>{children}</main>
        </div>
      </div>
     </PainelDaPessoaProvider>
     </OrigemProvider>
     </TalentDataProvider>
    </PeriodProvider>
  )
}
