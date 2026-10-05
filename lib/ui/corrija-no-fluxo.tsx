import { ExternalLink } from 'lucide-react'

/** Onde o DP corrige a ficha de RH — a "Administração de Funcionários do Grupo" no Fluxo. */
export const FICHA_NO_FLUXO =
  'https://fluxo.grupoitamarathy.local/itamarathy/areas/departamento-pessoal/funcionarios-do-grupo'

/**
 * ⚠️⚠️ Desde 05/10/2026 admissão, nascimento, sexo e formação vêm do FLUXO (ficha de RH do DP).
 * O TalentCare só LÊ (`run-ficha-sync.mjs`): editar aqui seria desfeito no próximo sync. No lugar
 * dos botões de editar, este aviso diz onde corrigir.
 */
export function CorrijaNoFluxo({ oque, marginTop = 12 }: { oque: string; marginTop?: number }) {
  return (
    <a href={FICHA_NO_FLUXO} target="_blank" rel="noopener noreferrer" className="tc-btn"
      title={`${oque} vêm da ficha de RH do DP, no Fluxo`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop, background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 11px', fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit' }}>
      <ExternalLink size={13} /> {oque}: corrija no Fluxo (DP)
    </a>
  )
}
