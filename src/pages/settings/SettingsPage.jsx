import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listCompanies } from '../../api/companies.js'
import { getMyCompanyResetStatus, resetMyCompany, updateMyCompany, uploadMyCompanyLogo } from '../../api/companySettings.js'
import { getMyBranch, listBranches, updateMyBranchPublicMenu } from '../../api/branches.js'
import { changePassword, updateMe } from '../../api/me.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="text-sm font-semibold text-white">{title}</div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300"
              type="button"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [company, setCompany] = useState(null)
  const [branch, setBranch] = useState(null)
  const [saving, setSaving] = useState(false)

  const bumpContext = useAuthStore((s) => s.bumpContext)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [me, setMe] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [companyNuit, setCompanyNuit] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyProvince, setCompanyProvince] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [openCompany, setOpenCompany] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const [openSecurity, setOpenSecurity] = useState(false)
  const [openPublicMenu, setOpenPublicMenu] = useState(false)
  const [openResetCompany, setOpenResetCompany] = useState(false)

  const [openBranchVisibility, setOpenBranchVisibility] = useState(false)
  const [branchesList, setBranchesList] = useState([])
  const [visibleBranchIds, setVisibleBranchIds] = useState([])
  const [savingBranchVisibility, setSavingBranchVisibility] = useState(false)

  const [publicMenuEnabled, setPublicMenuEnabled] = useState(false)
  const [publicMenuSubdomain, setPublicMenuSubdomain] = useState('')
  const [publicMenuCustomDomain, setPublicMenuCustomDomain] = useState('')
  const [savingPublicMenu, setSavingPublicMenu] = useState(false)

  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetRunning, setResetRunning] = useState(false)
  const [resetProgress, setResetProgress] = useState(0)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const companies = await listCompanies()
        const c = companies?.[0] || null
        if (!mounted) return
        setCompany(c)

        const b = await getMyBranch()
        setBranch(b)

        setPublicMenuEnabled(Boolean(b?.public_menu_enabled))
        setPublicMenuSubdomain(b?.public_menu_subdomain || '')
        setPublicMenuCustomDomain(b?.public_menu_custom_domain || '')

        setCompanyName(c?.name || '')
        setCompanyNuit(c?.nuit || '')
        setCompanyEmail(c?.email || '')
        setCompanyPhone(c?.phone || '')
        setCompanyProvince(c?.province || '')
        setCompanyCity(c?.city || '')
        setCompanyAddress(c?.address || '')

        const meRes = await (await import('../../api/auth.js')).getMe()
        setMe(meRes)
        setVisibleBranchIds(Array.isArray(meRes?.visible_branch_ids) ? meRes.visible_branch_ids : [])
        setProfileName(meRes?.name || '')
        setProfileEmail(meRes?.email || '')
        setProfileUsername(meRes?.username || '')
      } catch {
        toast.error('Não foi possível carregar configurações agora.')
      }

  async function startCompanyReset() {
    const role = (me?.role || '').toString().trim().toLowerCase()
    const isAdmin = role === 'admin' || role === 'owner'
    if (!isAdmin) {
      toast.error('Apenas admin pode fazer reset.')
      return
    }
    const txt = (resetConfirmText || '').trim().toUpperCase()
    if (txt !== 'RESET') {
      toast.error('Digite RESET para confirmar.')
      return
    }

    setResetError('')
    setResetMessage('Iniciando...')
    setResetProgress(1)
    setResetRunning(true)

    try {
      await resetMyCompany('RESET')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível iniciar o reset.'
      setResetRunning(false)
      toast.error(msg)
      return
    }

    // Polling do status até concluir
    let alive = true
    const tick = async () => {
      if (!alive) return
      try {
        const st = await getMyCompanyResetStatus()
        const p = Math.max(0, Math.min(100, Number(st?.progress || 0)))
        setResetProgress((cur) => {
          const target = Math.max(cur, p)
          // suaviza subida 1 a 100
          return target
        })
        setResetMessage(st?.message || '')
        setResetError(st?.error || '')

        const status = String(st?.status || '').toLowerCase()
        if (status === 'done' && p >= 100) {
          setResetProgress(100)
          setResetMessage('Concluído.')
          setTimeout(() => {
            logout()
            navigate('/login', { replace: true })
          }, 600)
          return
        }
        if (status === 'error') {
          setResetRunning(false)
          toast.error('Reset falhou. Veja o erro.')
          return
        }
      } catch (e) {
        // se o reset apagou dados e a sessão expirou, só sair
      }
      setTimeout(tick, 700)
    }
    tick()

    return () => {
      alive = false
    }
  }
     })()
     return () => {
       mounted = false
     }
   }, [])

  async function openBranchVisibilityModal() {
    const role = (me?.role || '').toString().trim().toLowerCase()
    const isAdmin = role === 'admin' || role === 'owner'
    if (!isAdmin) {
      toast.error('Apenas admin pode configurar filiais visíveis.')
      return
    }
    setOpenBranchVisibility(true)
    try {
      const rows = await listBranches()
      const normalized = Array.isArray(rows) ? rows : []
      setBranchesList(normalized)

      // Se não houver filtro salvo no backend, marcar todas no UI.
      const backendIds = Array.isArray(me?.visible_branch_ids) ? me.visible_branch_ids : []
      if (!backendIds.length) {
        setVisibleBranchIds(normalized.map((x) => Number(x.id)).filter((n) => Number.isFinite(n) && n > 0))
      }
    } catch {
      setBranchesList([])
      toast.error('Não foi possível carregar filiais agora.')
    }
  }

  async function onSaveBranchVisibility() {
    setSavingBranchVisibility(true)
    try {
      const allIds = (branchesList || []).map((x) => Number(x.id)).filter((n) => Number.isFinite(n) && n > 0)

      // Garantir que a filial atual sempre esteja visível (para não "sumir" do seletor)
      const currentId = branch?.id ? Number(branch.id) : null
      const next = Array.from(new Set((visibleBranchIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)))
      if (currentId && !next.includes(currentId)) next.push(currentId)

      // Se marcou todas, salvar NULL (default = mostrar tudo)
      const allSet = new Set(allIds.map(String))
      const nextSet = new Set(next.map(String))
      let isAll = true
      for (const id of allSet) {
        if (!nextSet.has(id)) {
          isAll = false
          break
        }
      }

      const payload = { visible_branch_ids: isAll ? null : next }
      const updatedMe = await updateMe(payload)
      setMe(updatedMe)
      setVisibleBranchIds(Array.isArray(updatedMe?.visible_branch_ids) ? updatedMe.visible_branch_ids : [])

      toast.success('Filiais do cabeçalho atualizadas.')
      setOpenBranchVisibility(false)
      bumpContext()
    } catch {
      toast.error('Não foi possível salvar agora.')
    } finally {
      setSavingBranchVisibility(false)
    }
  }

  async function onSavePublicMenu() {
    if (!branch?.id) {
      toast.error('Filial não encontrada.')
      return
    }

    setSavingPublicMenu(true)
    try {
      const updated = await updateMyBranchPublicMenu(branch.id, {
        public_menu_enabled: Boolean(publicMenuEnabled),
        public_menu_subdomain: publicMenuSubdomain,
        public_menu_custom_domain: publicMenuCustomDomain,
      })
      setBranch(updated)
      setPublicMenuEnabled(Boolean(updated?.public_menu_enabled))
      setPublicMenuSubdomain(updated?.public_menu_subdomain || '')
      setPublicMenuCustomDomain(updated?.public_menu_custom_domain || '')
      toast.success('Configuração do menu público salva.')
      setOpenPublicMenu(false)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível salvar agora.'
      toast.error(msg)
    } finally {
      setSavingPublicMenu(false)
    }
  }

  const role = (me?.role || '').toString().trim().toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'
  const isRestaurantBranch = (branch?.business_type || '').toString().trim().toLowerCase() === 'restaurant'
  const publicMenuUrl = publicMenuCustomDomain
    ? `https://${publicMenuCustomDomain}`
    : publicMenuSubdomain
      ? `https://${publicMenuSubdomain}.vuchada.com`
      : ''

  async function onUploadLogo(file) {
    if (!file) return
    setUploadingLogo(true)
    try {
      const updated = await uploadMyCompanyLogo(file)
      setCompany(updated)
      toast.success('Logo atualizado.')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível enviar o logo agora.'
      toast.error(msg)
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSave() {
    setSaving(true)
    try {
      const updated = await updateMyCompany({
        name: companyName,
        nuit: companyNuit || null,
        email: companyEmail || null,
        phone: companyPhone || null,
        province: companyProvince || null,
        city: companyCity || null,
        address: companyAddress || null,
      })
      setCompany(updated)

      toast.success('Configurações salvas.')
      setOpenCompany(false)
    } catch {
      toast.error('Não foi possível salvar agora. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveProfile() {
    setSavingProfile(true)
    try {
      const updated = await updateMe({
        name: profileName,
        email: profileEmail,
        username: profileUsername,
      })
      setMe(updated)
      toast.success('Perfil atualizado.')
      setOpenProfile(false)
    } catch {
      toast.error('Não foi possível atualizar o perfil agora.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error('Preencha a senha atual e a nova senha.')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Senha alterada com sucesso.')
      setOpenSecurity(false)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Não foi possível alterar a senha agora.'
      toast.error(msg)
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div>
      {resetRunning ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
              <div className="text-sm font-semibold text-white">Resetando banco de dados...</div>
              <div className="mt-2 text-xs text-slate-400">{resetMessage || 'Aguarde...'}</div>
              <div className="mt-4 h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-brand-600"
                  style={{ width: `${Math.max(1, Math.min(100, Number(resetProgress || 0)))}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-300">{Math.max(1, Math.min(100, Number(resetProgress || 0)))}%</div>
              {resetError ? <div className="mt-3 text-xs text-rose-300 break-words">{resetError}</div> : null}
              <div className="mt-4 text-xs text-slate-400">Durante o reset, o sistema fica bloqueado.</div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="text-xl font-semibold">Configurações</div>
      <div className="mt-1 text-sm text-slate-300">Empresa: {company?.name || '—'}</div>
      <div className="mt-1 text-xs text-slate-500">Para trocar de filial (Bar/Restaurante/Retalho), use o seletor de Filial no topo.</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">Empresa</div>
          <div className="mt-2 text-sm text-slate-300">
            <div className="text-slate-100 font-medium">{company?.name || '—'}</div>
            <div className="text-slate-400 text-xs mt-1">Filial: {branch?.name || '—'} · Tipo: {branch?.business_type || '—'}</div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setOpenCompany(true)}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
              type="button"
            >
              Configurar empresa
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">Meu perfil</div>
          <div className="mt-2 text-sm text-slate-300">
            <div className="text-slate-100 font-medium">{me?.name || '—'}</div>
            <div className="text-slate-400 text-xs mt-1">{me?.email || ''}</div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setOpenProfile(true)}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              type="button"
            >
              Editar perfil
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">Segurança</div>
          <div className="mt-2 text-sm text-slate-300">Troque sua senha e mantenha sua conta segura.</div>
          <div className="mt-4">
            <button
              onClick={() => setOpenSecurity(true)}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              type="button"
            >
              Trocar senha
            </button>
          </div>
        </div>

        {isRestaurantBranch ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm font-semibold text-white">Menu público</div>
            <div className="mt-2 text-sm text-slate-300">
              <div className="text-slate-400 text-xs">
                Use 1 opção:
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Subdomínio: <span className="text-slate-200">menu</span> vira <span className="text-slate-200">https://menu.vuchada.com</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Domínio próprio: <span className="text-slate-200">cardapio.seurestaurante.com</span> (tem prioridade)
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Estado: <span className="text-slate-200">{branch?.public_menu_enabled ? 'Ativo' : 'Inativo'}</span>
              </div>
              {publicMenuUrl ? (
                <div className="mt-1 text-xs text-slate-400 break-all">
                  URL: <span className="text-slate-200">{publicMenuUrl}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  if (!isAdmin) {
                    toast.error('Apenas admin pode configurar o menu público.')
                    return
                  }
                  setOpenPublicMenu(true)
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
                type="button"
              >
                Configurar menu
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">Filiais no cabeçalho</div>
          <div className="mt-2 text-sm text-slate-300">
            Escolha quais filiais aparecem no seletor de filial (header). Por padrão, aparecem todas.
          </div>
          <div className="mt-4">
            <button
              onClick={openBranchVisibilityModal}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              type="button"
            >
              Configurar filiais visíveis
            </button>
          </div>
        </div>
      </div>

      <Modal open={openCompany} title="Configurar empresa" onClose={() => (saving ? null : setOpenCompany(false))}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <div className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Logo da empresa</div>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {company?.logo_url ? (
                  <img
                    src={(import.meta.env.VITE_API_URL || 'https://neoerp-production.up.railway.app') + company.logo_url}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    onUploadLogo(f)
                  }}
                />
                {uploadingLogo ? 'Enviando...' : 'Carregar logo'}
              </label>
              <div className="text-xs text-slate-400">PNG/JPG/WEBP</div>
            </div>
          </div>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Nome da empresa</div>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">NUIT</div>
              <input
                value={companyNuit}
                onChange={(e) => setCompanyNuit(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Telefone</div>
              <input
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Email</div>
            <input
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="email"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Província</div>
              <input
                value={companyProvince}
                onChange={(e) => setCompanyProvince(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>

            <label className="grid gap-2">
              <div className="text-sm font-medium text-slate-200">Cidade</div>
              <input
                value={companyCity}
                onChange={(e) => setCompanyCity(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                type="text"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Endereço</div>
            <input
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenCompany(false)}
              disabled={saving}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openProfile} title="Editar perfil" onClose={() => (savingProfile ? null : setOpenProfile(false))}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSaveProfile()
          }}
        >
          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Nome</div>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Username</div>
            <input
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Email</div>
            <input
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="email"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenProfile(false)}
              disabled={savingProfile}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingProfile ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openSecurity} title="Trocar senha" onClose={() => (changingPassword ? null : setOpenSecurity(false))}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onChangePassword()
          }}
        >
          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Senha atual</div>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="password"
            />
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Nova senha</div>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="password"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenSecurity(false)}
              disabled={changingPassword}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {changingPassword ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openPublicMenu} title="Configurar menu público (restaurante)" onClose={() => (savingPublicMenu ? null : setOpenPublicMenu(false))}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSavePublicMenu()
          }}
        >
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(publicMenuEnabled)}
              onChange={(e) => setPublicMenuEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <div className="text-sm font-medium text-slate-200">Ativar menu público nesta filial</div>
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Subdomínio (opção 1)</div>
            <input
              value={publicMenuSubdomain}
              onChange={(e) => setPublicMenuSubdomain(e.target.value)}
              placeholder="menu"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
            <div className="text-xs text-slate-400">Exemplo: menu {'->'} https://menu.vuchada.com</div>
          </label>

          <label className="grid gap-2">
            <div className="text-sm font-medium text-slate-200">Domínio próprio (opção 2)</div>
            <input
              value={publicMenuCustomDomain}
              onChange={(e) => setPublicMenuCustomDomain(e.target.value)}
              placeholder="cardapio.seurestaurante.com"
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="text"
            />
            <div className="text-xs text-slate-400">Se preencher, este domínio terá prioridade sobre o subdomínio.</div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenPublicMenu(false)}
              disabled={savingPublicMenu}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={savingPublicMenu}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingPublicMenu ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openBranchVisibility}
        title="Filiais visíveis no cabeçalho"
        onClose={() => (savingBranchVisibility ? null : setOpenBranchVisibility(false))}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-300">
            Marque as filiais que devem aparecer no seletor. Se marcar todas, o sistema volta ao padrão (mostrar todas).
          </div>

          <div className="max-h-[340px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3">
            {(branchesList || []).length ? (
              <div className="grid gap-2">
                {(branchesList || []).map((b) => {
                  const id = Number(b.id)
                  const checked = (visibleBranchIds || []).map(String).includes(String(id))
                  return (
                    <label key={b.id} className="flex items-center gap-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set((visibleBranchIds || []).map(String))
                          if (e.target.checked) next.add(String(id))
                          else next.delete(String(id))
                          setVisibleBranchIds(Array.from(next).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))
                        }}
                        className="h-4 w-4"
                      />
                      <span className="break-words">{b?.name || `Filial ${b.id}`}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Nenhuma filial encontrada.</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenBranchVisibility(false)}
              disabled={savingBranchVisibility}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={onSaveBranchVisibility}
              disabled={savingBranchVisibility}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingBranchVisibility ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openResetCompany}
        title="Resetar banco de dados da empresa"
        onClose={() => (resetRunning ? null : setOpenResetCompany(false))}
      >
        <div className="grid gap-4">
          <div className="text-sm text-slate-300">
            Esta ação vai apagar todos os dados da empresa. Para confirmar, digite <span className="text-slate-100 font-semibold">RESET</span>.
          </div>
          <input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600"
            placeholder="Digite RESET"
            type="text"
            disabled={resetRunning}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenResetCompany(false)}
              disabled={resetRunning}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenResetCompany(false)
                startCompanyReset()
              }}
              disabled={resetRunning}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirmar reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
