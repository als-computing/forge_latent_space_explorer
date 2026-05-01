import type { GuiParameter } from '../types/models'

interface Props {
  param: GuiParameter
  value: number
  onChange: (key: string, value: number) => void
}

export default function ParameterField({ param, value, onChange }: Props) {
  const { type, title, param_key } = param

  if (type === 'dropdown') {
    return (
      <label style={{ display: 'block', marginBottom: 8 }}>
        {title}
        <select
          value={value}
          onChange={(e) => onChange(param_key, Number(e.target.value))}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        >
          {param.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (type === 'slider') {
    return (
      <label style={{ display: 'block', marginBottom: 8 }}>
        {title}: {value}
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(e) => onChange(param_key, Number(e.target.value))}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>
    )
  }

  // int and float both use number input
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      {title}
      <input
        type="number"
        value={value}
        step={type === 'float' ? 0.1 : 1}
        onChange={(e) => onChange(param_key, Number(e.target.value))}
        style={{ display: 'block', marginTop: 4, width: '100%' }}
      />
    </label>
  )
}
