const appBase = import.meta.env.BASE_URL.replace(/\/$/, '')
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1'
export const WS_BASE = `${appBase}/ws`
