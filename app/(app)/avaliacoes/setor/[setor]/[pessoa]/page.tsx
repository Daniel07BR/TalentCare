'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, LineChart, Grid3x3 } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../../../Avatar'
import { Cartao } from '../../../../_visao/ui'
import s from '../../../../_visao/visao.module.css'
import p from '../../_painel/painel.module.css'
import { Legenda, LinhaMedia, MapaPontos, Selo, cor, type NivelKey } from '../../_painel/graficos'

/* ============================================================
   O HISTÓRICO DE UMA PESSOA (02/10/2026): a média no tempo, os três pontos mês
   a mês e a linha do tempo com o que foi escrito — exemplos, recado, combinado,
   o que a pessoa respondeu e se o papel foi assinado.

   ⚠️ A parte da GESTÃO aparece aqui (é a tela da gestão), mas a API nunca a
   manda quando quem abre é a própria pessoa — nem o número.
   ============================================================ */

type Av = {
  competencia: string; nivel: NivelKey | null; media: number | null; versao: number
  publicadaEm: string | null; avaliador: string
  notas: { criterio: string; label: string; nivel: NivelKey | null; justificativa: string | null }[]
  recado: string | null; combinado: string | null
  ciencia: { em: string; comentario: string | null; atual: boolean } | null
  concluidaEm: string | null; soPdf: boolean
  gestao: { emRisco: boolean | null; prontoParaMais: boolean | null; querNaEquipe: boolean | null; anotacao: string | null } | null
}
type Dados = {
  setor: { id: string; nome: string; endereco: string }
  pessoa: { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean; endereco: string }
  souEu: boolean; meses: string[]; avaliacoes: Av[]
}

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const simNao = (v: boolean | null) => (v == null ? '—' : v ? 'Sim' : 'Não')

export default function PainelDaPessoa({ params }: { params: Promise<{ setor: string; pessoa: string }> }) {
  const { setor, pessoa } = use(params)
  const router = useRouter()
  const sp = useSearchParams()
  const meses = Number(sp.get('meses') ?? 12)
  const [d, setD] = useState<Dados | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'negado' | 'erro'>('carregando')

  useEffect(() => {
    let vivo = true
    fetch(`/api/avaliacoes/painel/pessoa?setor=${encodeURIComponent(setor)}&pessoa=${encodeURIComponent(pessoa)}&meses=${meses}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 403 || r.status === 404) { if (vivo) setEstado('negado'); return }
        if (!r.ok) throw new Error(String(r.status))
        const j = (await r.json()) as Dados
        if (!vivo) return
        const certo = `${j.setor.endereco}/${j.pessoa.endereco}`
        if (certo !== `${decodeURIComponent(setor)}/${decodeURIComponent(pessoa)}`) router.replace(`/avaliacoes/setor/${certo}${meses !== 12 ? `?meses=${meses}` : ''}`)
        setD(j)
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [setor, pessoa, meses, router])

  if (!d) {
    return (
      <div className={`${s.raiz} ${p.niveis}`}>
        <Link href={`/avaliacoes/setor/${setor}`} style={{ fontSize: 13, color: 'var(--n-text-2)' }}>‹ Voltar ao setor</Link>
        <div className={s.cartao} style={{ marginTop: 16, fontSize: 13, color: 'var(--n-text-2)' }}>
          {estado === 'negado' ? 'Você não tem acesso ao histórico desta pessoa.' : estado === 'erro' ? 'Não foi possível carregar. Tente recarregar a página.' : 'Carregando o histórico…'}
        </div>
      </div>
    )
  }

  const porMes = new Map(d.avaliacoes.map((a) => [a.competencia, a]))
  const ultima = d.avaliacoes[0] ?? null // a API manda da mais nova para a mais velha
  const anterior = d.avaliacoes[1] ?? null
  const ordemNivel = (k: NivelKey | null) => ['abaixo', 'parte', 'atende', 'acima'].indexOf(k ?? '')
  const rumo = ultima && anterior ? Math.sign(ordemNivel(ultima.nivel) - ordemNivel(anterior.nivel)) : null
  const assinadas = d.avaliacoes.filter((a) => a.concluidaEm).length
  const primeiro = d.pessoa.nome.split(' ')[0]
  const temNumero = d.avaliacoes.some((a) => a.media != null)

  return (
    <div className={`tc-anim ${s.raiz} ${p.niveis}`}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
        <Link href={`/avaliacoes/setor/${d.setor.endereco}`} style={{ color: 'var(--n-text-2)' }}>‹ Avaliações · {d.setor.nome}</Link>
      </div>

      <header className={p.faixa}>
        <div className={p.heroPessoa}>
          <Avatar id={d.pessoa.id} hasAvatar={d.pessoa.hasAvatar} initials={iniciais(d.pessoa.nome)} color="var(--n-blue)" size={58} radius={16} />
          <div>
            <h1 className={p.faixaTitulo}>{d.pessoa.nome}</h1>
            <div className={p.faixaSub}>{d.pessoa.cargo} · {d.pessoa.setor} · <span className={p.faixaAcento}>{d.avaliacoes.length} {d.avaliacoes.length === 1 ? 'mês avaliado' : 'meses avaliados'}</span></div>
          </div>
        </div>
        <div className={p.faixaDireita}><Legenda claro /></div>
      </header>

      <div className={p.tiles}>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Último resultado</span>
          {ultima ? <Selo nivel={ultima.nivel} grande /> : <span className={p.tileValor}>—</span>}
          <span className={p.tileNota} style={{ textTransform: 'capitalize' }}>{ultima ? competenciaLabel(ultima.competencia) : 'ainda sem avaliação publicada'}</span>
        </div>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Rumo</span>
          <span className={p.tileValor} style={{ color: rumo === 1 ? 'var(--lv-atende)' : rumo === -1 ? 'var(--lv-abaixo)' : undefined }}>
            {rumo === 1 ? '↑ Subiu' : rumo === -1 ? '↓ Caiu' : rumo === 0 ? '→ Manteve' : '—'}
          </span>
          <span className={p.tileNota}>{rumo == null ? 'precisa de dois meses avaliados' : 'em relação ao mês anterior avaliado'}</span>
        </div>
        <div className={p.tile}>
          <span className={p.tileRotulo}>Assinadas</span>
          <span className={p.tileValor}>{assinadas}<span style={{ fontSize: 15, color: 'var(--n-text-3)', fontWeight: 600 }}> de {d.avaliacoes.length}</span></span>
          <div className={p.progresso}><span style={{ width: `${d.avaliacoes.length ? (assinadas / d.avaliacoes.length) * 100 : 0}%`, background: 'var(--lv-acima)' }} /></div>
        </div>
        {ultima?.gestao && (
          <div className={p.tile}>
            <span className={p.tileRotulo}>Gestão · último mês</span>
            <span className={p.tileNota}>Quero na equipe: <b>{simNao(ultima.gestao.querNaEquipe)}</b></span>
            <span className={p.tileNota}>Pronto para mais: <b>{simNao(ultima.gestao.prontoParaMais)}</b></span>
            <span className={p.tileNota} style={{ color: ultima.gestao.emRisco ? 'var(--lv-abaixo)' : undefined }}>Em risco: <b>{simNao(ultima.gestao.emRisco)}</b></span>
          </div>
        )}
      </div>

      {d.avaliacoes.length === 0 ? (
        <Cartao><div className={p.vazio}>{primeiro} ainda não tem avaliação publicada no período.</div></Cartao>
      ) : (
        <>
          <div className={p.dois}>
            {temNumero ? (
              <Cartao titulo="A média ao longo do tempo" sub="Sobre as faixas dos níveis. Só a gestão vê o número." Icone={LineChart} corIcone="var(--n-blue)">
                <LinhaMedia pontos={d.meses.map((c) => ({ competencia: c, media: porMes.get(c)?.media ?? null }))} />
              </Cartao>
            ) : (
              <Cartao titulo="A média ao longo do tempo" Icone={LineChart}><div className={p.vazio}>Na sua própria página o número não aparece.</div></Cartao>
            )}
            <Cartao titulo="Os três pontos, mês a mês" sub="Cada linha é um ponto; cada quadro, um mês." Icone={Grid3x3} corIcone="var(--n-green)">
              <MapaPontos meses={d.meses} linhas={(ultima?.notas ?? []).map((cr) => ({
                label: cr.label,
                celulas: Object.fromEntries(d.meses.filter((c) => porMes.has(c)).map((c) => [c, { nivel: porMes.get(c)!.notas.find((x) => x.criterio === cr.criterio)?.nivel ?? null }])),
              }))} />
            </Cartao>
          </div>

          <Cartao titulo="Linha do tempo" sub="O que foi escrito em cada mês, do mais novo ao mais velho." Icone={CalendarDays} corIcone="var(--n-orange)">
            <div className={p.tempo}>
              {d.avaliacoes.map((a) => <Mes key={a.competencia} a={a} pessoaId={d.pessoa.id} primeiro={primeiro} />)}
            </div>
          </Cartao>
        </>
      )}
    </div>
  )
}

function Mes({ a, pessoaId, primeiro }: { a: Av; pessoaId: string; primeiro: string }) {
  const doc = (lado: string) => `/api/avaliacoes/${pessoaId}/documento?competencia=${a.competencia}&lado=${lado}`
  return (
    <article className={p.mesCartao} style={{ ['--c' as string]: cor(a.nivel) }}>
      <div className={p.mesTopo}>
        <span className={p.mesNome}>{competenciaLabel(a.competencia)}</span>
        <Selo nivel={a.nivel} />
        {a.media != null && <span style={{ fontSize: 12, color: 'var(--n-text-3)' }}>média {a.media.toFixed(1).replace('.', ',')}</span>}
        <span className={p.mesMeta}>
          por {a.avaliador}{a.versao > 1 ? ` · v${a.versao}` : ''}
          {' · '}{a.ciencia ? (a.ciencia.atual ? '✓ ciência' : 'ciência de versão anterior') : 'sem ciência'}
          {' · '}{a.concluidaEm
            ? <>🔒 assinada {a.soPdf
                ? <a href={doc('pdf')} target="_blank" rel="noreferrer" style={{ color: 'var(--n-blue)' }}>(PDF)</a>
                : <><a href={doc('frente')} target="_blank" rel="noreferrer" style={{ color: 'var(--n-blue)' }}>(frente</a>{' · '}<a href={doc('verso')} target="_blank" rel="noreferrer" style={{ color: 'var(--n-blue)' }}>verso)</a></>}</>
            : 'falta o documento assinado'}
        </span>
      </div>

      <div className={p.pontos}>
        {a.notas.map((n) => (
          <div key={n.criterio} className={p.ponto}>
            <div className={p.pontoNome}>{n.label}<Selo nivel={n.nivel} curto /></div>
            {n.justificativa ?? <span style={{ color: 'var(--n-text-3)' }}>Sem exemplo escrito.</span>}
          </div>
        ))}
      </div>

      {(a.recado || a.combinado || a.ciencia?.comentario || a.gestao) && (
        <div className={p.textos}>
          {a.recado && <div className={p.texto} style={{ ['--t' as string]: 'var(--lv-acima)' }}><b>Recado do avaliador</b>{a.recado}</div>}
          {a.combinado && <div className={p.texto} style={{ ['--t' as string]: 'var(--lv-atende)' }}><b>Combinado para o mês seguinte</b>{a.combinado}</div>}
          {a.ciencia?.comentario && <div className={p.texto} style={{ ['--t' as string]: 'var(--n-blue)' }}><b>O que {primeiro} respondeu</b>{a.ciencia.comentario}</div>}
          {a.gestao && (
            <div className={p.texto} style={{ ['--t' as string]: 'var(--n-text-3)' }}>
              <b>🔒 Só a gestão</b>
              Quero na equipe: {simNao(a.gestao.querNaEquipe)} · Pronto para mais: {simNao(a.gestao.prontoParaMais)} · Em risco: {simNao(a.gestao.emRisco)}
              {a.gestao.anotacao && `\n${a.gestao.anotacao}`}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
