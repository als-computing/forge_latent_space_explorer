import { useEffect, useRef, useState } from 'react'
import { fetchJobStatus } from '../api/jobs'
import type { JobStatusResponse } from '../types/jobs'

const POLL_INTERVAL_MS = 5_000

export function useJobStatus(
  jobId: string | null,
  kind: 'latent-space' | 'clustering',
  projectName: string,
) {
  const [status, setStatus] = useState<JobStatusResponse | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStatus(null)

    if (!jobId || !projectName) return

    async function check() {
      try {
        const s = await fetchJobStatus(jobId!, kind, projectName)
        setStatus(s)
        if (s.ready && intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } catch {
        // network error — keep polling
      }
    }

    check()
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId, kind, projectName])

  return status
}
