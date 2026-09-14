'use client'
import { ChevronLeft, Home, CalendarPlus, CalendarX, Cake, Briefcase, type LucideIcon } from 'lucide-react'
import type { EmployeeVM } from '@/lib/mock/employee'
import Avatar from '../../../Avatar'
import DadosEditor from '../DadosEditor'
import { forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import f from './ficha.module.css'

function Pilula({ Icone, tom, rotulo, valor }: { Icone: LucideIcon; tom: Tom; rotulo: string; valor: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 12px 7px 7px', background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 12, minWidth: 0 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={15} strokeWidth={2.2} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>{rotulo}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--n-text)', whiteSpace: 'nowrap' }}>{valor}</span>
      </span>
    </span>
  )
}

/* O cabeçalho no desenho do relatório do setor: identidade grande à esquerda e
   os dados de cadastro em pílulas coloridas logo abaixo. */
export function Cabecalho({ vm, voltar }: { vm: EmployeeVM; voltar: { ir: () => void; label: string } }) {
  return (
    <header style={{ marginBottom: 16 }}>
      <button type="button" onClick={voltar.ir}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, minHeight: 32, color: 'var(--n-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
        <ChevronLeft size={15} /> {voltar.label}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 6 }}>
        <span style={{ padding: 3, borderRadius: 24, background: `linear-gradient(135deg, var(--n-blue), var(--n-purple))`, flex: 'none', lineHeight: 0 }}>
          <span style={{ display: 'block', padding: 3, borderRadius: 21, background: 'var(--n-bg)' }}>
            <Avatar id={vm.id} hasAvatar={vm.hasAvatar} initials={vm.initials} color={vm.color} size={78} radius={18} />
          </span>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.9px', color: 'var(--n-text)' }}>{vm.name}</h1>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: vm.statusColor, background: vm.statusBg, padding: '3px 10px', borderRadius: 20 }}>{vm.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--n-text-2)', marginTop: 4, flexWrap: 'wrap' }}>
            <Briefcase size={14} color="var(--n-text-3)" />
            <span>{vm.cargo}</span><span style={{ color: 'var(--n-text-3)' }}>·</span><b style={{ color: 'var(--n-text)', fontWeight: 600 }}>{vm.dept}</b>
            {vm.username && <span style={{ color: 'var(--n-text-3)', fontSize: 12 }}>· {vm.username}</span>}
          </div>
          {vm.grauLevels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {vm.grauLevels.map((l) => (
                <span key={l.label} style={{ fontSize: 11, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{l.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={f.info} style={{ marginTop: 14 }}>
        <Pilula Icone={Home} tom="green" rotulo="Tempo de casa" valor={vm.tempo} />
        <Pilula Icone={CalendarPlus} tom="blue" rotulo="Admissão" valor={vm.admissao} />
        {vm.dataSaida && <Pilula Icone={CalendarX} tom="red" rotulo="Data de saída" valor={vm.dataSaida} />}
        {(vm.idade != null || vm.nascimento) && (
          <Pilula Icone={Cake} tom="pink" rotulo="Idade" valor={<>{vm.idade != null ? `${vm.idade} anos` : '—'}{vm.nascimento && <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}> · {vm.nascimento}</span>}</>} />
        )}
      </div>
      <DadosEditor nexusUserId={vm.nexusUserId} birthISO={vm.birthISO} hireISO={vm.hireISO} />
    </header>
  )
}
