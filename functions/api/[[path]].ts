interface FetchBinding {
  fetch: (request: Request) => Promise<Response>
}

interface PagesFunctionEnv {
  DHGC_REALTIME?: FetchBinding
}

export const onRequest = async (context: { request: Request; env: PagesFunctionEnv }) => {
  const { request, env } = context

  const url = new URL(request.url)
  url.hostname = 'dhgc-realtime.gooole-dql.workers.dev'
  url.port = ''

  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-Host', new URL(request.url).host)
  headers.set('X-Forwarded-Proto', 'https')

  const proxied = new Request(url.toString(), {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual',
  })

  if (env.DHGC_REALTIME) {
    return env.DHGC_REALTIME.fetch(proxied)
  }

  return fetch(proxied)
}
