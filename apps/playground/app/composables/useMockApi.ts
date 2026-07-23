export function useMockApi() {
  const config = useRuntimeConfig()

  const publicBaseURL = String(config.public.mockApiUrl || '')
  const internalBaseURL = String(config.mockApiInternalUrl || '')

  // Prefer loopback URL during SSR to avoid public HTTPS hairpin.
  const baseURL = import.meta.server && internalBaseURL
    ? internalBaseURL
    : publicBaseURL

  function apiUrl(path: string): string {
    return `${baseURL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  }

  function publicApiUrl(path: string): string {
    return `${publicBaseURL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  }

  return {
    baseURL,
    publicBaseURL,
    apiUrl,
    publicApiUrl,
  }
}
