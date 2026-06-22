/* ============================================================
   TalentCare — Configurações. Pesos/sistemas vêm do estado da página.
   scorePreview usa o dataset real (média dos fatores).
   ============================================================ */
import { FACTORS, PALETTE, sysColor, SYSTEMS, scoreColor, type TalentData } from './data'
import { compFactorAvg } from './employee'

export type Weights = Record<string, number>
export const DEFAULT_WEIGHTS: Weights = { prod: 30, prazo: 25, assid: 20, form: 15, colab: 10 }

const SYS_INFO: Record<string, string> = {
  HelpDesk: 'Chamados de TI · SLA e atrasos',
  ClassRoom: 'Cursos, treinamentos e Step by Step',
  'Consultoria Plus': 'Estudos e chamados contábeis',
  'Painel de Atendimento': 'Atendimentos de WhatsApp e clientes',
  CIDE: 'Aberturas e alterações societárias',
}
const SYS_SYNC: Record<string, string> = {
  HelpDesk: 'há 8 min', ClassRoom: 'há 1 h', 'Consultoria Plus': 'há 22 min',
  'Painel de Atendimento': 'há 3 min', CIDE: 'há 35 min',
}

export const CFG_ROLES = [
  { role: 'Diretoria', scope: 'Acesso total · todos os setores', perm: 'Admin', members: 4, color: 'var(--accent)' },
  { role: 'RH / Pessoal', scope: 'Edição de fichas, metas e pesos', perm: 'Editor', members: 3, color: 'var(--info)' },
  { role: 'Gestores de setor', scope: 'Visualização do próprio setor', perm: 'Gestor', members: 11, color: 'var(--chart-2)' },
  { role: 'Auditoria', scope: 'Somente leitura · relatórios', perm: 'Leitor', members: 2, color: 'var(--text-mute)' },
]

export function sliders(weights: Weights) {
  const total = FACTORS.reduce((a, f) => a + (weights[f.key] || 0), 0) || 1
  return FACTORS.map((f, i) => ({
    key: f.key, label: f.label, value: weights[f.key] || 0,
    pct: Math.round((weights[f.key] || 0) / total * 100) + '%', color: PALETTE[i % 6],
  }))
}
export function weightsTotal(weights: Weights): number {
  return FACTORS.reduce((a, f) => a + (weights[f.key] || 0), 0)
}
export function scorePreview(data: TalentData, weights: Weights): number {
  const total = weightsTotal(weights) || 1
  const cfa = compFactorAvg(data)
  return Math.round(FACTORS.reduce((a, f) => a + (cfa[f.key] ?? 0) * (weights[f.key] || 0), 0) / total)
}
export function previewColor(data: TalentData, weights: Weights): string {
  return scoreColor(scorePreview(data, weights))
}
export function systemsList(state: Record<string, boolean>) {
  return SYSTEMS.map((s) => {
    const connected = state[s] !== false
    return {
      name: s, color: sysColor(s), desc: SYS_INFO[s], sync: connected ? SYS_SYNC[s] : '—',
      connected, statusLabel: connected ? 'Conectado' : 'Desconectado', statusColor: connected ? 'var(--success)' : 'var(--text-mute)',
    }
  })
}
