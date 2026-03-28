import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listCompanies } from '../../api/companies.js'
import { getMyCompanyResetStatus, resetMyCompany, updateMyCompany, uploadMyCompanyLogo } from '../../api/companySettings.js'
import { getMyBranch, listBranches, updateMyBranchPublicMenu } from '../../api/branches.js'
import { changePassword, updateMe } from '../../api/me.js'
import { toast } from '../../services/toast.js'
import { useAuthStore } from '../../store/authStore.js'
import { thermalPrinter } from '../../utils/thermalPrinter.js'

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
  const [openPrinter, setOpenPrinter] = useState(false)

  // Estados da impressora e sistema
  const [printerConfig, setPrinterConfig] = useState({
    type: 'web', // web, bluetooth, escpos
    paperWidth: 58, // 58mm (compacto), 80mm (padrão)
    autoPrint: false, // imprimir automaticamente após venda
    copies: 1,
    sidebarAutoClose: false,
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      document: ''
    }
  })
  const [testingPrinter, setTestingPrinter] = useState(false)
  const [connectingPrinter, setConnectingPrinter] = useState(false)
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

        // Carregar configurações da impressora e sidebar
        const savedPrinterConfig = localStorage.getItem('printerConfig')
        if (savedPrinterConfig) {
          const parsed = JSON.parse(savedPrinterConfig)
          setPrinterConfig({
            ...parsed,
            sidebarAutoClose: localStorage.getItem('neoerp_sidebar_auto_close') === '1'
          })
        } else {
          // Usar dados da empresa como padrão
          setPrinterConfig(prev => ({
            ...prev,
            companyInfo: {
              name: c?.name || '',
              address: c?.address || '',
              phone: c?.phone || '',
              document: c?.nuit ? `NUIT: ${c.nuit}` : ''
            },
            sidebarAutoClose: localStorage.getItem('neoerp_sidebar_auto_close') === '1'
          }))
        }
      } catch {
        toast.error('Não foi possível carregar configurações agora.')
      }
     })()
     return () => {
       mounted = false
     }
   }, [])

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

    const tick = async () => {
      try {
        const st = await getMyCompanyResetStatus()
        const p = Math.max(0, Math.min(100, Number(st?.progress || 0)))
        setResetProgress((cur) => Math.max(cur, p))
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
      } catch {
        // ignore
      }
      setTimeout(tick, 700)
    }
    tick()
  }

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

  // Funções da impressora e sistema
  async function savePrinterConfig() {
    try {
      localStorage.setItem('printerConfig', JSON.stringify(printerConfig))
      localStorage.setItem('neoerp_sidebar_auto_close', printerConfig.sidebarAutoClose ? '1' : '0')
      toast.success('Configurações salvas!')
      
      // Emitir evento customizado para notificar outras partes do app
      window.dispatchEvent(new Event('sidebarConfigChanged'))
      
      bumpContext() // Forçar atualização do layout
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    }
  }

  async function resetPrinterConfig() {
    try {
      const result = await thermalPrinter.resetPrinter()
      if (result.success) {
        toast.success('Impressora resetada com sucesso!')
      } else {
        toast.error(`Falha no reset: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Erro no reset: ${error.message}`)
    }
  }

  async function testPrinter() {
    setTestingPrinter(true)
    try {
      // Dados de teste
      const testData = {
        sale: {
          id: 'TEST-001',
          created_at: new Date().toISOString(),
          subtotal: 1230.00,
          discount: 50.00,
          total: 1180.00,
          payment_method: 'cash'
        },
        items: [
          {
            name: 'Hambúrguer Simples',
            quantity: 2,
            price_at_sale: 120.00,
            total: 240.00
          },
          {
            name: 'Refrigerante Lata',
            quantity: 3,
            price_at_sale: 45.00,
            total: 135.00
          },
          {
            name: 'Batata Frita',
            quantity: 1,
            price_at_sale: 80.00,
            total: 80.00
          },
          {
            name: 'Suco Natural',
            quantity: 2,
            price_at_sale: 60.00,
            total: 120.00
          },
          {
            name: 'Salada Caesar',
            quantity: 1,
            price_at_sale: 150.00,
            total: 150.00
          },
          {
            name: 'Sopa do Dia',
            quantity: 2,
            price_at_sale: 75.00,
            total: 150.00
          },
          {
            name: 'Pizza Fatia',
            quantity: 1,
            price_at_sale: 100.00,
            total: 100.00
          },
          {
            name: 'Sorvete',
            quantity: 1,
            price_at_sale: 65.00,
            total: 65.00
          },
          {
            name: 'Café Expresso',
            quantity: 3,
            price_at_sale: 40.00,
            total: 120.00
          },
          {
            name: 'Pastel de Nata',
            quantity: 2,
            price_at_sale: 35.00,
            total: 70.00
          }
        ],
        company: printerConfig.companyInfo,
        customer: {
          name: 'Cliente Teste'
        },
        payment: {
          method: 'cash',
          amount_paid: 1200.00,
          change: 20.00
        }
      }

      const result = await thermalPrinter.printReceipt(testData)
      
      if (result.success) {
        toast.success('Teste de impressão realizado com sucesso!')
      } else {
        toast.error(`Falha no teste: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Erro no teste: ${error.message}`)
    } finally {
      setTestingPrinter(false)
    }
  }

  async function connectBluetoothPrinter() {
    setConnectingPrinter(true)
    try {
      const result = await thermalPrinter.connectBluetoothPrinter()
      
      if (result.success) {
        toast.success('Impressora Bluetooth conectada!')
        setPrinterConfig(prev => ({ ...prev, type: 'bluetooth' }))
      } else {
        toast.error(`Falha na conexão: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Erro na conexão: ${error.message}`)
    } finally {
      setConnectingPrinter(false)
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

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm font-semibold text-white">🖨️ Impressora Térmica</div>
          <div className="mt-2 text-sm text-slate-300">
            <div className="text-slate-100 font-medium">
              {printerConfig.type === 'web' && 'Impressora Padrão (USB/Rede)'}
              {printerConfig.type === 'bluetooth' && 'Impressora Bluetooth'}
              {printerConfig.type === 'escpos' && 'Impressora ESC/POS'}
            </div>
            <div className="text-slate-400 text-xs mt-1">Papel: {printerConfig.paperWidth}mm</div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setOpenPrinter(true)}
              className="rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
              type="button"
            >
              Configurar impressora
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

        {isAdmin ? (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5">
            <div className="text-sm font-semibold text-rose-200">Reset do banco de dados</div>
            <div className="mt-2 text-sm text-rose-100/80">
              Apaga todos os dados desta empresa. Mantém apenas os usuários admin/owner.
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setResetConfirmText('')
                  setResetProgress(0)
                  setResetMessage('')
                  setResetError('')
                  setOpenResetCompany(true)
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white"
                type="button"
              >
                Resetar banco
              </button>
            </div>
          </div>
        ) : null}
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

      {/* Modal de Configuração da Impressora */}
      <Modal open={openPrinter} title="Configurar Impressora Térmica" onClose={() => setOpenPrinter(false)}>
        <div className="space-y-6">
          {/* Tipo de Impressora */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Impressora
            </label>
            <select
              value={printerConfig.type}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, type: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2"
            >
              <option value="web">Impressora Padrão (Web)</option>
              <option value="bluetooth">Impressora Bluetooth</option>
              <option value="escpos">Impressora ESC/POS</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {printerConfig.type === 'web' && 'Usa impressora conectada ao sistema (USB/Rede)'}
              {printerConfig.type === 'bluetooth' && 'Conecta impressoras térmicas via Bluetooth'}
              {printerConfig.type === 'escpos' && 'Para impressoras térmicas compatíveis com ESC/POS'}
            </p>
          </div>

          {/* Largura do Papel */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Largura do Papel
            </label>
            <select
              value={printerConfig.paperWidth}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, paperWidth: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2"
            >
              <option value={58}>58mm (Compacto - Restaurante)</option>
              <option value={80}>80mm (Padrão)</option>
            </select>
          </div>

          {/* Configurações Adicionais */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={printerConfig.autoPrint}
                onChange={(e) => setPrinterConfig(prev => ({ ...prev, autoPrint: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-800 text-brand-500"
              />
              <span className="text-sm text-slate-300">Imprimir automaticamente após venda</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Número de Cópias
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={printerConfig.copies}
                onChange={(e) => setPrinterConfig(prev => ({ ...prev, copies: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2"
              />
            </div>

            <div className="pt-4 border-t border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={printerConfig.sidebarAutoClose}
                    onChange={(e) => setPrinterConfig(prev => ({ ...prev, sidebarAutoClose: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Fechar menu automaticamente</span>
                  <span className="text-xs text-slate-400">Fecha o menu lateral ao selecionar uma página (ideal para telas pequenas)</span>
                </div>
              </label>
            </div>
          </div>

          
          {/* Botões de Ação */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={savePrinterConfig}
              className="rounded-xl border border-brand-600 bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Salvar Configurações
            </button>
            
            <button
              onClick={testPrinter}
              disabled={testingPrinter}
              className="rounded-xl border border-slate-600 bg-slate-700 hover:bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {testingPrinter ? 'Testando...' : 'Imprimir Teste'}
            </button>
            
            <button
              onClick={resetPrinterConfig}
              className="rounded-xl border border-amber-600 bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white"
              title="Resetar impressora para resolver problemas de papel longo"
            >
              🔄 Reset Impressora
            </button>
            
            {printerConfig.type === 'bluetooth' && (
              <button
                onClick={connectBluetoothPrinter}
                disabled={connectingPrinter}
                className="rounded-xl border border-blue-600 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {connectingPrinter ? 'Conectando...' : 'Conectar Bluetooth'}
              </button>
            )}
          </div>

          {/* Informações Adicionais */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">📋 Informações Importantes</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• <strong>Impressão Web:</strong> Funciona com impressoras USB/Rede conectadas ao computador</li>
              <li>• <strong>Bluetooth:</strong> Requer navegador compatível com Web Bluetooth API (Chrome/Edge)</li>
              <li>• <strong>ESC/POS:</strong> Padrão da indústria para impressoras térmicas</li>
              <li>• <strong>58mm:</strong> Formato compacto para restaurantes (economiza papel)</li>
              <li>• <strong>Reset:</strong> Use se a impressora estiver saindo papel muito longo</li>
              <li>• <strong>Teste:</strong> Sempre teste antes de usar em produção</li>
            </ul>
          </div>
        </div>
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
