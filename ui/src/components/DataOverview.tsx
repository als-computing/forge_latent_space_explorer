import { useEffect, useState } from 'react'
import { fetchOverview } from '../api/data'
import type { DataProjectDict } from '../types/data'

const PAGE_SIZE = 6

interface Props {
  dataProjectDict: DataProjectDict | null
  logTransform: boolean
  percentiles: [number, number]
}

export default function DataOverview({ dataProjectDict, logTransform, percentiles }: Props) {
  const [images, setImages] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const isFirst = page === 0
  const isLast = totalPages === 0 || page >= totalPages - 1

  useEffect(() => {
    setPage(0)
  }, [dataProjectDict])

  useEffect(() => {
    if (!dataProjectDict?.datasets?.length) {
      setImages([])
      setTotal(0)
      return
    }
    setLoading(true)
    setError(null)
    fetchOverview({
      data_project_dict: dataProjectDict,
      log_transform: logTransform,
      percentiles,
      page,
      page_size: PAGE_SIZE,
    })
      .then((r) => { setImages(r.images); setTotal(r.total) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load images'))
      .finally(() => setLoading(false))
  }, [dataProjectDict, logTransform, percentiles, page])

  if (!dataProjectDict?.datasets?.length) return null

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'none',
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: '2px 8px',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontSize: 14,
    lineHeight: 1,
  })

  return (
    <div style={{
      marginBottom: 10,
      padding: '8px 12px',
      border: '1px solid rgba(0,0,0,0.175)',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>Data Overview</span>
        {!loading && total > 0 && (
          <span style={{ fontSize: 12, color: '#666' }}>{total} images</span>
        )}
        {loading && <span style={{ fontSize: 12, color: '#888' }}>Loading…</span>}
        {error && <span style={{ fontSize: 12, color: '#c00' }}>{error}</span>}

        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <button style={btnStyle(isFirst)} disabled={isFirst} onClick={() => setPage(0)}>«</button>
            <button style={btnStyle(isFirst)} disabled={isFirst} onClick={() => setPage(p => p - 1)}>‹</button>
            <span style={{ fontSize: 12, color: '#666', minWidth: 60, textAlign: 'center' }}>
              {page + 1} / {totalPages}
            </span>
            <button style={btnStyle(isLast)} disabled={isLast} onClick={() => setPage(p => p + 1)}>›</button>
            <button style={btnStyle(isLast)} disabled={isLast} onClick={() => setPage(totalPages - 1)}>»</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 3 }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
          />
        ))}
      </div>
    </div>
  )
}
