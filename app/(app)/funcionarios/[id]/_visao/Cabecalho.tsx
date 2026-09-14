'use client'
import { useState } from 'react'
import { ChevronLeft, Home, CalendarPlus, CalendarX, Cake, Briefcase, BookOpen, type LucideIcon } from 'lucide-react'
import type { EmployeeVM } from '@/lib/mock/employee'
import Avatar from '../../../Avatar'
import DadosEditor from '../DadosEditor'
import FormacaoEditor from '../FormacaoEditor'
import TreinamentosEditor from '../TreinamentosEditor'
import { LinkAcao, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import { formCor } from './derivar'
import f from './ficha.module.css'

function Pilula({ Icone, tom, rotulo, valor }: { Icone: LucideIcon; tom: Tom; rotulo: string; valor: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 12px 6px 6px', background: 'color-mix(in srgb, var(--n-card) 80%, transparent)', border: '1px solid var(--n-border)', borderRadius: 12, minWidth: 0 }}>
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

/* ⚠️⚠️ A FORMAÇÃO MORA NO HERO (pedido do dono, 14/09/2026): "o hero fica
   responsável por entregar todos os dados do usuário de bate-pronto". Saiu o
   cartão da coluna da direita — movido, não copiado — e o nível de escolaridade
   saiu de baixo do nome, porque agora está aqui. O que é ClassRoom (cursos e
   vídeos do período) fica no cartão do ClassRoom, em "O que os sistemas
   registraram": aquilo é atividade, isto é o cadastro de hoje. */
function FormacaoDoHero({ vm, editando, alternar }: { vm: EmployeeVM; editando: boolean; alternar: () => void }) {
  return (
    <div style={{ minWidth: 0, maxWidth: 360 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: suave('green'), color: forte('green'), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <BookOpen size={14} strokeWidth={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--n-text-3)' }}>Formação</div>
          <div style={{ fontSize: 10, color: 'var(--n-text-3)' }}>cadastro do RH · retrato de hoje</div>
        </div>
        <LinkAcao onClick={alternar}>{editando ? 'Fechar' : 'Editar'}</LinkAcao>
      </div>

      {vm.grauLevels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {vm.grauLevels.map((l) => (
            <span key={l.label} style={{ fontSize: 11.5, fontWeight: 700, color: l.color, background: `color-mix(in srgb, ${l.color} 15%, transparent)`, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{l.label}</span>
          ))}
        </div>
      )}

      {vm.cursos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {vm.cursos.map((c, i) => {
            const cor = formCor(c.quando, i)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, borderLeft: `3px solid ${cor}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text)', lineHeight: 1.25 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cor }}>{c.quando}</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--n-text-3)' }}>
          {vm.grauLevels.length ? 'Sem cursos informados no cadastro.' : 'Escolaridade e cursos não informados.'}
        </div>
      )}
    </div>
  )
}

/* O HERO da ficha: identidade, formação e — na mesma peça — os pontos do período
   e a posição no setor. O "Voltar" fica FORA, acima: é navegação. */
export function Cabecalho({ vm, voltar, lado }: { vm: EmployeeVM; voltar: { ir: () => void; label: string }; lado?: React.ReactNode }) {
  const [editando, setEditando] = useState(false)
  return (
    <>
      <button type="button" onClick={voltar.ir}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, minHeight: 32, marginBottom: 6, color: 'var(--n-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
        <ChevronLeft size={15} /> {voltar.label}
      </button>

      <header className={f.hero}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ padding: 3, borderRadius: 26, background: 'linear-gradient(135deg, var(--n-blue), var(--n-purple))', flex: 'none', lineHeight: 0, boxShadow: '0 8px 22px color-mix(in srgb, var(--n-blue) 25%, transparent)' }}>
              <span style={{ display: 'block', padding: 3, borderRadius: 23, background: 'var(--n-card)' }}>
                <Avatar id={vm.id} hasAvatar={vm.hasAvatar} initials={vm.initials} color={vm.color} size={96} radius={20} />
              </span>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--n-text)' }}>{vm.name}</h1>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: vm.statusColor, background: vm.statusBg, padding: '3px 10px', borderRadius: 20 }}>{vm.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--n-text-2)', marginTop: 6, flexWrap: 'wrap' }}>
                <Briefcase size={14} color="var(--n-text-3)" />
                <span>{vm.cargo}</span><span style={{ color: 'var(--n-text-3)' }}>·</span><b style={{ color: 'var(--n-text)', fontWeight: 700 }}>{vm.dept}</b>
                {vm.username && <span style={{ color: 'var(--n-text-3)', fontSize: 12 }}>· {vm.username}</span>}
              </div>
            </div>
          </div>

          <div className={f.info} style={{ marginTop: 18 }}>
            <Pilula Icone={Home} tom="green" rotulo="Tempo de casa" valor={vm.tempo} />
            <Pilula Icone={CalendarPlus} tom="blue" rotulo="Admissão" valor={vm.admissao} />
            {vm.dataSaida && <Pilula Icone={CalendarX} tom="red" rotulo="Data de saída" valor={vm.dataSaida} />}
            {(vm.idade != null || vm.nascimento) && (
              <Pilula Icone={Cake} tom="pink" rotulo="Idade" valor={<>{vm.idade != null ? `${vm.idade} anos` : '—'}{vm.nascimento && <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}> · {vm.nascimento}</span>}</>} />
            )}
          </div>
          <DadosEditor nexusUserId={vm.nexusUserId} birthISO={vm.birthISO} hireISO={vm.hireISO} />
        </div>

        <FormacaoDoHero vm={vm} editando={editando} alternar={() => setEditando((v) => !v)} />

        {lado && <div className={f.heroLado}>{lado}</div>}

        {/* ⚠️ A edição abre na LARGURA do hero, embaixo — dentro da coluna estreita
            da formação os dois editores esmagariam o resto da linha. */}
        {editando && (
          <div className={f.heroEdicao}>
            <FormacaoEditor nexusUserId={vm.nexusUserId ?? vm.id} level={vm.grau} detail={vm.eduDetail} />
            <TreinamentosEditor nexusUserId={vm.nexusUserId ?? vm.id} cursos={vm.treinoCursos} certs={vm.treinoCerts} />
          </div>
        )}
      </header>
    </>
  )
}
