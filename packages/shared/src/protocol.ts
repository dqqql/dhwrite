import type { Annotation, Connection, DhCard, DhPack, Rect, RoomState } from './types'

export type ClientMessage =
  | { type: 'room.startCoCreation'; requestId?: string; payload?: Record<string, never> }
  | { type: 'room.endCoCreation'; requestId?: string; payload?: Record<string, never> }
  | { type: 'room.importPack'; requestId?: string; payload: { pack: DhPack } }
  | { type: 'turn.end'; requestId?: string; payload?: Record<string, never> }
  | { type: 'turn.forceSkip'; requestId?: string; payload: { playerId: string } }
  | { type: 'card.draw'; requestId?: string; payload?: Record<string, never> }
  | { type: 'card.draw.confirm'; requestId?: string; payload: { cardId: string } }
  | { type: 'card.create'; requestId?: string; payload: { card: Omit<DhCard, 'id' | 'is_custom'> } }
  | { type: 'card.play'; requestId?: string; payload: { cardId: string; x: number; y: number } }
  | { type: 'card.move.commit'; requestId?: string; payload: { cardId: string; x: number; y: number } }
  | { type: 'card.resize.commit'; requestId?: string; payload: { cardId: string; gridScale: number } }
  | { type: 'card.lock'; requestId?: string; payload: { cardId: string } }
  | { type: 'card.unlock'; requestId?: string; payload: { cardId: string } }
  | { type: 'card.edit'; requestId?: string; payload: { cardId: string; updates: Partial<DhCard> & { territory?: Rect } } }
  | { type: 'card.delete'; requestId?: string; payload: { cardId: string } }
  | { type: 'card.recycle'; requestId?: string; payload: { cardId: string } }
  | { type: 'connection.add'; requestId?: string; payload: Omit<Connection, 'id'> }
  | { type: 'connection.remove'; requestId?: string; payload: { connectionId: string } }
  | { type: 'annotation.add'; requestId?: string; payload: Omit<Annotation, 'id'> }
  | { type: 'annotation.remove'; requestId?: string; payload: { annotationId: string } }
  | { type: 'ping'; requestId?: string; payload?: Record<string, never> }

export type ServerMessage =
  | { type: 'room.snapshot'; payload: { state: RoomState; you: { player_id: string } } }
  | { type: 'room.updated'; payload: { state: RoomState; reason: string } }
  | { type: 'draw.options'; requestId?: string; payload: { cards: DhCard[] } }
  | { type: 'ack'; requestId?: string; payload: { ok: true } }
  | { type: 'error'; requestId?: string; payload: { code: string; message: string } }
  | { type: 'pong'; requestId?: string; payload: { server_time: string } }

export interface CreateRoomRequest {
  room_name: string
  nickname: string
  selected_pack_ids?: string[]
}

export interface JoinRoomRequest {
  invite_code: string
  nickname: string
}

export interface RoomJoinResponse {
  session: {
    room_id: string
    invite_code: string
    player_id: string
    nickname: string
    token: string
    websocket_url: string
  }
  state: RoomState
}
