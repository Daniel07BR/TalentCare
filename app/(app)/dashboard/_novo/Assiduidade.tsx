'use client'
import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import { mapaDaCasa, LIMITES_CASA, type LinhaPonto } from '@/lib/painel/visao'
import CalendarioOcorrencias from '../../CalendarioOcorrencias'
import { DiaDoMapa } from '../../departamentos/[id]/_visao/DiaDoMapa'
import v from '../../_visao/visao.module.css'
import { Mini } from '../../_visao/ui'
import p from './painel.module.css'
import { Acao, Cabeca, Esqueleto, num } from './pecas'

/* ============================================================
   ASSIDUIDADE E DISCIPLINA DA CASA — com o calendário interativo do relatório do
   setor (pedido do dono, 11/09/2026: "acrescentar a assiduidade e disciplina com
   os calendários interativos, assim como tem nos departamentos").

   ⚠️ Os números pequenos são os do QUADRO ATIVO (a população dos cartões lá de
   cima — os mesmos Atrasos e Advertências). O calendário é de TODO MUNDO fora da
   Diretoria, inclusive quem já saiu, como o do setor: um atraso de quem saiu
   aconteceu. A tela diz isso, porque as duas somas podem diferir.

   ⚠️ A escala de cor é a da CASA (`LIMITES_CASA`) — a do setor satura aqui.
   ============================================================ */

/* Os cinco degraus do mapa na paleta nova (tokens em `visao.module.css`). */
const HEAT = [0, 1, 2, 3, 4].map((i) => `var(--n-heat-${i})`)

/** As linhas do ponto da janela — `/api/assiduidade-mapa`. */
function useMapaDaCasa() {
  const { query } = usePeriod()
  const [r, setR] = useState<{ chaves: string[]; linhas: LinhaPonto[]; pontoAte: string | null; pontoDesde: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let vivo = true
    setLoading(true); setErro(false)
    fetch(`/api/assiduidade-mapa?${query}`, { cache: 'no-store' })
      .then((x) => { if (!x.ok) throw new Error(String(x.status)); return x.json() })
      .then((d) => { if (vivo) setR({ chaves: d.chaves ?? [], linhas: d.linhas ?? [], pontoAte: d.pontoAte ?? null, pontoDesde: d.pontoDesde ?? null }) })
      .catch(() => vivo && setErro(true))
      .finally(() => vivo && setLoading(false))
    return () => { vivo = false }
  }, [query])
  return { r, loading, erro }
}

export function Assiduidade({ periodo, fromDay, toDay, semPonto, motivo, esperando, recarregando, atrasos, advertencias, minutos, abonados, nAtrasos, nMinutos, nAdvertencias, abrirLista, abrirDetalhe, abrirPessoa }: {
  periodo: string; fromDay: string; toDay: string
  /** A janela não foi medida pelo ponto: tudo vira "—", nunca zero. */
  semPonto: boolean; motivo: string
  esperando: boolean; recarregando: boolean
  atrasos: number | string; advertencias: number | string; minutos: number; abonados: number
  /** Quantas pessoas cada lista tem — o número só vira botão se houver quem mostrar. */
  nAtrasos: number; nMinutos: number; nAdvertencias: number
  abrirLista: (qual: 'Atrasos' | 'Advertências' | 'minutos') => void
  abrirDetalhe: () => void
  abrirPessoa: (id: string) => void
}) {
  const data = useTalentData()
  const { r, loading, erro } = useMapaDaCasa()
  const mapa = r ? mapaDaCasa(data, r.chaves, r.linhas) : null
  /* O dia aberto. ⚠️ Trocar o filtro fecha: o dia de outra janela ficaria aberto
     debaixo de um calendário que já não o mostra. */
  const [dia, setDia] = useState<string | null>(null)
  useEffect(() => { setDia(null) }, [fromDay, toDay])
  const doDia = dia && mapa
    ? mapa.quemNoDia.filter((l) => l.day === dia).map((l) => {
        const q = mapa.quem[l.id]
        return { ...l, nome: q.nome, cargo: `${q.setor} · ${q.cargo}`, hasAvatar: q.hasAvatar, saiu: q.saiu }
      })
    : []
  const clica = (n: number, qual: 'Atrasos' | 'Advertências' | 'minutos') => (!semPonto && !esperando && n > 0 ? () => abrirLista(qual) : undefined)
  const v2 = (x: number | string) => (semPonto ? '—' : typeof x === 'number' ? num(x) : x)

  return (
    <section className={v.cartao} style={{ marginBottom: 14 }}>
      <Cabeca Icone={CalendarCheck} titulo="Assiduidade e disciplina" sub={`Ponto eletrônico · ${periodo} · sem a Diretoria`}
        acao={<Acao onClick={abrirDetalhe} dica="Abrir o resumo de assiduidade da casa inteira">Ver detalhes ›</Acao>} />
      <div className={p.assid} style={{ marginBottom: 0 }}>
        <div>
          {esperando ? <Esqueleto linhas={3} alto={56} /> : (
            <div className={recarregando ? p.recarregando : undefined} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <Mini valor={v2(atrasos)} rotulo="Atrasos" tom="orange" onClick={clica(nAtrasos, 'Atrasos')} />
              <Mini valor={v2(minutos)} rotulo="Minutos de atraso" onClick={clica(nMinutos, 'minutos')} />
              <Mini valor={v2(abonados)} rotulo="Atrasos abonados" tom="green" />
              <Mini valor={v2(advertencias)} rotulo="Advertências" tom="red" onClick={clica(nAdvertencias, 'Advertências')} />
              {/* ⚠️ Falta não vem no dump do Nexo: "—", nunca zero. */}
              <Mini valor="—" rotulo="Faltas · sem fonte" />
            </div>
          )}
          <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.45 }}>
            {semPonto ? motivo : 'Os números são do quadro ativo — os mesmos dos cartões lá em cima. Clique num número para ver quem.'}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Atrasos da casa · {periodo}</div>
          <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginBottom: 10, lineHeight: 1.45 }}>
            Cada quadro é um dia; a cor diz quantas pessoas se atrasaram nele (1–{LIMITES_CASA[0] - 1}, {LIMITES_CASA[0]}–{LIMITES_CASA[1] - 1}, {LIMITES_CASA[1]}–{LIMITES_CASA[2] - 1}, {LIMITES_CASA[2]} ou mais) — inclui quem já saiu.{' '}
            <b style={{ color: 'var(--n-text-2)' }}>Clique num dia colorido para ver quem.</b>
          </div>
          {erro ? <div style={{ fontSize: 12.5, color: 'var(--n-red)' }}>Não foi possível ler o ponto agora — recarregue a página.</div>
            : !mapa ? <Esqueleto linhas={5} alto={30} />
            : (
              <div className={loading ? p.recarregando : undefined}>
                <CalendarioOcorrencias dias={mapa.dias} de={fromDay} ate={toDay} pontoAte={r?.pontoAte ?? null} pontoDesde={r?.pontoDesde ?? null} escala="pessoas" paleta={HEAT}
                  limites={LIMITES_CASA} onDia={(iso) => setDia((d) => (d === iso ? null : iso))} selecionado={dia} />
                {dia && doDia.length > 0 && <DiaDoMapa dia={dia} linhas={doDia} onFechar={() => setDia(null)} aoClicar={abrirPessoa} />}
              </div>
            )}
        </div>
      </div>
    </section>
  )
}
