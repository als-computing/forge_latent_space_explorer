import { useEffect, useState } from 'react'
import { fetchModels } from '../api/models'
import type { Model, ModelType, ParameterValues } from '../types/models'
import ParameterField from './ParameterField'

interface Props {
  label: string
  modelType: ModelType
  onParamsChange?: (modelName: string, params: ParameterValues) => void
}

function defaultValues(model: Model): ParameterValues {
  return Object.fromEntries(model.gui_parameters.map((p) => [p.param_key, p.value]))
}

export default function ModelSelect({ label, modelType, onParamsChange }: Props) {
  const [models, setModels] = useState<Model[]>([])
  const [selected, setSelected] = useState<Model | null>(null)
  const [params, setParams] = useState<ParameterValues>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels(modelType)
      .then((data) => {
        setModels(data)
        if (data.length > 0) {
          setSelected(data[0])
          setParams(defaultValues(data[0]))
        }
      })
      .catch((e) => setError(e.message))
  }, [modelType])

  function handleModelChange(modelName: string) {
    const model = models.find((m) => m.model_name === modelName) ?? null
    setSelected(model)
    if (model) {
      const next = defaultValues(model)
      setParams(next)
      onParamsChange?.(model.model_name, next)
    }
  }

  function handleParamChange(key: string, value: number) {
    const next = { ...params, [key]: value }
    setParams(next)
    if (selected) onParamsChange?.(selected.model_name, next)
  }

  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{label}</h3>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Model
        <select
          value={selected?.model_name ?? ''}
          onChange={(e) => handleModelChange(e.target.value)}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        >
          {models.map((m) => (
            <option key={m.model_name} value={m.model_name}>
              {m.model_name}
            </option>
          ))}
        </select>
      </label>

      {selected?.gui_parameters.map((param) => (
        <ParameterField
          key={param.param_key}
          param={param}
          value={params[param.param_key] ?? param.value}
          onChange={handleParamChange}
        />
      ))}
    </div>
  )
}
