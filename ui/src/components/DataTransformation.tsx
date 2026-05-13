interface Props {
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
}

export default function DataTransformation({
  logTransform,
  onLogTransformChange,
  percentiles,
  onPercentilesChange,
  mask,
  onMaskChange,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={logTransform}
          onChange={(e) => onLogTransformChange(e.target.checked)}
        />
        Log Transform
      </label>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Percentiles</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ fontSize: 13 }}>
            Min
            <input
              type="number"
              min={0}
              max={percentiles[1]}
              value={percentiles[0]}
              onChange={(e) => onPercentilesChange([Number(e.target.value), percentiles[1]])}
              style={{ display: 'block', width: 70, marginTop: 4, padding: '4px 6px', boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Max
            <input
              type="number"
              min={percentiles[0]}
              max={100}
              value={percentiles[1]}
              onChange={(e) => onPercentilesChange([percentiles[0], Number(e.target.value)])}
              style={{ display: 'block', width: 70, marginTop: 4, padding: '4px 6px', boxSizing: 'border-box' }}
            />
          </label>
        </div>
      </div>

      <label style={{ display: 'block', fontSize: 13 }}>
        Mask
        <select
          value={mask}
          onChange={(e) => onMaskChange(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 6px' }}
        >
          <option value="None">None</option>
        </select>
      </label>
    </div>
  )
}
