'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, Trophy, TrendingUp, GraduationCap, ScrollText, IdCard,
  FileText, SlidersHorizontal, Search, Bell, ChevronRight, Sun, Moon, UserCog, Radio, MessageCircle,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { PeriodProvider, usePeriod } from '@/lib/ui/period'
import { TalentDataProvider } from '@/lib/ui/data'
import Logo from './Logo'
import Avatar from './Avatar'
import type { Period } from '@/lib/mock/dashboard'
import type { TalentData } from '@/lib/mock/data'

const NAV_MAIN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/departamentos', label: 'Departamentos', icon: Building2 },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/turnover', label: 'Turnover', icon: TrendingUp },
  { href: '/classroom', label: 'ClassRoom', icon: GraduationCap },
  { href: '/radio', label: 'Rádio', icon: Radio },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
]
const NAV_SYS = [
  { href: '/cadastro', label: 'Cadastro', icon: IdCard },
  { href: '/escolaridade', label: 'Escolaridade', icon: ScrollText },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
  { href: '/usuarios', label: 'Usuários', icon: UserCog },
]
const PERIODS: Period[] = ['7d', '30d', 'Trimestre', 'Ano']

function isActive(pathname: string, href: string): boolean {
  if (href === '/funcionarios') return pathname.startsWith('/funcionarios')
  if (href === '/departamentos') return pathname.startsWith('/departamentos')
  return pathname === href || pathname.startsWith(href + '/')
}

function Topbar() {
  const { period, setPeriod } = usePeriod()
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
      <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
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
      </div>
      <button onClick={toggleTheme} className="tc-btn" aria-label="Alternar tema" style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button className="tc-btn" aria-label="Notificações" style={{ position: 'relative', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
        <Bell size={18} />
        <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--surface-2)' }} />
      </button>
    </header>
  )
}

export default function AppShell({ name, roleLabel, me, data, children }: { name: string; roleLabel: string; me: { id: string; cargo: string | null; hasAvatar: boolean }; data: TalentData; children: React.ReactNode }) {
  const pathname = usePathname()
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    setSettled(false)
    const t = setTimeout(() => setSettled(true), 1400)
    return () => clearTimeout(t)
  }, [pathname])

  const initials = (name.split(' ')[0]?.[0] ?? '') + (name.split(' ').slice(-1)[0]?.[0] ?? '')

  return (
    <PeriodProvider>
     <TalentDataProvider value={data}>
      <div className={'app' + (settled ? ' stld' : '')} style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
        <aside style={{ width: 240, flex: 'none', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
            <Logo size={34} radius={9} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.2px' }}>TalentCare</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Grupo Itamarathy</div>
            </div>
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
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-mute)', padding: '16px 12px 6px' }}>Sistema</div>
            {NAV_SYS.map((it) => {
              const Icon = it.icon
              return (
                <Link key={it.href} href={it.href} className={'tc-nav' + (isActive(pathname, it.href) ? ' on' : '')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', fontSize: 13, fontWeight: 500, padding: '9px 12px', borderRadius: 8, color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                </Link>
              )
            })}
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

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 56px' }}>{children}</main>
        </div>
      </div>
     </TalentDataProvider>
    </PeriodProvider>
  )
}
