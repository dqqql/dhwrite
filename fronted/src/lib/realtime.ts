import { safeJsonParse, type CreateRoomRequest, type JoinRoomRequest, type RoomJoinResponse, type ServerMessage } from '@dhgc/shared'

const DEFAULT_API_BASE = 'http://127.0.0.1:8787'

export function getRealtimeApiBase() {
  return (import.meta.env.VITE_REALTIME_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, '')
}

export async function createRoomRequest(payload: CreateRoomRequest) {
  return requestJson<RoomJoinResponse>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function joinRoomRequest(payload: JoinRoomRequest) {
  return requestJson<RoomJoinResponse>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchDhRoomBackup(inviteCode: string) {
  const response = await fetch(`${getRealtimeApiBase()}/api/rooms/${inviteCode}/export/dhroom`)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return response.blob()
}

interface RoomSocketHandlers {
  onClose?: () => void
  onError?: (error: Error) => void
  onMessage: (message: ServerMessage) => void
  onOpen?: () => void
}

export function openRoomSocket(websocketUrl: string, handlers: RoomSocketHandlers) {
  const socket = new WebSocket(websocketUrl)

  socket.addEventListener('open', () => {
    handlers.onOpen?.()
  })

  socket.addEventListener('close', () => {
    handlers.onClose?.()
  })

  socket.addEventListener('error', () => {
    handlers.onError?.(new Error('WebSocket connection error'))
  })

  socket.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? event.data : String(event.data)
      const message = safeJsonParse(data) as ServerMessage
      handlers.onMessage(message)
    } catch (error) {
      handlers.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  })

  return socket
}

async function requestJson<T>(pathname: string, init?: RequestInit) {
  const response = await fetch(`${getRealtimeApiBase()}${pathname}`, {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: string; message?: string }
    return payload.message ?? payload.error ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
