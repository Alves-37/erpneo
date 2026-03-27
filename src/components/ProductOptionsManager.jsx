import { useEffect, useState } from 'react'
import { toast } from '../services/toast.js'
import {
  createProductOption,
  createProductOptionGroup,
  deleteProductOption,
  deleteProductOptionGroup,
  listProductOptionGroups,
  updateProductOption,
  updateProductOptionGroup,
} from '../api/productOptions.js'
import { listProducts } from '../api/products.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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
          <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function ProductOptionsManager({ productId, productName, open, onClose }) {
  const [loading, setLoading] = useState(false)
  const [optionGroups, setOptionGroups] = useState([])
  const [allProducts, setAllProducts] = useState([])

  // Estados para criar/editar grupo
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [groupDisplayType, setGroupDisplayType] = useState('radio')
  const [groupIsRequired, setGroupIsRequired] = useState(false)
  const [groupMinSelections, setGroupMinSelections] = useState(0)
  const [groupMaxSelections, setGroupMaxSelections] = useState(1)

  // Estados para criar/editar opção
  const [editingOption, setEditingOption] = useState(null)
  const [optionGroupId, setOptionGroupId] = useState('')
  const [optionName, setOptionName] = useState('')
  const [optionDescription, setOptionDescription] = useState('')
  const [optionType, setOptionType] = useState('addon')
  const [optionPriceAdjustment, setOptionPriceAdjustment] = useState('0')
  const [optionAdjustmentType, setOptionAdjustmentType] = useState('fixed')
  const [optionIngredientImpact, setOptionIngredientImpact] = useState('')
  const [optionIngredientRemove, setOptionIngredientRemove] = useState('')
  const [optionIngredientMultiplier, setOptionIngredientMultiplier] = useState('')

  useEffect(() => {
    if (open && productId) {
      loadOptionGroups()
      loadProducts()
    }
  }, [open, productId])

  async function loadOptionGroups() {
    setLoading(true)
    try {
      const groups = await listProductOptionGroups(productId)
      setOptionGroups(groups || [])
    } catch (err) {
      toast.error('Não foi possível carregar as opções do produto.')
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const products = await listProducts({ limit: 1000 })
      setAllProducts(products || [])
    } catch (err) {
      console.error('Erro ao carregar produtos:', err)
    }
  }

  function resetGroupForm() {
    setEditingGroup(null)
    setGroupName('')
    setGroupDisplayType('radio')
    setGroupIsRequired(false)
    setGroupMinSelections(0)
    setGroupMaxSelections(1)
  }

  function resetOptionForm() {
    setEditingOption(null)
    setOptionGroupId('')
    setOptionName('')
    setOptionDescription('')
    setOptionType('addon')
    setOptionPriceAdjustment('0')
    setOptionAdjustmentType('fixed')
    setOptionIngredientImpact('')
    setOptionIngredientRemove('')
    setOptionIngredientMultiplier('')
  }

  async function saveGroup() {
    if (!groupName.trim()) {
      toast.error('Informe o nome do grupo.')
      return
    }

    if (groupMinSelections > groupMaxSelections) {
      toast.error('Mínimo não pode ser maior que máximo.')
      return
    }

    try {
      const payload = {
        name: groupName.trim(),
        display_type: groupDisplayType,
        is_required: groupIsRequired,
        min_selections: groupMinSelections,
        max_selections: groupMaxSelections,
      }

      if (editingGroup) {
        await updateProductOptionGroup(editingGroup.id, payload)
        toast.success('Grupo atualizado.')
      } else {
        await createProductOptionGroup(productId, payload)
        toast.success('Grupo criado.')
      }

      resetGroupForm()
      loadOptionGroups()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar grupo.')
    }
  }

  async function saveOption() {
    if (!optionName.trim()) {
      toast.error('Informe o nome da opção.')
      return
    }

    if (!optionGroupId) {
      toast.error('Selecione um grupo.')
      return
    }

    try {
      let ingredientImpact = {}
      let ingredientRemove = {}
      let ingredientMultiplier = {}
      
      try {
        ingredientImpact = optionIngredientImpact ? JSON.parse(optionIngredientImpact) : {}
      } catch {
        toast.error('Formato JSON inválido no impacto de ingredientes.')
        return
      }
      
      try {
        ingredientRemove = optionIngredientRemove ? JSON.parse(optionIngredientRemove) : {}
      } catch {
        toast.error('Formato JSON inválido na remoção de ingredientes.')
        return
      }
      
      try {
        ingredientMultiplier = optionIngredientMultiplier ? JSON.parse(optionIngredientMultiplier) : {}
      } catch {
        toast.error('Formato JSON inválido nos multiplicadores.')
        return
      }

      const payload = {
        name: optionName.trim(),
        description: optionDescription.trim() || null,
        option_type: optionType,
        price_adjustment: parseFloat(optionPriceAdjustment) || 0,
        adjustment_type: optionAdjustmentType,
        ingredient_impact: ingredientImpact,
        ingredient_remove: ingredientRemove,
        ingredient_multiplier: ingredientMultiplier,
      }

      if (editingOption) {
        await updateProductOption(editingOption.id, payload)
        toast.success('Opção atualizada.')
      } else {
        await createProductOption(optionGroupId, payload)
        toast.success('Opção criada.')
      }

      resetOptionForm()
      loadOptionGroups()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao salvar opção.')
    }
  }

  async function deleteGroup(groupId) {
    if (!confirm('Tem certeza? Isso removerá todas as opções deste grupo.')) {
      return
    }

    try {
      await deleteProductOptionGroup(groupId)
      toast.success('Grupo removido.')
      loadOptionGroups()
    } catch (err) {
      toast.error('Erro ao remover grupo.')
    }
  }

  async function deleteOption(optionId) {
    if (!confirm('Tem certeza?')) {
      return
    }

    try {
      await deleteProductOption(optionId)
      toast.success('Opção removida.')
      loadOptionGroups()
    } catch (err) {
      toast.error('Erro ao remover opção.')
    }
  }

  function editGroup(group) {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDisplayType(group.display_type)
    setGroupIsRequired(group.is_required)
    setGroupMinSelections(group.min_selections)
    setGroupMaxSelections(group.max_selections)
  }

  function editOption(option, groupId) {
    setEditingOption(option)
    setOptionGroupId(groupId)
    setOptionName(option.name)
    setOptionDescription(option.description || '')
    setOptionPriceAdjustment(String(option.price_adjustment))
    setOptionAdjustmentType(option.adjustment_type)
    setOptionIngredientImpact(JSON.stringify(option.ingredient_impact || {}, null, 2))
  }

  return (
    <Modal open={open} title={`Opções do Produto: ${productName}`} onClose={onClose}>
      <div className="space-y-6">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-300">Carregando...</div>
        ) : (
          <>
            {/* Grupos de Opções */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Grupos de Opções</h3>
                <button
                  type="button"
                  onClick={() => resetGroupForm()}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  + Novo Grupo
                </button>
              </div>

              {/* Formulário de Grupo */}
              {(editingGroup || !groupName) && (
                <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Nome</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        placeholder="Ex: Tamanho, Extras"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                      <select
                        value={groupDisplayType}
                        onChange={(e) => setGroupDisplayType(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="radio">Única escolha</option>
                        <option value="checkbox">Múltiplas escolhas</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Mínimo</label>
                      <input
                        type="number"
                        value={groupMinSelections}
                        onChange={(e) => setGroupMinSelections(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Máximo</label>
                      <input
                        type="number"
                        value={groupMaxSelections}
                        onChange={(e) => setGroupMaxSelections(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={groupIsRequired}
                        onChange={(e) => setGroupIsRequired(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700"
                      />
                      Obrigatório
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetGroupForm}
                        className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveGroup}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {editingGroup ? 'Atualizar' : 'Criar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Grupos */}
              <div className="space-y-3">
                {optionGroups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{group.name}</h4>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span>{group.display_type === 'radio' ? 'Única escolha' : group.display_type === 'checkbox' ? 'Múltiplas' : 'Dropdown'}</span>
                          {group.is_required && <span className="text-amber-400">Obrigatório</span>}
                          <span>{group.min_selections}-{group.max_selections}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => editGroup(group)}
                          className="h-6 w-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGroup(group.id)}
                          className="h-6 w-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Opções do Grupo */}
                    <div className="space-y-2">
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-2">
                          <div className="flex-1">
                            <div className="text-sm text-slate-100">{option.name}</div>
                            {option.description && (
                              <div className="text-xs text-slate-400">{option.description}</div>
                            )}
                            <div className="mt-1 text-xs text-slate-500">
                              {option.price_adjustment > 0 && (
                                <span className="text-emerald-400">
                                  +{option.price_adjustment} MT
                                </span>
                              )}
                              {Object.keys(option.ingredient_impact || {}).length > 0 && (
                                <span className="ml-2 text-blue-400">
                                  +{Object.keys(option.ingredient_impact).length} ingredientes
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => editOption(option, group.id)}
                              className="h-6 w-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteOption(option.id)}
                              className="h-6 w-6 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Botão para adicionar opção */}
                      <button
                        type="button"
                        onClick={() => {
                          resetOptionForm()
                          setOptionGroupId(group.id)
                        }}
                        className="w-full rounded-lg border border-dashed border-slate-700 bg-slate-950 hover:bg-slate-900 p-2 text-xs text-slate-400"
                      >
                        + Adicionar Opção
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário de Opção (quando está editando/criando) */}
            {optionGroupId && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">
                  {editingOption ? 'Editar Opção' : 'Nova Opção'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nome</label>
                    <input
                      type="text"
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      placeholder="Ex: Pequeno, Bacon Extra"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                    <input
                      type="text"
                      value={optionDescription}
                      onChange={(e) => setOptionDescription(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Ajuste de Preço (MT)</label>
                    <input
                      type="number"
                      value={optionPriceAdjustment}
                      onChange={(e) => setOptionPriceAdjustment(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Ajuste</label>
                    <select
                      value={optionAdjustmentType}
                      onChange={(e) => setOptionAdjustmentType(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="fixed">Fixo</option>
                      <option value="percentage">Percentual</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Impacto em Ingredientes (JSON)
                  </label>
                  <textarea
                    value={optionIngredientImpact}
                    onChange={(e) => setOptionIngredientImpact(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
                    rows={3}
                    placeholder='{"1": {"qty": 0.1, "unit": "kg"}}'
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    Formato: {`{"product_id": {"qty": 0.1, "unit": "kg"}}`}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetOptionForm}
                    className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveOption}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {editingOption ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
