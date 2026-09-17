import type { EmployeeMetrics } from '@/lib/ui/employee-period'
import type { Tom } from '../../../_visao/tipos'

/* As contas da ficha nova. São AS MESMAS da ficha atual (`../page.tsx`) — só
   saíram da tela para as seções poderem dividi-las. Ao trocar, a atual some e
   isto fica sendo a única cópia. */

export const num = (n: number) => n.toLocaleString('pt-BR')

export type Parte = { label: string; sys: string; n: number }

/** "Atividades concluídas" no período, por fonte. `null` enquanto carrega. */
export function concluidas(m: EmployeeMetrics | null): { total: number | null; partes: Parte[] } {
  if (!m) return { total: null, partes: [] }
  const partes: Parte[] = [
    { label: 'chamados resolvidos', sys: 'HelpDesk', n: m.helpdesk.resolved },
    /* ⚠️ Consumir e produzir separados: curso CRIADO vale 6, concluído 2. */
    { label: 'cursos concluídos', sys: 'ClassRoom', n: m.classroom.courses },
    { label: 'cursos criados', sys: 'ClassRoom', n: m.classroom.created },
    { label: 'vídeos assistidos', sys: 'ClassRoom', n: m.classroom.videos },
    { label: 'empresas', sys: 'CIDE', n: m.cide.atividades },
    { label: 'atividades', sys: 'Consultoria Plus', n: m.consultoria.total },
    { label: 'atendimentos finalizados', sys: 'WhatsApp', n: m.whatsapp.finalizados },
    { label: 'serviços entregues', sys: 'Gerência', n: m.gerencia.servicos },
    { label: 'serviços criados', sys: 'Gerência', n: m.gerencia.servCriados },
    /* ⚠️ Só chamado concluído — mensagem não é entrega. E o chamado é do FLUXO
       desde 16/09/2026; no Chat ficou a conversa. */
    { label: 'chamados concluídos', sys: 'Fluxo', n: m.fluxo.chamadosConcluidos },
    { label: 'tarefas concluídas', sys: 'Fluxo', n: m.fluxo.tarefasConcluidas },
  ].filter((p) => p.n > 0)
  return { total: partes.reduce((a, p) => a + p.n, 0), partes }
}

export const ehSuspensao = (tipo: string) => tipo === 'suspensao' || tipo === 'lgpd_suspensao'

/** ⚠️ O `tipo` é a chave do banco (sem acento) — nunca vai cru para a tela. */
export function rotuloDisciplina(tipo: string): string {
  return tipo === 'advertencia' ? 'Advertência'
    : tipo === 'lgpd_suspensao' ? 'Suspensão · LGPD'
    : tipo === 'lgpd_advertencia' ? 'Advertência · LGPD'
    : tipo === 'suspensao' ? 'Suspensão · atraso'
    : tipo.charAt(0).toUpperCase() + tipo.slice(1)
}

/** Roxo = suspensão em todo o sistema; laranja = advertência (a cor do setor). */
export const tomDisciplina = (tipo: string): Tom =>
  ehSuspensao(tipo) ? 'purple' : tipo === 'lgpd_advertencia' ? 'red' : 'orange'

/** Cor por nível de formação (chave = rótulo sem acento), a mesma da ficha atual. */
const FORM_COR: Record<string, string> = {
  graduacao: '#159b87', superior: '#159b87', pos: '#a78bfa', 'pos-graduacao': '#a78bfa',
  extensao: '#2f9fd6', mba: '#f5a623', mestrado: '#7c8cf0', doutorado: '#7c5cf0',
  'medio tecnico': '#b6d957', tecnico: '#8aab2e', 'ensino medio': '#e0857a', 'ensino fundamental': '#f1788a',
}
const FORM_PALETTE = ['#159b87', '#a78bfa', '#2f9fd6', '#f5a623', '#e0857a', '#b6d957']
const normLbl = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export const formCor = (label: string, i: number) => FORM_COR[normLbl(label)] ?? FORM_PALETTE[i % FORM_PALETTE.length]

/** A pessoa é medida pelo ponto E a janela foi medida — a régua de `CondutaLateral`. */
export function comPonto(m: EmployeeMetrics | null): boolean {
  const a = m?.assiduidade
  return !!a && a.janelaComPonto !== false && a.pessoaMedida !== false
}
