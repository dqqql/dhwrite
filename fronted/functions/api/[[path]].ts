export const onRequest = async (context) => {
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

  const backend = env.DHGC_REALTIME ?? fetch
  return backend(proxied)
}
