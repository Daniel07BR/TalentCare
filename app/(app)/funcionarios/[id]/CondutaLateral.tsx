'use client'
import type { EmployeeMetrics } from '@/lib/ui/employee-period'

/* ============================================================
   CONDUTA — a coluna da direita, ao lado de "Antes de avaliar".

   Pedido do dono (09/09/2026): *"abaixo do card de avaliação não podemos
   aproveitar e colocar dado para não ficar esse espaço sobrando?"*

   ⚠️⚠️ ESTES NÚMEROS FORAM MOVIDOS, NÃO COPIADOS. Eles moravam na fileira do
   bloco "Assiduidade e disciplina", lá embaixo — e repetir informação em duas
   alturas da mesma página foi exatamente o que o dono mandou tirar hoje mais
   cedo, quando o CIDE e a Consultoria voltavam abaixo do gráfico. O bloco de
   baixo fica com o que é VISUAL e não cabe em 340px: a gravidade em faixas, o
   calendário e a lista de advertências.

   E o lugar faz sentido: quem lê esta coluna está prestes a avaliar, e conduta
   é um dos critérios. Ela estava a três telas de rolagem do botão "Avaliar".
   ============================================================ */

function Linha({ rotulo, valor, nota, cor, alerta }: {
  rotulo: string
  /** `null` → "—". ⚠️ Nunca 0: aqui zero é a melhor notícia, e ausência de
   *  dado não pode produzi-la. */
  valor: number | string | null
  nota?: string | null
  cor?: string
  alerta?: boolean
}) {
  const vazio = valor == null
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
      padding: '9px 0', borderTop: '1px solid var(--border-soft)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{rotulo}</div>
        {nota && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 1, lineHeight: 1.35 }}>{nota}</div>}
      </div>
      <div className="cnum" style={{
        fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', flex: 'none',
        color: vazio ? 'var(--text-mute)' : alerta ? 'var(--danger)' : (cor ?? 'var(--text)'),
      }}>
        {vazio ? '—' : valor}
      </div>
    </div>
  )
}

export function CondutaLateral({ m, periodo }: { m: EmployeeMetrics | null; periodo: string }) {
  const ass = m?.assiduidade
  if (!ass) return null

  const temPonto = ass.janelaComPonto !== false && ass.pessoaMedida !== false
  const susp = ass.suspensoes
  const lgpdAdv = ass.lgpdAdvertencias ?? 0
  const suspAtraso = ass.suspensoesAtraso ?? 0

  return (
    <div className="tc-card" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 18px 8px', marginTop: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Conduta</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2, marginBottom: 6 }}>
        Ponto eletrônico · {periodo}
      </div>

      {/* ⚠️⚠️ O ÍNDICE NÃO É TAXA DE PRESENÇA. É `100 − atrasos×2 −
          advertências×5`, o mesmo fator que vale 20% do score — e quem não tem
          ponto na fonte recebia "100%", ou seja, zero atraso por AUSÊNCIA DE
          DADO virando nota máxima. Fica no topo porque as linhas abaixo são
          literalmente as parcelas dele. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0 10px' }}>
        <span className="cnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: temPonto ? 'var(--text)' : 'var(--text-mute)' }}>
          {temPonto ? `${ass.assid}%` : '—'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.35 }}
          title="100 − atrasos×2 − advertências×5. Não é taxa de presença.">
          índice de assiduidade<br />
          <span style={{ opacity: .85 }}>{temPonto ? '100 − atrasos×2 − advert.×5' : (ass.motivoSemPonto ?? 'sem registro de ponto')}</span>
        </span>
      </div>

      {/* ⚠️⚠️ "—" quando o ponto não cobriu a janela, nunca 0. O import é à mão:
          zero atraso por ausência de dado se lê como "ela não se atrasou", que é
          a boa notícia que o sistema não tem como dar. */}
      <Linha rotulo="Atrasos" valor={temPonto ? ass.atrasos : null}
        nota={temPonto ? `${ass.minutos.toLocaleString('pt-BR')} min somados` : (ass.motivoSemPonto ?? 'sem registro de ponto')}
        cor="var(--warning)" alerta={temPonto && ass.atrasos > 0} />

      <Linha rotulo="Atrasos abonados" valor={temPonto ? ass.atrasosAbon : null}
        nota="justificados · não punem" />

      <Linha rotulo="Advertências" valor={temPonto ? ass.advertencias : null}
        nota="no período · do 2º atraso do mês"
        cor="var(--warning)" alerta={temPonto && ass.advertencias > 0} />

      {/* ⚠️ A falta GRAVE NÃO depende do ponto: ela vem do Controle da LGPD do
          Nexus, não do dump do Nexo. Amarrá-la ao `temPonto` faria a ausência de
          uma fonte apagar o dado de outra. */}
      {/* ⚠️⚠️ DUAS LINHAS, não uma soma. A suspensão por ATRASO é ato assinado
          pelo encarregado (6º atraso do mês, ou 4º acima de 10 min) e chegou em
          10/09/2026 com o histórico real do DP; a de LGPD é medida por
          vazamento de dado pessoal. Pesam diferente na régua e levam a
          conversas diferentes — "2 suspensões" num número só não diria de quê.
          ⚠️ Nenhuma das duas depende do `temPonto`: são fatos registrados, não
          medição do dump do Nexo. */}
      <Linha rotulo="Suspensões por atraso" valor={suspAtraso}
        nota="no período · 6º atraso do mês, ou 4º acima de 10 min"
        alerta={(suspAtraso ?? 0) > 0} />

      <Linha rotulo="Suspensões" valor={susp}
        nota={susp == null ? 'não foi possível ler' : 'no período · vazamento (LGPD)'}
        alerta={(susp ?? 0) > 0} />

      {lgpdAdv > 0 && (
        <Linha rotulo="Advertências de LGPD" valor={lgpdAdv} nota="assinadas · por vazamento" alerta />
      )}

      {/* ⚠️ FALTA continua sem fonte na origem — o dump do Nexo não a traz. É a
          única linha aqui que é "—" por não existir, e ela diz isso. */}
      <Linha rotulo="Faltas" valor={null} nota="sem fonte na origem" />

      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', padding: '10px 0 8px', borderTop: '1px solid var(--border-soft)', lineHeight: 1.5 }}>
        A gravidade dos atrasos, o calendário e a lista de advertências ficam no
        bloco <b>Assiduidade e disciplina</b>, ao lado.
      </div>
    </div>
  )
}
