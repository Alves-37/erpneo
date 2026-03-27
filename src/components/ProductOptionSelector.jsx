import { useEffect, useState } from 'react'
import { listProductOptionGroups } from '../api/productOptions.js'
import { toast } from '../services/toast.js'

export default function ProductOptionSelector({ productId, productName, basePrice, onOptionsChange, onClose }) {
  const [loading, setLoading] = useState(false)
  const [optionGroups, setOptionGroups] = useState([])
  const [selectedOptions, setSelectedOptions] = useState({})
  const [totalPrice, setTotalPrice] = useState(basePrice || 0)

  useEffect(() => {
    if (productId) {
      loadOptionGroups()
    }
  }, [productId])

  useEffect(() => {
    // Calcular preço total
    let total = basePrice || 0
    const selectedData = {}

    Object.entries(selectedOptions).forEach(([groupId, selections]) => {
      if (Array.isArray(selections)) {
        selections.forEach(optionId => {
          const option = findOptionById(optionId)
          if (option) {
            total += parseFloat(option.price_adjustment) || 0
            
            // Guardar dados para callback
            if (!selectedData[groupId]) selectedData[groupId] = []
            selectedData[groupId].push({
              option_id: option.id,
              option_name: option.name,
              price_adjustment: parseFloat(option.price_adjustment) || 0,
              ingredient_impact: option.ingredient_impact || {}
            })
          }
        })
      }
    })

    setTotalPrice(total)
    
    // Notificar componente pai
    if (onOptionsChange) {
      onOptionsChange({
        selectedOptions: selectedData,
        totalPrice: total,
        priceAdjustment: total - (basePrice || 0)
      })
    }
  }, [selectedOptions, basePrice, onOptionsChange])

  async function loadOptionGroups() {
    setLoading(true)
    try {
      const groups = await listProductOptionGroups(productId)
      setOptionGroups(groups || [])
      
      // Inicializar seleções
      const initialSelections = {}
      groups.forEach(group => {
        if (group.display_type === 'radio' || group.max_selections === 1) {
          // Para radio, selecionar primeira opção se for obrigatório
          if (group.is_required && group.options?.length > 0) {
            initialSelections[group.id] = [group.options[0].id]
          } else {
            initialSelections[group.id] = []
          }
        } else {
          // Para checkbox, começar vazio
          initialSelections[group.id] = []
        }
      })
      setSelectedOptions(initialSelections)
    } catch (err) {
      toast.error('Não foi possível carregar as opções do produto.')
    } finally {
      setLoading(false)
    }
  }

  function findOptionById(optionId) {
    for (const group of optionGroups) {
      const option = group.options?.find(opt => opt.id === optionId)
      if (option) return option
    }
    return null
  }

  function handleOptionChange(groupId, optionId, isChecked) {
    setSelectedOptions(prev => {
      const newSelections = { ...prev }
      const group = optionGroups.find(g => g.id === groupId)
      
      if (!group) return prev

      if (group.display_type === 'radio' || group.max_selections === 1) {
        // Radio: apenas uma seleção
        newSelections[groupId] = isChecked ? [optionId] : []
      } else {
        // Checkbox: múltiplas seleções
        let current = newSelections[groupId] || []
        
        if (isChecked) {
          // Verificar limite máximo
          if (group.max_selections > 0 && current.length >= group.max_selections) {
            toast.error(`Máximo de ${group.max_selections} opções permitidas.`)
            return prev
          }
          current = [...current, optionId]
        } else {
          // Verificar limite mínimo
          if (group.min_selections > 0 && current.length <= group.min_selections) {
            toast.error(`Mínimo de ${group.min_selections} opções obrigatórias.`)
            return prev
          }
          current = current.filter(id => id !== optionId)
        }
        
        newSelections[groupId] = current
      }

      // Validar regras
      if (group.is_required && (!newSelections[groupId] || newSelections[groupId].length === 0)) {
        toast.error(`${group.name} é obrigatório.`)
        return prev
      }

      return newSelections
    })
  }

  function isOptionSelected(groupId, optionId) {
    return selectedOptions[groupId]?.includes(optionId) || false
  }

  function canSelectOption(groupId) {
    const group = optionGroups.find(g => g.id === groupId)
    if (!group) return true
    
    const current = selectedOptions[groupId] || []
    return group.max_selections <= 0 || current.length < group.max_selections
  }

  function canDeselectOption(groupId) {
    const group = optionGroups.find(g => g.id === groupId)
    if (!group) return true
    
    const current = selectedOptions[groupId] || []
    return !group.is_required && current.length > group.min_selections
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-sm text-slate-300">Carregando opções...</div>
        </div>
      </div>
    )
  }

  if (!optionGroups.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md">
          <div className="text-sm text-slate-300 mb-4">Este produto não possui opções disponíveis.</div>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-white">{productName}</div>
              <div className="mt-1 text-xs text-slate-400">Personalize seu pedido</div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Conteúdo */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-6">
            {optionGroups.map(group => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {group.name}
                    {group.is_required && <span className="ml-2 text-amber-400">*</span>}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {group.min_selections > 0 && group.max_selections > 0 
                      ? `${group.min_selections}-${group.max_selections}` 
                      : group.max_selections > 1 
                        ? `Até ${group.max_selections}` 
                        : group.min_selections > 0 
                          ? `Mín ${group.min_selections}` 
                          : 'Livre'
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  {group.options?.map(option => {
                    const isSelected = isOptionSelected(group.id, option.id)
                    const canSelect = canSelectOption(group.id)
                    const canDeselect = canDeselectOption(group.id)

                    return (
                      <label
                        key={option.id}
                        className={`
                          flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors
                          ${isSelected 
                            ? 'border-brand-600 bg-brand-950/30' 
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                          }
                          ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type={group.display_type === 'radio' || group.max_selections === 1 ? 'radio' : 'checkbox'}
                            checked={isSelected}
                            onChange={(e) => {
                              if (!canSelect && !isSelected) return
                              if (!canDeselect && isSelected) return
                              handleOptionChange(group.id, option.id, e.target.checked)
                            }}
                            disabled={!canSelect && !isSelected}
                            className="h-4 w-4 rounded border-slate-700 text-brand-600 focus:ring-brand-600"
                          />
                          
                          <div>
                            <div className="text-sm font-medium text-slate-100">
                              {option.name}
                            </div>
                            {option.description && (
                              <div className="text-xs text-slate-400">{option.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {option.price_adjustment > 0 && (
                            <div className="text-sm font-semibold text-emerald-400">
                              +{Number(option.price_adjustment).toFixed(2)} MT
                            </div>
                          )}
                          {Object.keys(option.ingredient_impact || {}).length > 0 && (
                            <div className="text-xs text-blue-400">
                              +{Object.keys(option.ingredient_impact).length} ing.
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-400">Total:</div>
              <div className="text-lg font-bold text-white">
                {Number(totalPrice).toFixed(2)} MT
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
