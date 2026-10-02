'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, LineChart, ListChecks, Users } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../../Avatar'
import { Cartao } from '../../../_visao/ui'
import s from '../../../_visao/visao.module.css'
import p from '../_painel/painel.module.css'
import {
  BarrasCriterio, ColunasMes, Legenda, LinhaMedia, Selo, cor, mesCurto, nivelUi,
  type Contagem, type NivelKey,
} from '../_painel/graficos'

/* ============================================================
   AVALIAÇÕES DO SETOR — o histórico ao longo do tempo (02/10/2026).

   Pedido do Daniel: "monitorar todo o histórico de avaliações, dashboard do
   departamento e dos funcionários — muito bonito, fácil de compreender, com as
   cores do PDF". De cima para baixo, a leitura vai do geral ao particular:
   o mês (azulejos) → o tempo (colunas e média) → os pontos → cada pessoa.

   ⚠️ Endereço legível (`/avaliacoes/setor/ti-x8k2p9`): se o nome do setor
   mudou, a página troca para o endereço novo sem quebrar o link antigo.
   ============================================================ */

type Celula = { nivel: NivelKey | null; media: number | null; status: string; concluida: boolean; ciente: boolean } | null
type Pessoa = {
  id: string; nome: string; cargo: string; hasAvatar: boolean; endereco: string; souEu: boolean; ativo: boolean
  meses: Record<string, Celula>; tendencia: 'sobe' | 'desce' | 'igual' | null
  gestao: { emRisco: boolean | null; prontoParaMais: boolean | null; querNaEquipe: boolean | null } | null
}
type Painel = {
  setor: { id: string; nome: string; endereco: string }
  meses: string[]; ultimo: string | null
  resumo: { competencia: string; niveis: Contagem; avaliados: number; quadro: number; concluidas: number; media: number | null }[]
  criterios: { key: string; label: string; niveis: Contagem }[]
  pessoas: Pessoa[]
}

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const nivelDaMedia = (m: number | null): NivelKey | null => (m == null ? null : m <= 4 ? 'abaixo' : m <= 6 ? 'parte' : m <= 8 ? 'atende' : 'acima')

export default function PainelDoSetor({ params }: { params: Promise<{ setor: string }> }) {
  const { setor } = use(params)
  const router = useRouter()
  const sp = useSearchParams()
  const meses = Number(sp.get('meses') ?? 12)
  const [d, setD] = useState<Painel | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')

  useEffect(() => {
    let vivo = true
    setEstado('carregando')
    fetch(`/api/avaliacoes/painel?setor=${encodeURIComponent(setor)}&meses=${meses}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 403 || r.status === 404) { if (vivo) setEstado('negado'); return }
        if (!r.ok) throw new Error(String(r.status))
        const j = (await r.json()) as Painel
        if (!vivo) return
        // Link antigo ou com o nome velho: troca para o endereço de agora.
        if (j.setor.endereco !== decodeURIComponent(setor)) router.replace(`/avaliacoes/setor/${j.setor.endereco}${meses !== 12 ? `?meses=${meses}` : ''}`)
        setD(j); setEstado('ok')
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [setor, meses, router])

  if (!d) {
    return (
      <div className={`${s.raiz} ${p.niveis}`}>
        <Link href="/avaliacoes" style={{ fontSize: 13, color: 'var(--n-text-2)' }}>‹ Voltar às avaliações</Link>
        <div className={s.cartao} style={{ marginTop: 16, fontSize: 13, color: 'var(--n-text-2)' }}>
          {estado === 'negado' ? 'Você não tem acesso às avaliações deste setor.' : estado === 'erro' ? 'Não foi possível carregar. Tente recarregar a página.' : 'Carregando o histórico…'}
        </div>
      </div>
    )
  }

  const trocarPeriodo = (n: number) => router.push(`/avaliacoes/setor/${d.setor.endereco}${n !== 12 ? `?meses=${n}` : ''}`)
  const ult = d.resumo.find((r) => r.competencia === d.ultimo) ?? null
  const atencao = d.pessoas.filter((x) => !x.souEu && (x.gestao?.emRisco || (d.ultimo && x.meses[d.ultimo]?.nivel === 'abaixo')))
  const comMedia = d.resumo.some((r) => r.media != null)

  return (
    <div className={`tc-anim ${s.raiz} ${p.niveis}`}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
        <Link href={`/departamentos/${d.setor.id}`} style={{ color: 'var(--n-text-2)' }}>‹ Voltar ao setor</Link>
        <Link href="/avaliacoes" style={{ color: 'var(--n-text-3)' }}>Fila de avaliações</Link>
      </div>

      {/* ── a faixa do topo, a mesma do PDF ── */}
      <header className={p.faixa}>
        <div>
          <h1 className={p.faixaTitulo}>Avaliações · {d.setor.nome}</h1>
          <div className={p.faixaSub}>
            Histórico de <span className={p.faixaAcento}>{d.meses.length} meses</span>, de {competenciaLabel(d.meses[0])} a {competenciaLabel(d.meses[d.meses.length - 1])}
          </div>
        </div>
        <div className={p.faixaDireita}>
          <div className={p.periodo} role="tablist" aria-label="Período">
            {[6, 12, 24].map((n) => (
              <button key={n} type="button" role="tab" aria-selected={d.meses.length === n} className={d.meses.length === n ? p.on : ''} onClick={() => trocarPeriodo(n)}>{n} meses</button>
            ))}
          </div>
          <Legenda claro />
        </div>
      </header>

      {/* ── o mês, em quatro azulejos ── */}
      <div className={p.tiles}>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Resultado do setor</span>
          {ult ? <Selo nivel={nivelDaMedia(ult.media)} grande /> : <span className={p.tileValor}>—</span>}
          <span className={p.tileNota}>
            {ult ? <>em <span style={{ textTransform: 'capitalize' }}>{competenciaLabel(ult.competencia)}</span>{ult.media != null && <> · média {ult.media.toFixed(1).replace('.', ',')}</>}</> : 'nenhuma avaliação publicada no período'}
          </span>
        </div>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Avaliados no mês</span>
          <span className={p.tileValor}>{ult ? ult.avaliados : 0}<span style={{ fontSize: 15, color: 'var(--n-text-3)', fontWeight: 600 }}> de {ult ? ult.quadro : d.pessoas.length}</span></span>
          <div className={p.progresso}><span style={{ width: `${ult && ult.quadro ? (ult.avaliados / ult.quadro) * 100 : 0}%`, background: 'var(--n-blue)' }} /></div>
        </div>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Assinadas</span>
          <span className={p.tileValor}>{ult ? ult.concluidas : 0}<span style={{ fontSize: 15, color: 'var(--n-text-3)', fontWeight: 600 }}> de {ult ? ult.avaliados : 0}</span></span>
          <div className={p.progresso}><span style={{ width: `${ult && ult.avaliados ? (ult.concluidas / ult.avaliados) * 100 : 0}%`, background: 'var(--lv-acima)' }} /></div>
        </div>
        <div className={p.tile} style={atencao.length ? { borderColor: 'color-mix(in srgb, var(--lv-abaixo) 45%, transparent)' } : undefined}>
          <span className={p.tileRotulo}>Pedem atenção</span>
          <span className={p.tileValor} style={{ color: atencao.length ? 'var(--lv-abaixo)' : undefined }}>{atencao.length}</span>
          <span className={p.tileNota}>{atencao.length ? atencao.map((x) => x.nome.split(' ')[0]).join(', ') : 'ninguém em risco nem "Abaixo" no mês'}</span>
        </div>
      </div>

      {/* ── o tempo ── */}
      <div className={p.dois}>
        <Cartao titulo="Como o setor foi avaliado, mês a mês" sub="Quantas pessoas em cada nível. Passe o mouse num mês para ver os números." Icone={BarChart3} corIcone="var(--n-purple)">
          <ColunasMes resumo={d.resumo} />
        </Cartao>
        {comMedia ? (
          <Cartao titulo="A média do setor" sub="Sobre as faixas dos níveis. Só a gestão vê o número." Icone={LineChart} corIcone="var(--n-blue)">
            <LinhaMedia pontos={d.resumo.map((r) => ({ competencia: r.competencia, media: r.media }))} rotulo="Média do setor" />
          </Cartao>
        ) : (
          <Cartao titulo="A média do setor" Icone={LineChart}><div className={p.vazio}>Ainda sem avaliação publicada no período.</div></Cartao>
        )}
      </div>

      <div className={p.bloco}>
        <Cartao titulo={d.ultimo ? `Os três pontos em ${competenciaLabel(d.ultimo)}` : 'Os três pontos'} sub="Onde o setor está forte e onde precisa de atenção." Icone={ListChecks} corIcone="var(--n-green)">
          <BarrasCriterio criterios={d.criterios} />
        </Cartao>
      </div>

      {/* ── cada pessoa ── */}
      <Cartao titulo="Pessoas" sub="Cada quadro é um mês. Clique no nome para ver o histórico completo." Icone={Users}>
        {d.pessoas.length === 0 ? <div className={p.vazio}>Ninguém no setor.</div> : (
          <div className={p.mapa}>
            <div className={p.mapaGrade} style={{ gridTemplateColumns: `minmax(230px, 1.4fr) repeat(${d.meses.length}, minmax(54px, 1fr)) 56px minmax(150px, auto)` }}>
              <span />
              {d.meses.map((c) => <span key={c} className={p.mapaCab}>{mesCurto(c)}</span>)}
              <span className={p.mapaCab}>Rumo</span>
              <span className={p.mapaCab} style={{ textAlign: 'left' }}>Gestão</span>

              {d.pessoas.map((x) => (
                <Linha key={x.id} x={x} meses={d.meses} url={`/avaliacoes/setor/${d.setor.endereco}/${x.endereco}`} />
              ))}
            </div>
          </div>
        )}
        <div className={p.rodapeLegenda}>
          <Legenda />
          <span>🔒 assinada</span>
          <span>· deu ciência</span>
          <span>quadro tracejado = sem avaliação</span>
          <span>pontilhado = rascunho</span>
        </div>
      </Cartao>
    </div>
  )
}

function Linha({ x, meses, url }: { x: Pessoa; meses: string[]; url: string }) {
  const seta = x.tendencia === 'sobe' ? { t: '↑', c: 'var(--lv-atende)', d: 'melhorou' } : x.tendencia === 'desce' ? { t: '↓', c: 'var(--lv-abaixo)', d: 'caiu' } : x.tendencia === 'igual' ? { t: '→', c: 'var(--n-text-3)', d: 'manteve' } : null
  return (
    <>
      <Link href={url} className={p.mapaPessoa}>
        <Avatar id={x.id} hasAvatar={x.hasAvatar} initials={iniciais(x.nome)} color="var(--n-blue)" size={32} radius={10} />
        <span style={{ minWidth: 0 }}>
          <span className={p.mapaNome}>{x.nome}{x.souEu && <span style={{ color: 'var(--n-text-3)', fontWeight: 500 }}> (você)</span>}</span>
          <span className={p.mapaCargo} style={{ display: 'block' }}>{x.cargo}{!x.ativo && ' · desligado'}</span>
        </span>
      </Link>
      {meses.map((c) => {
        const v = x.meses[c]
        if (v?.status === 'fora') return <span key={c} className={`${p.celula} ${p.celulaFora}`} />
        if (!v) return <span key={c} className={`${p.celula} ${p.celulaVazia}`} title={`${competenciaLabel(c)}: sem avaliação`}>—</span>
        if (v.status !== 'publicada') return <span key={c} className={`${p.celula} ${p.celulaRascunho}`} title={`${competenciaLabel(c)}: rascunho`}>rasc.</span>
        const n = nivelUi(v.nivel)
        return (
          <span key={c} className={p.celula} style={{ ['--c' as string]: cor(v.nivel) }}
            title={`${competenciaLabel(c)}: ${n?.label ?? ''}${v.media != null ? ` (${v.media.toFixed(1)})` : ''}${v.concluida ? ' · assinada' : ''}${v.ciente ? ' · deu ciência' : ''}`}>
            {v.concluida && <span className={p.marcaAssinada}>🔒</span>}
            {n?.curto}
            {v.ciente && <small>·</small>}
          </span>
        )
      })}
      <span className={p.tend} style={{ color: seta?.c }} title={seta ? `Em relação ao mês anterior: ${seta.d}` : 'Sem dois meses para comparar'}>{seta?.t ?? ''}</span>
      <span className={p.sinais}>
        {x.gestao?.emRisco && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-abaixo)' }}>em risco</span>}
        {x.gestao?.prontoParaMais && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-acima)' }}>pronto p/ mais</span>}
        {x.gestao?.querNaEquipe === false && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-parte)' }}>retenção?</span>}
      </span>
    </>
  )
}
