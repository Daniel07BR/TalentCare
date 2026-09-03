'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, Trophy, TrendingUp, GraduationCap, ScrollText,
  FileText, SlidersHorizontal, Search, Bell, ChevronRight, ChevronDown, Sun, Moon, UserCog, Radio, MessageCircle,
  MessagesSquare, LifeBuoy, Landmark, UserPlus, AlarmClock, Boxes, Truck, MessageSquareText,
  ClipboardCheck, UserCircle, CalendarDays,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { PeriodProvider, usePeriod } from '@/lib/ui/period'
import { TalentDataProvider } from '@/lib/ui/data'
import Logo from './Logo'
import Avatar from './Avatar'
import type { Period } from '@/lib/mock/dashboard'
import type { TalentData } from '@/lib/mock/data'

// Visão geral: só até Ranking aparece direto no topo.
const NAV_MAIN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/departamentos', label: 'Departamentos', icon: Building2 },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  // A fila de avaliações do mês. O selo ao lado traz "quantas faltam" — ver
  // useFaltamAvaliar: é DERIVADO da fila, nunca um contador gravado.
  { href: '/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  // A página da própria pessoa. Fica no topo de propósito: é a única do sistema
  // que TODO funcionário alcança, e escondê-la num menu faria o colaborador
  // entrar e achar que não há nada para ele.
  { href: '/minha-avaliacao', label: 'Meu desempenho', icon: UserCircle },
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
  { href: '/equipe', label: 'Equipe interna', icon: UserPlus },
  { href: '/escolaridade', label: 'Escolaridade', icon: ScrollText },
  { href: '/ponto', label: 'Casar ponto', icon: AlarmClock },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
  { href: '/usuarios', label: 'Usuários', icon: UserCog },
  { href: '/avaliadores', label: 'Quem avalia', icon: ClipboardCheck },
]
// ⚠️ `custom` NÃO entra aqui: ele nasce de escolher datas no calendário. Um
// botão "custom" que não abre nada seria um botão que não faz nada.
const PERIODS: Period[] = ['7d', '30d', 'Trimestre', 'Ano']

/**
 * Quantas pessoas AINDA não têm avaliação publicada na competência corrente,
 * no alcance de quem está logado.
 *
 * ⚠️⚠️ Vem da fila, que é DERIVADA (avaliáveis menos publicadas). Não há — e não
 * pode haver — um contador gravado: um número desses só é escrito por um
 * caminho, e no dia em que alguém trocar de setor ou for admitido no meio do
 * mês o selo fica aceso para sempre. Selo que mente uma vez é ignorado para
 * sempre depois.
 */
function useFaltamAvaliar(): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    let vivo = true
    fetch('/api/avaliacoes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { faltam?: number } | null) => { if (vivo && j) setN(j.faltam ?? 0) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  return n
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

function Topbar({ soMeuSetor = false, meusSetores = [], nome = '', me, initials = '' }: {
  soMeuSetor?: boolean
  meusSetores?: { id: string; name: string }[]
  nome?: string
  me?: { id: string; cargo: string | null; hasAvatar: boolean }
  initials?: string
}) {
  const { period, setPeriod, from, to, setRange, label } = usePeriod()
  const [calOpen, setCalOpen] = useState(false)
  // Nada de data futura: atividade de amanhã não existe, e o campo aberto até
  // 2099 convida a um intervalo que sempre volta vazio.
  const hojeISO = new Date().toISOString().slice(0, 10)
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [search, setSearch] = useState('')

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
          <Logo size={30} radius={8} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, overflowX: 'auto' }}>
            {meusSetores.map((d) => (
              <Link key={d.id} href={`/departamentos/${d.id}`}
                className={'tc-nav' + (pathname === `/departamentos/${d.id}` ? ' on' : '')}
                style={navChip}>{d.name}</Link>
            ))}
            <Link href="/avaliacoes" className={'tc-nav' + (pathname.startsWith('/avaliacoes') ? ' on' : '')} style={navChip}>Avaliações</Link>
            <Link href="/minha-avaliacao" className={'tc-nav' + (pathname === '/minha-avaliacao' ? ' on' : '')} style={navChip}>Meu desempenho</Link>
          </nav>
        </div>
      )}

      <div style={{ position: 'relative', flex: soMeuSetor ? 'none' : 1, maxWidth: 420, display: soMeuSetor ? 'none' : 'block' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex' }}><Search size={16} /></span>
        <input
          placeholder="Buscar funcionários, departamentos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 38px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>
      <div style={{ flex: 1 }} />
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
          {period === 'custom' ? label : 'Período'}
        </button>
      </div>

      {calOpen && (
        <div style={{ position: 'absolute', top: 58, right: 120, zIndex: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,.18)', minWidth: 250 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Intervalo de datas</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)' }}>
              De
              <input type="date" value={from} max={to || hojeISO} onChange={(e) => setRange(e.target.value, to)}
                style={inputData} />
            </label>
            <label style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)' }}>
              Até
              <input type="date" value={to} min={from} max={hojeISO} onChange={(e) => setRange(from, e.target.value)}
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
          {(!from || !to) && (
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
  const faltam = useFaltamAvaliar()
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
      <div className={'app' + (settled ? ' stld' : '')} style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
{!soMeuSetor && (
        <aside style={{ width: 240, flex: 'none', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
            <Logo size={34} radius={9} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.2px' }}>TalentCare</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Indicadores</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-mute)', padding: '12px 12px 6px' }}>Visão geral</div>
            {NAV_MAIN.map((it) => {
              const Icon = it.icon
              const selo = it.href === '/avaliacoes' && faltam > 0 ? faltam : null
              return (
                <Link key={it.href} href={it.href} className={'tc-nav' + (isActive(pathname, it.href) ? ' on' : '')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px', borderRadius: 8, color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                  {selo != null && (
                    <span title={`${selo} ${selo === 1 ? 'pessoa ainda não avaliada' : 'pessoas ainda não avaliadas'} neste mês`}
                      style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--warning)', color: '#fff', borderRadius: 20, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{selo}</span>
                  )}
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

            {isOwner && (
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
          <Topbar soMeuSetor={soMeuSetor} meusSetores={meusSetores} nome={name} me={me} initials={initials} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 56px' }}>{children}</main>
        </div>
      </div>
     </TalentDataProvider>
    </PeriodProvider>
  )
}
