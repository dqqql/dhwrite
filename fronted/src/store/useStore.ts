import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  RoomState, DhCard, MapCard, Connection, Annotation,
  Toast, DrawOption
} from '@/types'
import { createMockRoomState, DECK_CARDS, shuffle, makeCard } from '@/data/mockData'
import { getCardGridSize, snapToGrid } from '@/utils/grid'

interface UIState {
  // Panels
  isPlayerPanelOpen: boolean
  isHandPanelOpen: boolean
  isExportMenuOpen: boolean
  isImportModalOpen: boolean
  isCreateCardModalOpen: boolean
  isRoomSettingsOpen: boolean
  isDrawModalOpen: boolean
  isEndCoCreationConfirmOpen: boolean

  // Context menu
  contextMenu: { x: number; y: number; cardId: string } | null

  // Active card (expanded)
  expandedCardId: string | null

  // Draw options
  drawOptions: DrawOption[]

  // Toasts
  toasts: Toast[]

  // Current player id (mock: 'p1')
  currentPlayerId: string
}

interface AppStore extends UIState {
  room: RoomState | null

  // Init
  initRoom: () => void

  // Mode
  startCoCreation: () => void
  endCoCreation: () => void

  // Turn
  endTurn: () => void
  forceSkipTurn: (playerId: string) => void

  // Cards – hand
  drawCards: () => void
  confirmDraw: (cardId: string) => void
  createCustomCard: (card: Omit<DhCard, 'id'>) => void
  playCard: (cardId: string, x?: number, y?: number) => void

  // Cards – map
  moveCard: (cardId: string, x: number, y: number) => void
  resizeCard: (cardId: string, gridScale: number) => void
  toggleExpandCard: (cardId: string) => void
  editCard: (cardId: string, updates: Partial<DhCard>) => void
  deleteCard: (cardId: string) => void
  recycleCard: (cardId: string) => void
  lockCard: (cardId: string) => void
  unlockCard: (cardId: string) => void

  // Connections
  addConnection: (conn: Omit<Connection, 'id'>) => void
  removeConnection: (connId: string) => void

  // Annotations
  addAnnotation: (ann: Omit<Annotation, 'id'>) => void
  removeAnnotation: (annId: string) => void

  // UI
  setContextMenu: (menu: { x: number; y: number; cardId: string } | null) => void
  setExpandedCard: (id: string | null) => void
  togglePlayerPanel: () => void
  toggleHandPanel: () => void
  toggleExportMenu: () => void
  openImportModal: () => void
  closeImportModal: () => void
  openCreateCardModal: () => void
  closeCreateCardModal: () => void
  openRoomSettings: () => void
  closeRoomSettings: () => void
  openDrawModal: () => void
  closeDrawModal: () => void
  openEndConfirm: () => void
  closeEndConfirm: () => void

  // Toast
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // ── Initial UI state ─────────────────────────────────────────────
  isPlayerPanelOpen: true,
  isHandPanelOpen: true,
  isExportMenuOpen: false,
  isImportModalOpen: false,
  isCreateCardModalOpen: false,
  isRoomSettingsOpen: false,
  isDrawModalOpen: false,
  isEndCoCreationConfirmOpen: false,
  contextMenu: null,
  expandedCardId: null,
  drawOptions: [],
  toasts: [],
  currentPlayerId: 'p1',
  room: null,

  initRoom: () => {
    set({ room: createMockRoomState('p1') })
    get().addToast('已连接到房间（演示模式）', 'info')
  },

  // ── Mode ──────────────────────────────────────────────────────────
  startCoCreation: () => {
    const { room } = get()
    if (!room) return
    set(s => ({
      room: { ...s.room!, mode: 'co-creation', current_turn_player_id: room.turn_order[0] }
    }))
    get().addToast('已开始共创模式！每位玩家已发放初始手牌。', 'success')
  },

  endCoCreation: () => {
    // Custom cards in hands are deleted; official/imported cards return to deck
    set(s => {
      if (!s.room) return {}
      const newHands: Record<string, DhCard[]> = {}
      for (const pid of Object.keys(s.room.hands)) {
        newHands[pid] = [] // all hands cleared
      }
      return {
        room: { ...s.room, mode: 'free', current_turn_player_id: null, hands: newHands },
        isEndCoCreationConfirmOpen: false,
      }
    })
    get().addToast('共创已结束，进入自由模式。', 'info')
  },

  // ── Turn ──────────────────────────────────────────────────────────
  endTurn: () => {
    const { room } = get()
    if (!room || !room.current_turn_player_id) return
    const order = room.turn_order.filter(id =>
      room.players.find(p => p.id === id)?.is_online
    )
    const idx = order.indexOf(room.current_turn_player_id)
    const next = order[(idx + 1) % order.length]
    set(s => ({ room: { ...s.room!, current_turn_player_id: next } }))
    const nextPlayer = room.players.find(p => p.id === next)
    get().addToast(`轮到 ${nextPlayer?.nickname || next} 的回合`, 'info')
  },

  forceSkipTurn: (playerId: string) => {
    const { room } = get()
    if (!room) return
    const order = room.turn_order.filter(id =>
      room.players.find(p => p.id === id)?.is_online && id !== playerId
    )
    const next = order[0] ?? null
    set(s => ({ room: { ...s.room!, current_turn_player_id: next } }))
    get().addToast('已强制跳过该玩家。', 'warning')
  },

  // ── Cards – hand ──────────────────────────────────────────────────
  drawCards: () => {
    const { room } = get()
    if (!room) return
    // Get cards not already in hands or on map
    const usedIds = new Set([
      ...Object.values(room.hands).flat().map(c => c.title),
      ...room.map_cards.map(c => c.title),
    ])
    const available = DECK_CARDS.filter(c => !usedIds.has(c.title))
    if (available.length < 3) {
      get().addToast('牌组已空，无法抽牌。', 'error')
      return
    }
    const shuffled = shuffle(available)
    const options: DrawOption[] = shuffled.slice(0, 3).map(makeCard)
    set({ drawOptions: options, isDrawModalOpen: true })
  },

  confirmDraw: (cardId: string) => {
    const { room, drawOptions, currentPlayerId } = get()
    if (!room) return
    const card = drawOptions.find(c => c.id === cardId)
    if (!card) return
    set(s => ({
      room: {
        ...s.room!,
        hands: {
          ...s.room!.hands,
          [currentPlayerId]: [...(s.room!.hands[currentPlayerId] ?? []), card],
        },
      },
      isDrawModalOpen: false,
      drawOptions: [],
    }))
    get().addToast(`已获得卡牌：${card.title}`, 'success')
  },

  createCustomCard: (cardData) => {
    const { currentPlayerId } = get()
    const card: DhCard = { ...cardData, id: nanoid(), is_custom: true }
    set(s => ({
      room: s.room ? {
        ...s.room,
        hands: {
          ...s.room.hands,
          [currentPlayerId]: [...(s.room.hands[currentPlayerId] ?? []), card],
        },
      } : null,
      isCreateCardModalOpen: false,
    }))
    get().addToast(`已创建自定义卡牌：${card.title}`, 'success')
  },

  playCard: (cardId, x = 200, y = 200) => {
    const { room, currentPlayerId } = get()
    if (!room) return
    const hand = room.hands[currentPlayerId] ?? []
    const card = hand.find(c => c.id === cardId)
    if (!card) return
    const player = room.players.find(p => p.id === currentPlayerId)
    const size = getCardGridSize(card.type)
    const mapCard: MapCard = {
      ...card,
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: size.width,
      height: size.height,
      grid_cols: size.cols,
      grid_rows: size.rows,
      grid_scale: size.scale,
      placed_by: player?.nickname ?? 'Unknown',
      player_color: player?.color ?? '#888',
      is_expanded: false,
    }
    set(s => ({
      room: s.room ? {
        ...s.room,
        hands: {
          ...s.room.hands,
          [currentPlayerId]: s.room.hands[currentPlayerId].filter(c => c.id !== cardId),
        },
        map_cards: [...s.room.map_cards, mapCard],
      } : null,
    }))
    get().addToast(`已打出：${card.title}`, 'success')
  },

  // ── Cards – map ───────────────────────────────────────────────────
  moveCard: (cardId, x, y) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c => c.id === cardId ? {
          ...c,
          x: snapToGrid(x),
          y: snapToGrid(y),
        } : c),
      } : null,
    }))
  },

  resizeCard: (cardId, gridScale) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c => {
          if (c.id !== cardId) return c
          const size = getCardGridSize(c.type, gridScale)
          return {
            ...c,
            width: size.width,
            height: size.height,
            grid_cols: size.cols,
            grid_rows: size.rows,
            grid_scale: size.scale,
          }
        }),
      } : null,
    }))
  },

  toggleExpandCard: (cardId) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c =>
          c.id === cardId ? { ...c, is_expanded: !c.is_expanded } : c
        ),
      } : null,
      expandedCardId: s.expandedCardId === cardId ? null : cardId,
    }))
  },

  editCard: (cardId, updates) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
      } : null,
    }))
  },

  deleteCard: (cardId) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.filter(c => c.id !== cardId),
        connections: s.room.connections.filter(c => c.from_card_id !== cardId && c.to_card_id !== cardId),
      } : null,
      contextMenu: null,
    }))
    get().addToast('卡牌已删除。', 'info')
  },

  recycleCard: (cardId) => {
    const { room } = get()
    if (!room) return
    const card = room.map_cards.find(c => c.id === cardId)
    if (!card) return
    // Find original player by placed_by nickname
    const ownerPlayer = room.players.find(p => p.nickname === card.placed_by)
    const targetId = ownerPlayer?.id ?? Object.keys(room.hands)[0]
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.filter(c => c.id !== cardId),
        connections: s.room.connections.filter(c => c.from_card_id !== cardId && c.to_card_id !== cardId),
        hands: {
          ...s.room.hands,
          [targetId]: [...(s.room.hands[targetId] ?? []), card],
        },
      } : null,
      contextMenu: null,
    }))
    get().addToast(`卡牌已回收至 ${card.placed_by} 的手牌。`, 'info')
  },

  lockCard: (cardId) => {
    const { currentPlayerId, room } = get()
    const player = room?.players.find(p => p.id === currentPlayerId)
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c =>
          c.id === cardId ? { ...c, locked_by: player?.nickname } : c
        ),
      } : null,
    }))
  },

  unlockCard: (cardId) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        map_cards: s.room.map_cards.map(c =>
          c.id === cardId ? { ...c, locked_by: undefined } : c
        ),
      } : null,
    }))
  },

  // ── Connections ───────────────────────────────────────────────────
  addConnection: (conn) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        connections: [...s.room.connections, { ...conn, id: nanoid() }],
      } : null,
    }))
  },

  removeConnection: (connId) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        connections: s.room.connections.filter(c => c.id !== connId),
      } : null,
    }))
  },

  // ── Annotations ───────────────────────────────────────────────────
  addAnnotation: (ann) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        annotations: [...s.room.annotations, { ...ann, id: nanoid() }],
      } : null,
    }))
  },

  removeAnnotation: (annId) => {
    set(s => ({
      room: s.room ? {
        ...s.room,
        annotations: s.room.annotations.filter(a => a.id !== annId),
      } : null,
    }))
  },

  // ── UI ────────────────────────────────────────────────────────────
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setExpandedCard: (id) => set({ expandedCardId: id }),
  togglePlayerPanel: () => set(s => ({ isPlayerPanelOpen: !s.isPlayerPanelOpen })),
  toggleHandPanel: () => set(s => ({ isHandPanelOpen: !s.isHandPanelOpen })),
  toggleExportMenu: () => set(s => ({ isExportMenuOpen: !s.isExportMenuOpen })),
  openImportModal: () => set({ isImportModalOpen: true }),
  closeImportModal: () => set({ isImportModalOpen: false }),
  openCreateCardModal: () => set({ isCreateCardModalOpen: true }),
  closeCreateCardModal: () => set({ isCreateCardModalOpen: false }),
  openRoomSettings: () => set({ isRoomSettingsOpen: true }),
  closeRoomSettings: () => set({ isRoomSettingsOpen: false }),
  openDrawModal: () => set({ isDrawModalOpen: true }),
  closeDrawModal: () => set({ isDrawModalOpen: false }),
  openEndConfirm: () => set({ isEndCoCreationConfirmOpen: true }),
  closeEndConfirm: () => set({ isEndCoCreationConfirmOpen: false }),

  // ── Toast ─────────────────────────────────────────────────────────
  addToast: (message, type = 'info') => {
    const id = nanoid()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3500)
  },

  removeToast: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
