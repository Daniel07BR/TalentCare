'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Pencil, X } from 'lucide-react'
import Avatar from '../Avatar'

type Staff = {
  id: string; name: string; cpf: string; jobTitle: string; deptId: string; deptName: string
  entryDate: string; birthDate: string; gender: string; phone: string; active: boolean; hasAvatar: boolean
}
type Dept = { id: string; name: string }

const emptyForm = { name: '', cpf: '', jobTitle: '', deptId: '', newDepartment: '', entryDate: '', birthDate: '', gender: '', phone: '' }
type Form = typeof emptyForm

const ini = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

// Redimensiona a imagem escolhida (máx 256px) e exporta webp leve (data-URI),
// p/ não inflar o banco. Tudo no cliente — nenhuma lib no servidor.
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 256
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/webp', 0.85))
    }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}
const fmtDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—')

const lbl: React.CSSProperties = { fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 4, display: 'block', fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }

export default function EquipeClient({ staff, departments }: { staff: Staff[]; departments: Dept[] }) {
  const router = useRouter()
  const [form, setForm] = useState<Form>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newDept, setNewDept] = useState(false)
  const [avatar, setAvatar] = useState('') // nova foto (data-URI) selecionada; '' = não mexer
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const editingStaff = editingId ? staff.find((s) => s.id === editingId) : null

  const reset = () => { setForm(emptyForm); setEditingId(null); setNewDept(false); setAvatar(''); setError(null) }

  const startEdit = (s: Staff) => {
    setEditingId(s.id)
    setNewDept(false)
    setAvatar('')
    setError(null)
    setForm({ name: s.name, cpf: s.cpf, jobTitle: s.jobTitle, deptId: s.deptId, newDepartment: '', entryDate: s.entryDate, birthDate: s.birthDate, gender: s.gender, phone: s.phone })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onPickPhoto = async (file?: File) => {
    if (!file) return
    try { setAvatar(await fileToAvatar(file)) } catch { setError('Não consegui ler essa imagem.') }
  }

  const submit = async () => {
    if (!form.name.trim()) { setError('Informe o nome.'); return }
    setSaving(true); setError(null)
    const payload = { ...form, newDepartment: newDept ? form.newDepartment : '', ...(avatar ? { avatar } : {}) }
    const url = editingId ? `/api/admin/staff/${editingId}` : '/api/admin/staff'
    const res = await fetch(url, { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data?.error ?? 'Erro ao salvar.'); return }
    reset(); router.refresh()
  }

  const toggleActive = async (s: Staff) => {
    await fetch(`/api/admin/staff/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !s.active }) })
    router.refresh()
  }

  return (
    <div className="tc-anim" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Cadastro · sem usuário no Nexus</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserPlus size={24} /> Equipe interna
        </h1>
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginTop: 6, maxWidth: 720 }}>
          Colaboradores reais que não têm conta no servidor/Nexus (motoboy, cozinha, limpeza…). Eles
          entram no painel como quadro de funcionários e recebem os dados de ponto e disciplina por
          nome/CPF — mas não acessam o sistema.
        </div>
      </div>

      {/* Formulário */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{editingId ? 'Editar colaborador' : 'Novo colaborador'}</div>

        {/* Foto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="prévia" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flex: 'none', border: '1px solid var(--border)' }} />
          ) : editingStaff?.hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/avatar/${editingStaff.id}`} alt="foto atual" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flex: 'none', border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--chart-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flex: 'none' }}>{ini(form.name)}</div>
          )}
          <div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <UserPlus size={14} /> {avatar || editingStaff?.hasAvatar ? 'Trocar foto' : 'Escolher foto'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPickPhoto(e.target.files?.[0])} />
            </label>
            {avatar && <button onClick={() => setAvatar('')} style={{ marginLeft: 8, height: 34, padding: '0 10px', background: 'transparent', border: 'none', color: 'var(--text-mute)', fontSize: 12, cursor: 'pointer' }}>Remover seleção</button>}
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 5 }}>JPG/PNG · ajustada automaticamente</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Nome completo *</label><input style={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Maria da Silva" /></div>
          <div><label style={lbl}>CPF</label><input style={inp} value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="só números" inputMode="numeric" /></div>
          <div><label style={lbl}>Cargo</label><input style={inp} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Ex.: Cozinheira" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Setor</label>
            {newDept ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={inp} value={form.newDepartment} onChange={(e) => set('newDepartment', e.target.value)} placeholder="Novo setor" autoFocus />
                <button onClick={() => { setNewDept(false); set('newDepartment', '') }} title="Cancelar" style={{ ...inp, width: 36, flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
              </div>
            ) : (
              <select style={inp} value={form.deptId} onChange={(e) => { if (e.target.value === '__new__') { setNewDept(true) } else set('deptId', e.target.value) }}>
                <option value="">— selecione —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                <option value="__new__">+ Novo setor…</option>
              </select>
            )}
          </div>
          <div><label style={lbl}>Admissão</label><input type="date" style={inp} value={form.entryDate} onChange={(e) => set('entryDate', e.target.value)} /></div>
          <div><label style={lbl}>Nascimento</label><input type="date" style={inp} value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Gênero</label>
            <select style={inp} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">— não informado —</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
          <div><label style={lbl}>Telefone</label><input style={inp} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(opcional)" /></div>
          <div />
        </div>
        {error && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={submit} disabled={saving} style={{ height: 38, padding: '0 18px', background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
          {editingId && <button onClick={reset} style={{ height: 38, padding: '0 16px', background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Colaboradores cadastrados</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>{staff.length} {staff.length === 1 ? 'pessoa' : 'pessoas'} · sem acesso ao sistema</div>
        {staff.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-mute)', padding: '12px 0' }}>Nenhum colaborador cadastrado ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 0.9fr 120px', gap: 10, padding: '0 6px 9px', borderBottom: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>
              <div>Nome</div><div>Cargo · Setor</div><div>Admissão</div><div>Status</div><div style={{ textAlign: 'right' }}>Ações</div>
            </div>
            {staff.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 0.9fr 120px', gap: 10, padding: '9px 6px', borderBottom: '1px solid var(--border-soft)', alignItems: 'center', opacity: s.active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar id={s.id} hasAvatar={s.hasAvatar} initials={ini(s.name)} color="var(--chart-3)" size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    {s.cpf && <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{s.cpf}</div>}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.jobTitle || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.deptName || 'sem setor'}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{fmtDate(s.entryDate)}</div>
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: s.active ? 'var(--success)' : 'var(--text-mute)', background: s.active ? 'rgba(63,178,85,.13)' : 'var(--surface-2)', padding: '3px 10px', borderRadius: 20 }}>{s.active ? 'Ativo' : 'Desligado'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => startEdit(s)} title="Editar" className="tc-btn" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}><Pencil size={14} /></button>
                  <button onClick={() => toggleActive(s)} style={{ height: 30, padding: '0 10px', fontSize: 12, fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: s.active ? 'var(--danger)' : 'var(--success)', cursor: 'pointer' }}>{s.active ? 'Inativar' : 'Reativar'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
