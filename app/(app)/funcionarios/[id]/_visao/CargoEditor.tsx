'use client'
import { BadgeCheck, ExternalLink } from 'lucide-react'
import { FICHA_NO_FLUXO } from '@/lib/ui/corrija-no-fluxo'
import { forte, suave } from '../../../_visao/ui'

/* ============================================================
   CARGO OFICIAL — SOMENTE LEITURA desde 05/10/2026.

   Nasceu editável aqui (14/09/2026, `users.cargo_oficial`). Agora o cargo é da FICHA DE RH do
   DP, no Fluxo (o cargo do vínculo pessoa × empresa), e chega pelo `run-ficha-sync.mjs`. Quando o
   TalentCare e o vínculo discordavam, o DP decide na tela "Divergências" do Fluxo — editar aqui
   seria desfeito no próximo sync. O editor antigo está no histórico do git.

   ⚠️ O "Colaborador" logo abaixo do nome continua sendo o cargo do NEXUS (`job_title`), que
   decide o acesso — os dois não se misturam.
   ⚠️ Vazio diz "a informar", nunca some.
   ============================================================ */
export function CargoEditor({ cargo }: { id: string; cargo: string | null }) {
  return (
    <a href={FICHA_NO_FLUXO} target="_blank" rel="noopener noreferrer" title="O cargo vem da ficha de RH do DP, no Fluxo — corrija lá"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 12px 6px 6px', background: 'color-mix(in srgb, var(--n-card) 80%, transparent)', border: `1px ${cargo ? 'solid' : 'dashed'} var(--n-border)`, borderRadius: 12, minWidth: 0, fontFamily: 'inherit', textAlign: 'left', textDecoration: 'none' }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: suave('purple'), color: forte('purple'), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <BadgeCheck size={15} strokeWidth={2.2} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>Cargo · vem do Fluxo (DP)</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: cargo ? 'var(--n-text)' : 'var(--n-text-3)', fontStyle: cargo ? 'normal' : 'italic' }}>
          {cargo ?? 'a informar'}
        </span>
      </span>
      <ExternalLink size={13} color="var(--n-text-3)" style={{ marginLeft: 2 }} />
    </a>
  )
}
