export type CardType = 'Location' | 'NPC' | 'Feature'
export type RoomMode = 'free' | 'co-creation' | 'normal'
export type ConnectionColor = 'red' | 'green' | 'gray'
export type RoomPackSource = 'built-in' | 'imported'

export interface DhCard {
  id: string
  type: CardType
  title: string
  content: string
  style: string
  is_custom: boolean
  pack_id?: string
}

export interface MapCard extends DhCard {
  x: number
  y: number
  width: number
  height: number
  grid_cols: number
  grid_rows: number
  grid_scale: number
  territory?: Rect
  placed_by: string
  placed_by_player_id: string
  player_color: string
  locked_by?: string
  locked_by_player_id?: string
  locked_until?: string
  is_expanded?: boolean
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
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
  joined_at: string
  last_seen_at: string
}

export interface RoomPackCard {
  id: string
  type: CardType
  title: string
  content: string
  style: string
}

export interface RoomPackLibraryItem {
  id: string
  pack_name: string
  description?: string
  source: RoomPackSource
  cards: RoomPackCard[]
}

export interface RoomSettings {
  imports_enabled: boolean
}

export interface RoomState {
  room_id: string
  room_name: string
  invite_code: string
  created_at: string
  expires_at: string
  mode: RoomMode
  host_player_id: string
  current_turn_player_id: string | null
  turn_order: string[]
  players: Player[]
  hands: Record<string, DhCard[]>
  deck: DhCard[]
  map_cards: MapCard[]
  connections: Connection[]
  annotations: Annotation[]
  pack_library: RoomPackLibraryItem[]
  settings: RoomSettings
  selected_pack_ids: string[]
  drawn_this_turn: Record<string, boolean>
  snapshot_version: number
  updated_at: string
}

export interface DhPack {
  format: 'dhpack'
  version: 1
  pack_name: string
  cards: Array<{
    id?: string
    type: CardType
    title: string
    content: string
    style: string
  }>
}

export interface DhRoomBackup {
  format: 'dhroom'
  version: 1
  room: {
    id: string
    name: string
    invite_code: string
    created_at: string
    expires_at: string
  }
  session: {
    mode: RoomMode
    current_host: string
    current_turn_player: string | null
    turn_order: string[]
    deck: DhCard[]
    hands: Array<{ owner: string; cards: DhCard[] }>
  }
  map: {
    cards: MapCard[]
    connections: Connection[]
    annotations: Annotation[]
  }
  library: {
    packs: RoomPackLibraryItem[]
    selected_pack_ids: string[]
  }
  settings: RoomSettings
  players: Array<Pick<Player, 'id' | 'nickname' | 'color' | 'is_host' | 'is_online'>>
  exported_at: string
}

export interface RoomSession {
  room_id: string
  invite_code: string
  player_id: string
  nickname: string
  token: string
  websocket_url: string
}
