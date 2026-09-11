'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, CalendarDays, LayoutGrid } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { PeriodProvider, usePeriod } from '@/lib/ui/period'
import { TalentDataProvider } from '@/lib/ui/data'
import { OrigemProvider } from '@/lib/ui/origem'
import { TODAS_AS_TELAS, type GrupoTelas } from '@/lib/ui/menu'
import type { Alcance } from '@/lib/alcance-recorte'
import { PainelDaPessoaProvider } from './PainelDaPessoa'
import BuscaGlobal from './BuscaGlobal'
import JanelaMenu from './JanelaMenu'
import Logo from './Logo'
import Avatar from './Avatar'
import s from './navegacao.module.css'
import type { Period } from '@/lib/mock/dashboard'
import type { TalentData } from '@/lib/mock/data'

/* ============================================================
   ⚠️⚠️ O MENU LATERAL SAIU (11/09/2026, pedido do dono). A barra de cima é a
   navegação de todo mundo; as telas que eram itens do menu viraram CARTÕES numa
   janela central (`JanelaMenu.tsx`), aberta pelo botão onde antes ficava o
   "mostrar o menu". A lista das telas mora em `lib/ui/menu.ts` — é também de
   onde o "voltar" das telas de detalhe tira os nomes.

   O que saiu junto, por decisão do dono:
   - o modo "VENDO COMO GESTOR" (recolher o menu era a prévia da barra do
     gestor, com selo) — sem menu, não há o que recolher;
   - os chips Avaliações e Meu desempenho da barra da Diretoria (viraram
     cartões; o gestor segue com eles);
   - o sino de notificações, que tinha um ponto vermelho FIXO e não fazia nada
     ao clicar (regra (d) da casa: nada de enfeite com cara de aviso).

   Histórico do que já tinha saído do menu antes (11/09/2026): Ranking (o
   endereço leva ao painel), Serviços do setor (a planilha se sobe dentro do
   relatório de cada setor), Relatórios, e Casar ponto / Quem avalia / Usuários /
   Equipe interna / Escolaridade (abas de Configurações; `/ponto` e
   `/avaliadores` seguem por endereço).
   ============================================================ */

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

/** Item da barra enxuta de quem não é Diretoria. */
const navChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500,
  padding: '7px 12px', borderRadius: 8, color: 'var(--text-dim)', whiteSpace: 'nowrap',
}

/** Estilo dos dois campos de data do calendário. */
const inputData: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 4,
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  padding: '6px 8px', fontSize: 12.5, fontFamily: 'inherit',
  colorScheme: 'light dark', // o calendário nativo acompanha o tema da conta
}

const botaoQuadrado: React.CSSProperties = {
  width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--text-dim)', cursor: 'pointer',
}

function Topbar({ soMeuSetor, onAbrirMenu, meusSetores, nome, cargo, me, initials, alcance }: {
  soMeuSetor: boolean
  /** Abre a janela de cartões. Ausente = a sessão não recebeu cartão nenhum. */
  onAbrirMenu?: () => void
  meusSetores: { id: string; name: string }[]
  nome: string
  cargo: string
  me: { id: string; cargo: string | null; hasAvatar: boolean }
  initials: string
  alcance: Alcance
}) {
  const { period, setPeriod, from, to, setRange, fromDay, toDay, datas } = usePeriod()
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
    <header className={`${s.barra} ${soMeuSetor ? s.comChips : ''}`}>
      <div className={s.inicio}>
        {/* ⚠️ O botão da janela SÓ existe para quem recebeu cartões (a Diretoria).
            `data-menu-telas` é a marca que o ensaio procura no HTML. */}
        {onAbrirMenu && (
          <button type="button" onClick={onAbrirMenu} className={`tc-btn ${s.botaoMenu}`} data-menu-telas=""
            aria-label="Abrir a janela com todas as telas" aria-haspopup="dialog" title="Todas as telas">
            <LayoutGrid size={18} />
          </button>
        )}
        {soMeuSetor ? (
          <Logo size={30} radius={8} />
        ) : (
          <Link href="/dashboard" className={s.marca} title="Ir ao painel principal">
            <Logo size={30} radius={8} />
            <span className={s.marcaNome}>TalentCare</span>
          </Link>
        )}
      </div>

      {/*
        ⚠️⚠️ A NAVEGAÇÃO DE QUEM NÃO É DIRETORIA. "Sem menu" não pode virar "sem
        saída": o gestor precisa alcançar a fila de avaliações e a própria página
        de desempenho, e quem avalia mais de um setor (a Rosemeire avalia Limpeza
        e Cozinha) precisa trocar entre eles. Tirar tudo o deixaria preso numa
        página só, sem nem conseguir ver a própria nota.
      */}
      {soMeuSetor && (
        <nav className={s.chips} aria-label="Seus setores e avaliações">
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
      )}

      {/* A busca de verdade: pessoas e departamentos — ver BuscaGlobal.tsx.
          ⚠️ Desde 11/09/2026 também para o gestor (decisão do dono), recortada
          pelo alcance dele: só oferece o que ele consegue abrir. */}
      <div className={s.busca}>
        <BuscaGlobal alcance={alcance} />
      </div>

      <div className={s.periodo}>
        <div className={s.periodoRolagem}>
          {/* ⚠️ CARD DE MESES — atalho para os 3 meses fechados + o atual. Ele SETA
              o mesmo intervalo `custom` do calendário (setRange), então o resto da
              tela não precisa saber que ele existe: obedece ao mesmo contrato de
              período. Aceso quando o intervalo custom bate com o mês. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, flex: 'none' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, flex: 'none' }}>
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
              aria-expanded={calOpen}
              style={{ fontSize: 12, padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            >
              <CalendarDays size={14} />
              {/* ⚠️ As DATAS em qualquer período — não só no intervalo escolhido à
                  mão. Em 7d/30d/Trimestre/Ano o botão dizia só "Período", e não havia
                  onde ler de que dia a que dia os números falavam. */}
              {datas}
            </button>
          </div>
        </div>

        {/* ⚠️ O calendário fica FORA da faixa que rola (`periodoRolagem`): dentro
            dela, no celular, a caixa seria cortada pela própria rolagem. */}
        {calOpen && (
          <div className={s.calendario}>
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
      </div>

      <div className={s.acoes}>
        <button onClick={toggleTheme} className="tc-btn" aria-label="Alternar tema" style={botaoQuadrado}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {/* Sem barra lateral, a identidade e a saída moram aqui — senão a pessoa
            não tem como sair do sistema. */}
        <div className={s.pessoa} title={cargo}>
          <Avatar id={me.id} hasAvatar={me.hasAvatar} initials={initials} color="var(--chart-1)" size={30} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div className={s.nome} style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{nome.split(' ').slice(0, 2).join(' ')}</div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--text-mute)', cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function AppShell({ name, roleLabel, soMeuSetor = false, meusSetores = [], cartoes = [], alcance, me, data, children }: {
  name: string; roleLabel: string
  /** Gestor e sub-encarregado: a barra com os setores deles, sem cartões. */
  soMeuSetor?: boolean
  /** Os setores que ele alcança — o dele e os que avalia. */
  meusSetores?: { id: string; name: string }[]
  /** Os cartões da janela, já decididos no servidor (`cartoesDoMenu`). */
  cartoes?: GrupoTelas[]
  /** O recorte do dataset — a busca não oferece o que a pessoa não abre. */
  alcance: Alcance
  me: { id: string; cargo: string | null; hasAvatar: boolean }; data: TalentData; children: React.ReactNode
}) {
  const pathname = usePathname()
  const [settled, setSettled] = useState(false)
  const [janelaAberta, setJanelaAberta] = useState(false)
  // ⚠️ Estável: a janela reinstala o foco e a trava de rolagem quando isto muda.
  const fecharJanela = useCallback(() => setJanelaAberta(false), [])

  useEffect(() => {
    setSettled(false)
    const t = setTimeout(() => setSettled(true), 1400)
    return () => clearTimeout(t)
  }, [pathname])

  /* ⚠️ A chave `tc-menu` guardava o menu recolhido (o modo "vendo como gestor").
     Sem menu ela não quer dizer mais nada — some, para ninguém carregar um
     estado que a tela não sabe mais ler. */
  useEffect(() => {
    try { localStorage.removeItem('tc-menu') } catch { /* noop */ }
  }, [])

  const initials = ((name.split(' ')[0]?.[0] ?? '') + (name.split(' ').slice(-1)[0]?.[0] ?? '')).toUpperCase()
  const temCartoes = cartoes.some((g) => g.telas.length > 0)

  return (
    <PeriodProvider>
     <TalentDataProvider value={data}>
     {/* O rastro de onde a pessoa veio — o "voltar" das telas de detalhe. Os
         nomes das telas saem da MESMA lista dos cartões (`lib/ui/menu.ts`). */}
     <OrigemProvider rotulos={TODAS_AS_TELAS}>
     {/* O painel lateral "o que a pessoa fez neste sistema" — ver PainelDaPessoa.tsx. */}
     <PainelDaPessoaProvider>
      <div className={'app' + (settled ? ' stld' : '')} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}>
        <Topbar soMeuSetor={soMeuSetor} onAbrirMenu={temCartoes ? () => setJanelaAberta(true) : undefined}
          meusSetores={meusSetores} nome={name} cargo={me.cargo ? `${me.cargo} · ${roleLabel}` : roleLabel}
          me={me} initials={initials} alcance={alcance} />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '28px 32px 56px' }}>{children}</main>
      </div>
      {/* ⚠️ FORA da barra: ela tem `backdrop-filter`, que faz dela o bloco de
          referência de quem é `position: fixed` — a janela ficaria presa nos
          60 px da barra. */}
      {janelaAberta && temCartoes && <JanelaMenu grupos={cartoes} onFechar={fecharJanela} />}
     </PainelDaPessoaProvider>
     </OrigemProvider>
     </TalentDataProvider>
    </PeriodProvider>
  )
}
