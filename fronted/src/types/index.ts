// ── Local temporary types ──────────────────────────────────────────
// NOTE: These will be replaced by packages/shared types once the backend agent
// defines the zod schemas and WebSocket protocol.

export type CardType = 'Location' | 'NPC' | 'Feature'
export type RoomMode = 'free' | 'co-creation'
export type ConnectionColor = 'red' | 'green' | 'gray'

export interface DhCard {
  id: string
  type: CardType
  title: string
  content: string
  style: string       // hex color override; falls back to type default
  is_custom: boolean
}

export interface MapCard extends DhCard {
  x: number
  y: number
  width: number
  height: number
  grid_cols: number
  grid_rows: number
  grid_scale: number
  territory?: { x: number; y: number; width: number; height: number }
  placed_by: string   // player nickname
  player_color: string
  locked_by?: string  // player nickname currently dragging
  is_expanded?: boolean
}

export interface Connection {
  id: string
  from_card_id: string
  to_card_id: string
  color: ConnectionColor
  label?: string
}

export interface Annotation {
  id: string
  text: string
  x: number
  y: number
  font_size: number
}

export interface Player {
  id: string
  nickname: string
  color: string
  is_host: boolean
  is_online: boolean
}

export interface RoomState {
  room_id: string
  room_name: string
  invite_code: string
  expires_at: string   // ISO timestamp
  mode: RoomMode
  host_player_id: string
  current_turn_player_id: string | null
  turn_order: string[] // player ids
  players: Player[]
  hands: Record<string, DhCard[]>   // playerId → hand cards
  map_cards: MapCard[]
  connections: Connection[]
  annotations: Annotation[]
  deck_remaining: number
}

// ── Pack types ─────────────────────────────────────────────────────
export interface PackCard {
  id: string
  type: CardType
  title: string
  content: string
  style: string
}

export interface DhPack {
  pack_name: string
  cards: PackCard[]
}

// ── UI-only ────────────────────────────────────────────────────────
export type DrawOption = DhCard

export type ToastType = 'info' | 'success' | 'warning' | 'error'
export interface Toast {
  id: string
  message: string
  type: ToastType
}
