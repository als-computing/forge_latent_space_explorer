import { useEffect, useState } from 'react'
import {
  browseFiles,
  browseTiled,
  fetchDefaultTiledUri,
  listFilesystem,
  listTiledNode,
} from '../api/data'
import type { DataProjectDict, FilesystemChild, TiledChild } from '../types/data'

// ---------- shared styles ----------

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 4px',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
  fontSize: 13,
}

const ICON: React.CSSProperties = { width: 14, flexShrink: 0, color: '#555' }

// ---------- filesystem tree ----------

interface FsNodeState {
  children: FilesystemChild[] | null  // null = not yet fetched
  loading: boolean
}

function FsTree({
  root_uri,
  selected,
  onToggleSelect,
}: {
  root_uri: string | null
  selected: Set<string>
  onToggleSelect: (relPath: string) => void
}) {
  const [nodes, setNodes] = useState<Record<string, FsNodeState>>({})
  const [rootChildren, setRootChildren] = useState<FilesystemChild[] | null>(null)
  const [rootLoading, setRootLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRootLoading(true)
    listFilesystem('')
      .then((r) => setRootChildren(r.children))
      .catch(() => setRootChildren([]))
      .finally(() => setRootLoading(false))
  }, [root_uri])

  function toggleExpand(relPath: string) {
    const next = new Set(expanded)
    if (next.has(relPath)) {
      next.delete(relPath)
      setExpanded(next)
      return
    }
    next.add(relPath)
    setExpanded(next)

    if (!nodes[relPath]) {
      setNodes((prev) => ({ ...prev, [relPath]: { children: null, loading: true } }))
      listFilesystem(relPath)
        .then((r) =>
          setNodes((prev) => ({
            ...prev,
            [relPath]: { children: r.children, loading: false },
          })),
        )
        .catch(() =>
          setNodes((prev) => ({
            ...prev,
            [relPath]: { children: [], loading: false },
          })),
        )
    }
  }

  function renderChildren(children: FilesystemChild[], depth: number) {
    return children.map((child) => {
      const isDir = child.type === 'directory'
      const isExpanded = expanded.has(child.rel_path)
      const nodeState = nodes[child.rel_path]
      const isSelected = selected.has(child.rel_path)

      return (
        <div key={child.rel_path}>
          <div
            style={{
              ...ROW,
              paddingLeft: depth * 16 + 4,
              background: isSelected ? '#e7f1ff' : undefined,
              cursor: isDir ? 'pointer' : 'default',
              color: isDir ? undefined : '#888',
            }}
            onClick={() => {
              if (!isDir) return
              toggleExpand(child.rel_path)
              onToggleSelect(child.rel_path)
            }}
          >
            {isDir ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(child.rel_path)}
                onClick={(e) => e.stopPropagation()}
                style={{ margin: 0, flexShrink: 0 }}
              />
            ) : (
              <span style={{ width: 14, flexShrink: 0 }} />
            )}
            <span style={ICON}>{isDir ? (isExpanded ? '▼' : '▶') : '·'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isDir ? undefined : 12 }}>
              {child.name}
            </span>
          </div>

          {isDir && isExpanded && (
            <div>
              {nodeState?.loading && (
                <div style={{ paddingLeft: (depth + 1) * 16 + 4, fontSize: 12, color: '#888' }}>
                  Loading…
                </div>
              )}
              {nodeState?.children && renderChildren(nodeState.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (rootLoading) {
    return <div style={{ fontSize: 12, color: '#888', padding: 8 }}>Loading…</div>
  }
  if (!rootChildren || rootChildren.length === 0) {
    return <div style={{ fontSize: 12, color: '#888', padding: 8 }}>No files found</div>
  }

  return <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>{renderChildren(rootChildren, 0)}</div>
}

// ---------- Tiled tree ----------

interface TiledNodeState {
  children: TiledChild[] | null
  loading: boolean
}

function TiledTree({
  baseUri,
  selected,
  onToggleSelect,
}: {
  baseUri: string
  selected: Set<string>
  onToggleSelect: (nodePath: string, type: 'container' | 'array') => void
}) {
  const [nodes, setNodes] = useState<Record<string, TiledNodeState>>({})
  const [rootChildren, setRootChildren] = useState<TiledChild[] | null>(null)
  const [rootLoading, setRootLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!baseUri.trim()) return
    setRootLoading(true)
    setError(null)
    setRootChildren(null)
    setNodes({})
    setExpanded(new Set())
    listTiledNode(baseUri, '')
      .then((r) => setRootChildren(r.children))
      .catch((e) => setError(e.message))
      .finally(() => setRootLoading(false))
  }, [baseUri])

  function toggleExpand(nodePath: string) {
    const next = new Set(expanded)
    if (next.has(nodePath)) {
      next.delete(nodePath)
      setExpanded(next)
      return
    }
    next.add(nodePath)
    setExpanded(next)

    if (!nodes[nodePath]) {
      setNodes((prev) => ({ ...prev, [nodePath]: { children: null, loading: true } }))
      listTiledNode(baseUri, nodePath)
        .then((r) =>
          setNodes((prev) => ({
            ...prev,
            [nodePath]: { children: r.children, loading: false },
          })),
        )
        .catch(() =>
          setNodes((prev) => ({
            ...prev,
            [nodePath]: { children: [], loading: false },
          })),
        )
    }
  }

  function renderChildren(children: TiledChild[], depth: number) {
    return children.map((child) => {
      const isContainer = child.type === 'container'
      const isExpanded = expanded.has(child.node_path)
      const nodeState = nodes[child.node_path]
      const isSelected = selected.has(child.node_path)

      return (
        <div key={child.node_path}>
          <div
            style={{ ...ROW, paddingLeft: depth * 16 + 4, background: isSelected ? '#e7f1ff' : undefined }}
            onClick={() => {
              if (isContainer) toggleExpand(child.node_path)
              onToggleSelect(child.node_path, child.type)
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(child.node_path, child.type)}
              onClick={(e) => e.stopPropagation()}
              style={{ margin: 0, flexShrink: 0 }}
            />
            {isContainer && (
              <span style={ICON}>{isExpanded ? '▼' : '▶'}</span>
            )}
            {!isContainer && <span style={{ ...ICON, color: '#0c63e4' }}>▣</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {child.name}
            </span>
            {!isContainer && (
              <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>array</span>
            )}
          </div>

          {isContainer && isExpanded && (
            <div>
              {nodeState?.loading && (
                <div style={{ paddingLeft: (depth + 1) * 16 + 4, fontSize: 12, color: '#888' }}>
                  Loading…
                </div>
              )}
              {nodeState?.children && renderChildren(nodeState.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (rootLoading) {
    return <div style={{ fontSize: 12, color: '#888', padding: 8 }}>Connecting…</div>
  }
  if (error) {
    return <div style={{ fontSize: 12, color: '#c00', padding: 8 }}>{error}</div>
  }
  if (!rootChildren) return null
  if (rootChildren.length === 0) {
    return <div style={{ fontSize: 12, color: '#888', padding: 8 }}>No nodes found</div>
  }

  return <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>{renderChildren(rootChildren, 0)}</div>
}

// ---------- main component ----------

interface Props {
  onLoad: (dict: DataProjectDict) => void
}

export default function FileBrowser({ onLoad }: Props) {
  const [mode, setMode] = useState<'file' | 'tiled'>('file')

  // filesystem
  const [fsSelected, setFsSelected] = useState<Set<string>>(new Set())

  // tiled
  const [tiledUri, setTiledUri] = useState('')
  const [tiledSelected, setTiledSelected] = useState<Set<string>>(new Set())

  // shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDefaultTiledUri().then((uri) => { if (uri) setTiledUri(uri) })
  }, [])

  function toggleFsSelect(relPath: string) {
    setFsSelected((prev) => {
      const next = new Set(prev)
      if (next.has(relPath)) next.delete(relPath)
      else next.add(relPath)
      return next
    })
  }


  function toggleTiledSelect(nodePath: string) {
    setTiledSelected((prev) => {
      const next = new Set(prev)
      if (next.has(nodePath)) next.delete(nodePath)
      else next.add(nodePath)
      return next
    })
  }

  async function handleLoad() {
    setLoading(true)
    setError(null)
    try {
      let dict: DataProjectDict
      if (mode === 'file') {
        const paths = fsSelected.size > 0 ? Array.from(fsSelected) : undefined
        dict = await browseFiles(undefined, paths)
      } else {
        if (!tiledUri.trim()) throw new Error('Enter a Tiled server URI')
        const paths = tiledSelected.size > 0 ? Array.from(tiledSelected) : undefined
        dict = await browseTiled(tiledUri.trim(), paths)
      }
      onLoad(dict)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const canLoad =
    mode === 'file'
      ? fsSelected.size > 0
      : tiledUri.trim().length > 0 && tiledSelected.size > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* mode toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['file', 'tiled'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null) }}
            style={{
              padding: '4px 14px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: mode === m ? '#333' : '#fff',
              color: mode === m ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {m === 'tiled' ? 'Tiled' : 'File System'}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <>
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              Select folders to load{fsSelected.size > 0 && ` (${fsSelected.size} selected)`}
            </div>
            <FsTree
              root_uri={null}
              selected={fsSelected}
              onToggleSelect={toggleFsSelect}
            />
          </div>
        </>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 13 }}>
            Tiled server URI
            <input
              type="text"
              value={tiledUri}
              onChange={(e) => { setTiledUri(e.target.value); setTiledSelected(new Set()) }}
              placeholder="http://localhost:8000"
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 6px', fontSize: 13, boxSizing: 'border-box' }}
            />
          </label>

          {tiledUri.trim() && (
            <div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                Select nodes to load{tiledSelected.size > 0 && ` (${tiledSelected.size} selected)`}
              </div>
              <TiledTree
                baseUri={tiledUri.trim()}
                selected={tiledSelected}
                onToggleSelect={toggleTiledSelect}
              />
            </div>
          )}
        </>
      )}

      {error && <div style={{ fontSize: 12, color: '#c00' }}>{error}</div>}

      <button
        onClick={handleLoad}
        disabled={loading || !canLoad}
        style={{
          padding: '6px 16px',
          borderRadius: 4,
          border: 'none',
          background: canLoad ? '#0c63e4' : '#ccc',
          color: '#fff',
          cursor: canLoad ? 'pointer' : 'default',
          fontSize: 13,
          alignSelf: 'flex-start',
        }}
      >
        {loading ? 'Loading…' : 'Load'}
      </button>
    </div>
  )
}
