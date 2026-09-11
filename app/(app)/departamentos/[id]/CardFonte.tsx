'use client'
import { useRouter } from 'next/navigation'
import Avatar from '../../Avatar'
import { BotaoDetalhe } from '../../_visao/Detalhe'

/* ============================================================
   O CARTÃO DE UMA FONTE: quem fez, à esquerda; quanto, à direita.

   ⚠️⚠️ Pedido do dono (03/09/2026), e ele está certo por um motivo além do
   visual: uma tira de totais responde "quanto o setor fez" e some com QUEM fez.
   Num relatório lido para decidir sobre gente, o nome é o dado — o total é o
   contexto. A tira antiga era o "monte de números jogados".

   ⚠️ O ranking só lista quem TEM valor naquela fonte. Mostrar a equipe inteira
   com zeros faria a lista acusar quem não passa por aquele sistema — e quase
   ninguém passa pelas oito.
   ============================================================ */

export type Pessoa = {
  id: string; nome: string; cargo: string; hasAvatar: boolean; valor: number
  /** Legenda ao lado de quem está em ZERO — ex.: "último em 02/07". Só a
   *  planilha do setor usa; ver `todos` abaixo. */
  nota?: string
}
export type Numero = { label: string; valor: number | string | null; cor?: string; nota?: string }

const fmt = (v: number | string | null) =>
  v === null ? '—' : typeof v === 'number' ? v.toLocaleString('pt-BR') : v

export function CardFonte({ titulo, sub, cor, Icone, ranking, unidade, ranking2, unidade2, semNinguem, numeros, rodape, todos, onDetalhe }: {
  titulo: string
  sub?: string
  cor: string
  Icone: React.ComponentType<{ size?: number; color?: string }>
  ranking: Pessoa[]
  /**
   * ⚠️⚠️ UMA SEGUNDA LISTA, quando a fonte mede DUAS COISAS DIFERENTES na mesma
   * pessoa. Nasceu do ClassRoom (08/09/2026): a lista era "quem mais concluiu E
   * CRIOU curso", somando quem ASSISTE com quem PRODUZ. São trabalhos de
   * natureza distinta — a régua de pontuação já os separa (assistir vídeo 1,
   * concluir curso 2, criar curso 6) e o cartão os somava, o que fazia o
   * criador de conteúdo desaparecer dentro do volume de quem consome.
   * Só use quando os dois eixos existirem de verdade; duas listas onde uma
   * basta é ruído.
   */
  ranking2?: Pessoa[]
  unidade2?: string
  /** Por qual grandeza está ranqueado ("mais resolveu", "mais abriu chamado"). */
  unidade: string
  /** O que dizer quando NÃO há ninguém — a frase é do cartão, não genérica. */
  semNinguem?: string
  numeros: Numero[]
  rodape?: React.ReactNode
  /**
   * Mostra TAMBÉM quem está em zero.
   *
   * ⚠️⚠️ Falso para as oito fontes espelhadas, e verdadeiro para a planilha que o
   * SETOR mantém — e a diferença não é de gosto. Quem RESOLVE chamado de
   * HelpDesk é o T.I; listar as outras 80 pessoas com zero ali acusaria quem
   * nunca passou por aquele sistema. Mas na planilha do próprio setor **todo
   * mundo do setor deveria estar**, e quem não está é NOTÍCIA.
   *
   * Foi o caso do Gabriel Santana em 04/09/2026: 692 serviços concluídos no
   * arquivo, o último em 02/07, e em agosto ele simplesmente SUMIU da lista em
   * vez de aparecer com zero. Sumir da lista é a ausência de dado sendo lida
   * como ausência de pessoa — e é justamente o que o gestor precisa ver.
   */
  todos?: boolean
  /** Abre o resumo completo do sistema, só com este setor — ver `Detalhe.tsx`. */
  onDetalhe?: () => void
}) {
  const router = useRouter()

  /* A LISTA — extraída para caber duas vezes no mesmo cartão (ver `ranking2`).
     ⚠️ O `max` é POR LISTA: a barra compara dentro do próprio eixo. Dividir a
     barra de quem cria pelo topo de quem assiste faria o criador parecer
     irrelevante justamente por criar menos, que é a natureza do trabalho. */
  const Lista = ({ gente, rotulo, vazioTexto }: { gente: Pessoa[]; rotulo: string; vazioTexto?: string }) => {
    const mx = Math.max(1, ...gente.map((p) => p.valor))
    const vis = todos ? gente : gente.slice(0, 6)
    const sobra = gente.length - vis.length
    return (
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
          Quem {rotulo}
        </div>
        {gente.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
            {vazioTexto ?? 'Ninguém deste setor, no período — os números ao lado vêm de outra ponta da mesma fonte.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {vis.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/funcionarios/${p.id}`)}
                  className="tc-row cpop"
                  style={{
                    animationDelay: `${i * 45}ms`,
                    display: 'grid', gridTemplateColumns: '15px 30px minmax(0,1fr) 58px',
                    gap: 9, alignItems: 'center', padding: '6px 7px', borderRadius: 7,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 && p.valor > 0 ? cor : 'var(--text-mute)', textAlign: 'center' }}>{p.valor > 0 ? i + 1 : '·'}</span>
                  <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color={cor} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.valor > 0 ? 'var(--text)' : 'var(--text-dim)' }}>
                      {p.nome}
                      {/* ⚠️ Zero sem explicação vira acusação. A legenda diz
                          desde quando — "último em 02/07" é uma conversa; um
                          zero mudo é um julgamento. */}
                      {p.valor === 0 && p.nota && (
                        <span style={{ fontWeight: 500, color: 'var(--text-mute)', fontSize: 11 }}> · {p.nota}</span>
                      )}
                    </div>
                    {/* A barra fica SOB o nome: ela compara dentro desta fonte e
                        deste setor, e não é uma nota sobre a pessoa. */}
                    <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, marginTop: 3, overflow: 'hidden' }}>
                      <div className="cbar" style={{ height: '100%', width: `${Math.round((p.valor / mx) * 100)}%`, background: cor, borderRadius: 4, opacity: i === 0 ? 1 : 0.62 }} />
                    </div>
                  </div>
                  <span className="cnum" style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 800, color: p.valor === 0 ? 'var(--text-mute)' : (i === 0 ? cor : 'var(--text)'), letterSpacing: '-.3px' }}>
                    {p.valor.toLocaleString('pt-BR')}
                  </span>
                </button>
              ))}
            </div>
            {sobra > 0 && (
              // ⚠️ Diz onde ver o resto: a comparação completa existe no cartão
              // "As pessoas", então não é perda de dado — era perda de caminho.
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8, paddingLeft: 7 }}>
                e mais {sobra} {sobra === 1 ? 'pessoa' : 'pessoas'} com registro · a lista completa está em <b>As pessoas</b>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sub ? 2 : 16 }}>
        <Icone size={15} color={cor} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</span>
        {onDetalhe && <BotaoDetalhe onClick={onDetalhe} />}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{sub}</div>}

      {/*
        ⚠️⚠️ Ranking vazio é o caso COMUM, não a borda: quem RESOLVE chamado de
        HelpDesk é o T.I, e todo o resto da empresa só ABRE. Antes o grid virava
        uma coluna, a tarja "Quem mais resolveu" sumia junto, e sobrava um cartão
        de totais sem metade da própria estrutura — sem uma linha dizendo por
        quê. Um cartão sem "quem" tem de dizer que não tem.
      */}
      <div className="card-fonte" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 22, alignItems: 'start' }}>
        {/* ── ESQUERDA: quem fez ────────────────────────────────────────── */}
<div>
          <Lista gente={ranking} rotulo={unidade} vazioTexto={semNinguem} />
          {/* ⚠️ A segunda lista só aparece quando o eixo EXISTE naquele setor:
              um setor onde ninguém cria conteúdo não ganha um bloco vazio a
              dizer que ninguém criou — isso já está no zero do "No setor". */}
          {unidade2 && ranking2 && ranking2.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              <Lista gente={ranking2} rotulo={unidade2} />
            </div>
          )}
        </div>

        
        {/* ── DIREITA: o total do setor ─────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 10 }}>
            No setor
          </div>
          {/*
            ⚠️⚠️ NÚMERO ZERADO NÃO VIRA CARTÃO (decisão do dono, 03/09/2026). O
            Fiscal mostrava "0 Serviços entregues · 0 Km rodados · 0 Saídas ·
            0 Viagens" ao lado de 397 protocolos abertos: quatro caixas cinzas
            informando que o setor não faz mensageria — o que ninguém precisava
            que a tela dissesse. Zero repetido também ensina a ignorar a faixa,
            e no dia em que um deles for 3 ele estará entre outros zeros.

            ⚠️ `null` CONTINUA aparecendo: "—" quer dizer "não medimos", que é
            informação. Só o zero medido é que se cala.
          */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 9 }}>
            {numeros.filter((x) => x.valor !== 0 && x.valor !== '0').map((x) => (
              <div key={x.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '11px 13px' }}>
                <div className="cnum" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.5px', color: x.valor === null || x.valor === 0 ? 'var(--text-mute)' : (x.cor ?? 'var(--text)') }}>
                  {fmt(x.valor)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>{x.label}</div>
                {x.nota && <div style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{x.nota}</div>}
              </div>
            ))}
          </div>
          {rodape && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 11, lineHeight: 1.5 }}>{rodape}</div>}
        </div>
      </div>
    </div>
  )
}
