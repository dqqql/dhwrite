export type {
  Annotation,
  CardType,
  ClientMessage,
  Connection,
  ConnectionColor,
  CreateRoomRequest,
  DhCard,
  DhPack,
  JoinRoomRequest,
  MapCard,
  Player,
  Rect,
  RoomJoinResponse,
  RoomMode,
  RoomSession,
  RoomState,
  ServerMessage,
} from '@dhgc/shared'

import type { DhCard } from '@dhgc/shared'

export type DrawOption = DhCard

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
}
