import type { DeptMetrics } from '@/lib/ui/dept-period'
import type { PessoaDoPainel } from '@/app/(app)/PainelPessoas'

/* ============================================================
   QUEM ESTÁ ATRÁS DE CADA NÚMERO do relatório do setor — as listas que o
   clique num indicador abre (atrasos, minutos, advertências, suspensões).

   ⚠️⚠️ Um lugar só, para as duas telas do setor (a visão geral e o relatório
   completo). Elas nasceram dentro do `Hero`; a visão geral nova precisou das
   mesmas, e uma segunda cópia divergiria na primeira regra nova — a lista de
   um cartão contaria diferente da mesma lista no outro.

   ⚠️ Saem de `m.pessoas`, que a rota já montou sob a régua de `alcance` — não
   de uma busca nova. E cortam os zeros: uma lista de "quem se atrasou" com o
   setor inteiro em zero acusaria 20 pessoas para mostrar 3.
   ============================================================ */

export type Envolvidos = {
  atrasos: PessoaDoPainel[]
  minutos: PessoaDoPainel[]
  advertencias: PessoaDoPainel[]
  suspensoes: PessoaDoPainel[]
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function envolvidosDoSetor(m: DeptMetrics): Envolvidos {
  const base = (p: DeptMetrics['pessoas'][number]) =>
    ({ id: p.id, nome: p.nome, cargo: p.cargo, setor: m.setor.nome, hasAvatar: p.hasAvatar })
  const porValor = (a: PessoaDoPainel, b: PessoaDoPainel) => b.valor - a.valor || a.nome.localeCompare(b.nome)

  return {
    atrasos: m.pessoas.filter((p) => p.atrasos > 0)
      .map((p) => ({ ...base(p), valor: p.atrasos, detalhe: p.minutosAtraso ? `${p.minutosAtraso} min somados` : '' }))
      .sort(porValor),
    minutos: m.pessoas.filter((p) => p.minutosAtraso > 0)
      .map((p) => ({ ...base(p), valor: p.minutosAtraso, detalhe: plural(p.atrasos, 'atraso', 'atrasos') }))
      .sort(porValor),
    advertencias: m.pessoas.filter((p) => p.advertencias > 0)
      .map((p) => ({ ...base(p), valor: p.advertencias }))
      .sort(porValor),
    /* ⚠️⚠️ Suspensão por ATRASO (ato assinado pelo encarregado) e medida de LGPD
       (por vazamento) no MESMO cartão — a pergunta é "quem foi suspenso neste
       setor". Mas o `detalhe` diz de QUE tipo é cada uma: são conversas
       diferentes com a pessoa. Inclui advertência de LGPD sem suspensão:
       mesma natureza, e deixá-la de fora esconderia gente envolvida. */
    suspensoes: m.pessoas.map((p) => {
      const sa = p.suspensoesAtraso ?? 0, s = p.lgpdSuspensoes ?? 0, a = p.lgpdAdvertencias ?? 0
      const partes = [
        sa ? `${sa} suspensão${sa === 1 ? '' : 'es'} por atraso` : '',
        s ? `${s} suspensão${s === 1 ? '' : 'es'} de LGPD` : '',
        a ? `${a} advertência${a === 1 ? '' : 's'} de LGPD` : '',
      ].filter(Boolean)
      return { ...base(p), valor: sa + s + a, detalhe: partes.join(' · ') }
    }).filter((p) => p.valor > 0).sort(porValor),
  }
}
