'use client'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'

/* ============================================================
   RÁDIO — a coluna da direita (pedido do dono, 09/09/2026).

   ⚠️⚠️ MOVIDO, não copiado. O rádio aparecia em DOIS lugares antes: um chip no
   cabeçalho ("Rádio 🎧 0h") e um bloco no meio da página. Trazê-lo para cá sem
   tirar os outros deixaria a mesma informação três vezes na mesma tela — e
   repetição foi exatamente o que o dono mandou tirar do bloco dos sistemas.

   ⚠️ A escuta de rádio NÃO entra no score (é vitrine, decisão registrada no
   `FONTES.md`), e o cartão diz isso: sem essa linha ele fica ao lado de números
   que pontuam e se lê como se pontuasse também.
   ============================================================ */
export function RadioLateral({ m, periodo }: { m: EmployeeMetrics | null; periodo: string }) {
  const r = m?.radio
  /* ⚠️ Enquanto carrega, não desenha: um "0h" que depois vira "12h" é a mesma
     armadilha do Map vazio — zero se lê como "não ouviu". */
  if (!r) return null
  const nada = r.horas === 0 && r.sessoes === 0

  return (
    <div className="tc-card" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16.5 4 7 8" /><rect x="3" y="8" width="18" height="12" rx="2" />
          <circle cx="8" cy="14" r="3" /><path d="M16 12h.01M18 16h.01" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Rádio Itamarathy</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>{periodo}</div>

      {nada ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginTop: 12 }}>Sem escuta no período.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 10 }}>
          <span className="cnum" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1.2px', color: 'var(--chart-2)' }}>
            {r.horas.toLocaleString('pt-BR')}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>horas ouvidas</span>
        </div>
      )}
      {!nada && (
        <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 4 }}>
          {r.sessoes.toLocaleString('pt-BR')} {r.sessoes === 1 ? 'sessão' : 'sessões'}
          {r.ultimaDay && <> · última em {r.ultimaDay.split('-').reverse().join('/')}</>}
        </div>
      )}

      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-soft)', lineHeight: 1.5 }}>
        Escuta é contexto, não desempenho — <b>não entra no score</b>.
      </div>
    </div>
  )
}

/* ============================================================
   ÚLTIMA ATIVIDADE POR FONTE — "ela parou" ou "a FONTE dela parou"?

   ⚠️⚠️ É a dívida que o `FONTES.md` registra desde 03/09/2026: o
   `gerencia_daily` do Gilberto termina em **24/02** com o espelho fresco (os
   outros até 03/09), e ele cai no fundo do ranking por "0 atividade no mês".
   Numa lista de piores, é a diferença entre uma conversa e uma injustiça — e
   quem lê a ficha é justamente quem vai avaliar.

   ⚠️ O que informa é o PAR de datas, não a da pessoa sozinha: "última em 24/02"
   só vira notícia ao lado de "a fonte seguiu até 09/09".

   ⚠️ NÃO acompanha o filtro de período, e o cartão diz isso. A pergunta é
   "quando foi a última vez"; recortá-la pela janela responderia outra coisa.
   ============================================================ */

const dias = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

const br = (iso: string) => iso.split('-').reverse().join('/')

export function UltimaAtividade({ m }: { m: EmployeeMetrics | null }) {
  const linhas = m?.ultimaAtividade
  if (!linhas?.length) return null

  const comRegistro = linhas.filter((l) => l.dela)
  const semRegistro = linhas.filter((l) => !l.dela).map((l) => l.fonte)
  if (!comRegistro.length) return null

  return (
    <div className="tc-card" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Última atividade por fonte</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2, marginBottom: 8 }}>
        Retrato de sempre · não acompanha o filtro
      </div>

      {comRegistro
        .slice()
        .sort((a, b) => (b.dela ?? '').localeCompare(a.dela ?? ''))
        .map((l) => {
          /* ⚠️ "Parada" = a fonte seguiu registrando por mais de 30 dias depois
             da última dela. Abaixo disso é ritmo de trabalho, não sinal — e um
             alerta que dispara por qualquer folga deixa de ser lido. */
          const atraso = l.dela && l.fonteAte ? dias(l.dela, l.fonteAte) : 0
          const parada = atraso > 30
          return (
            <div key={l.fonte} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-soft)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{l.fonte}</div>
                {parada && (
                  <div style={{ fontSize: 10.5, color: 'var(--danger)', marginTop: 1, lineHeight: 1.35 }}>
                    a fonte seguiu até {br(l.fonteAte!)} · {atraso} dias sem ela
                  </div>
                )}
              </div>
              <div className="cnum" style={{
                fontSize: 12.5, fontWeight: 700, flex: 'none',
                color: parada ? 'var(--danger)' : 'var(--text)',
              }}>
                {br(l.dela!)}
              </div>
            </div>
          )
        })}

      {semRegistro.length > 0 && (
        /* ⚠️ Quem NUNCA passou pela fonte não vira linha com "—": seriam seis
           traços dizendo o mesmo nada. Vira uma frase, e ela é informação: o
           gestor sabe que não adianta procurar entrega dela ali. */
        <div style={{ fontSize: 10.5, color: 'var(--text-mute)', padding: '10px 0 0', borderTop: '1px solid var(--border-soft)', lineHeight: 1.5 }}>
          Nunca registrou em: {semRegistro.join(' · ')}.
        </div>
      )}
    </div>
  )
}
