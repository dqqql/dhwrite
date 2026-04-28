import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { assertDhPack, type ClientMessage, type DhCard, type RoomSession, type RoomState } from '@dhgc/shared'
import type { Annotation, Connection, DrawOption, Toast } from '@/types'
import { createRoomRequest, joinRoomRequest, RoomSocketConnection, type ConnectionState } from '@/lib/realtime'
import { getCardGridSize, snapToGrid } from '@/utils/grid'

type ConnectionStatus = ConnectionState

interface UIState {
  isPlayerPanelOpen: boolean
  isHandPanelOpen: boolean
  isExportMenuOpen: boolean
  isImportModalOpen: boolean
  isCreateCardModalOpen: boolean
  isRoomSettingsOpen: boolean
  isDrawModalOpen: boolean
  isEndCoCreationConfirmOpen: boolean
  isEnteringRoom: boolean
  connectionStatus: ConnectionStatus
  contextMenu: { x: number; y: number; cardId: string } | null
  expandedCardId: string | null
  drawOptions: DrawOption[]
  toasts: Toast[]
  currentPlayerId: string
  session: RoomSession | null
}

interface AppStore extends UIState {
  room: RoomState | null

  createRoom: (input: { nickname: string; roomName: string; selectedPackIds?: string[] }) => Promise<boolean>
  joinRoom: (input: { inviteCode: string; nickname: string }) => Promise<boolean>

  manualReconnect: () => void
  leaveRoom: () => void

  startCoCreation: () => void
  endCoCreation: () => void

  endTurn: () => void
  forceSkipTurn: (playerId: string) => void

  drawCards: () => void
  confirmDraw: (cardId: string) => void
  createCustomCard: (card: Omit<DhCard, 'id'>) => void
  playCard: (cardId: string, x?: number, y?: number) => void

  moveCard: (cardId: string, x: number, y: number) => void
  commitMoveCard: (cardId: string, x: number, y: number) => void
  resizeCard: (cardId: string, gridScale: number) => void
  commitResizeCard: (cardId: string, gridScale: number) => void
  toggleExpandCard: (cardId: string) => void
  editCard: (cardId: string, updates: Partial<DhCard>) => void
  deleteCard: (cardId: string) => void
  recycleCard: (cardId: string) => void
  lockCard: (cardId: string) => void
  unlockCard: (cardId: string) => void

  addConnection: (conn: Omit<Connection, 'id'>) => void
  removeConnection: (connId: string) => void

  addAnnotation: (ann: Omit<Annotation, 'id'>) => void
  removeAnnotation: (annId: string) => void
  importPack: (value: unknown) => void

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

  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

let activeConnection: RoomSocketConnection | null = null

function preserveTransientRoomState(previous: RoomState | null, incoming: RoomState): RoomState {
  if (!previous) return incoming

  const expandedById = new Map(previous.map_cards.map((card) => [card.id, card.is_expanded]))

  return {
    ...incoming,
    map_cards: incoming.map_cards.map((card) => ({
      ...card,
      is_expanded: expandedById.get(card.id) ?? card.is_expanded,
    })),
  }
}

export const useStore = create<AppStore>((set, get) => {
  const applyRoomState = (room: RoomState) => {
    set((state) => ({ room: preserveTransientRoomState(state.room, room) }))
  }

  const disconnectConnection = () => {
    if (activeConnection) {
      activeConnection.disconnect()
      activeConnection = null
    }
  }

  const sendMessage = (message: ClientMessage) => {
    const conn = activeConnection
    if (!conn || !conn.isConnected) {
      const status = get().connectionStatus
      if (status === 'error' || status === 'idle') {
        get().addToast('实时连接已断开，请手动重新连接。', 'error')
      }
      return false
    }

    conn.send({
      ...message,
      requestId: message.requestId ?? nanoid(),
    })
    return true
  }

  const connectSession = async (session: RoomSession) => {
    disconnectConnection()

    set({
      session,
      currentPlayerId: session.player_id,
      connectionStatus: 'connecting',
    })

    return new Promise<void>((resolve, reject) => {
      let settled = false
      let receivedSnapshot = false

      const finishResolve = () => {
        if (settled) return
        settled = true
        resolve()
      }

      const finishReject = (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      }

      const connection = new RoomSocketConnection(session.websocket_url, {
        onClose: () => {
          if (activeConnection !== connection) return
          // If snapshot was received, the disconnect is handled by reconnect logic
          // Connection class updates status via onStatusChange
          if (!receivedSnapshot) {
            finishReject(new Error('WebSocket closed before room snapshot arrived'))
          }
        },
        onError: (error) => {
          if (activeConnection !== connection) return
          if (!receivedSnapshot) {
            finishReject(error)
          }
        },
        onStatusChange: (status) => {
          if (activeConnection !== connection) return
          set({ connectionStatus: status })
        },
        onMessage: (message) => {
          if (activeConnection !== connection) return

          switch (message.type) {
            case 'room.snapshot':
              receivedSnapshot = true
              applyRoomState(message.payload.state)
              set({
                currentPlayerId: message.payload.you.player_id,
                connectionStatus: 'connected',
              })
              finishResolve()
              return

            case 'room.updated':
              applyRoomState(message.payload.state)
              set({ connectionStatus: 'connected' })
              return

            case 'draw.options':
              set({
                drawOptions: message.payload.cards,
                isDrawModalOpen: true,
              })
              return

            case 'error':
              get().addToast(message.payload.message, 'error')
              return

            case 'ack':
            case 'pong':
              return
          }
        },
      })

      activeConnection = connection
      connection.connect()
    })
  }

  return {
    isPlayerPanelOpen: true,
    isHandPanelOpen: true,
    isExportMenuOpen: false,
    isImportModalOpen: false,
    isCreateCardModalOpen: false,
    isRoomSettingsOpen: false,
    isDrawModalOpen: false,
    isEndCoCreationConfirmOpen: false,
    isEnteringRoom: false,
    connectionStatus: 'idle',
    contextMenu: null,
    expandedCardId: null,
    drawOptions: [],
    toasts: [],
    currentPlayerId: '',
    session: null,
    room: null,

    createRoom: async ({ nickname, roomName, selectedPackIds }) => {
      const cleanedNickname = nickname.trim()
      if (!cleanedNickname) {
        get().addToast('请输入昵称', 'error')
        return false
      }

      set({
        isEnteringRoom: true,
        connectionStatus: 'connecting',
      })

      try {
        const response = await createRoomRequest({
          nickname: cleanedNickname,
          room_name: roomName.trim(),
          selected_pack_ids: selectedPackIds,
        })
        await connectSession(response.session)
        get().addToast(`房间已创建，邀请码 ${response.session.invite_code}`, 'success')
        return true
      } catch (error) {
        disconnectConnection()
        set({
          room: null,
          session: null,
          connectionStatus: 'error',
        })
        get().addToast(error instanceof Error ? error.message : '创建房间失败', 'error')
        return false
      } finally {
        set({ isEnteringRoom: false })
      }
    },

    joinRoom: async ({ inviteCode, nickname }) => {
      const cleanedNickname = nickname.trim()
      const cleanedInviteCode = inviteCode.trim().toUpperCase()
      if (!cleanedNickname) {
        get().addToast('请输入昵称', 'error')
        return false
      }
      if (!cleanedInviteCode) {
        get().addToast('请输入邀请码', 'error')
        return false
      }

      set({
        isEnteringRoom: true,
        connectionStatus: 'connecting',
      })

      try {
        const response = await joinRoomRequest({
          invite_code: cleanedInviteCode,
          nickname: cleanedNickname,
        })
        await connectSession(response.session)
        get().addToast(`已加入房间 ${response.state.room_name}`, 'success')
        return true
      } catch (error) {
        disconnectConnection()
        set({
          room: null,
          session: null,
          connectionStatus: 'error',
        })
        get().addToast(error instanceof Error ? error.message : '加入房间失败', 'error')
        return false
      } finally {
        set({ isEnteringRoom: false })
      }
    },

    manualReconnect: () => {
      const conn = activeConnection
      if (!conn) {
        get().addToast('当前没有可重连的房间会话。', 'error')
        return
      }
      set({ connectionStatus: 'connecting' })
      conn.manualReconnect()
    },

    leaveRoom: () => {
      if (activeConnection) {
        activeConnection.dispose()
        activeConnection = null
      }
      set({
        room: null,
        session: null,
        connectionStatus: 'idle',
        isDrawModalOpen: false,
        isEndCoCreationConfirmOpen: false,
        drawOptions: [],
      })
    },

    startCoCreation: () => {
      sendMessage({ type: 'room.startCoCreation' })
    },

    endCoCreation: () => {
      set({ isEndCoCreationConfirmOpen: false })
      sendMessage({ type: 'room.endCoCreation' })
    },

    endTurn: () => {
      sendMessage({ type: 'turn.end' })
    },

    forceSkipTurn: (playerId) => {
      sendMessage({ type: 'turn.forceSkip', payload: { playerId } })
    },

    drawCards: () => {
      sendMessage({ type: 'card.draw' })
    },

    confirmDraw: (cardId) => {
      set({ isDrawModalOpen: false })
      sendMessage({ type: 'card.draw.confirm', payload: { cardId } })
    },

    createCustomCard: (cardData) => {
      const { type, title, content, style } = cardData
      const sent = sendMessage({
        type: 'card.create',
        payload: {
          card: { type, title, content, style },
        },
      })

      if (sent) {
        set({ isCreateCardModalOpen: false })
        get().addToast(`已创建自定义卡牌：${title}`, 'success')
      }
    },

    playCard: (cardId, x = 200, y = 200) => {
      sendMessage({
        type: 'card.play',
        payload: { cardId, x: snapToGrid(x), y: snapToGrid(y) },
      })
    },

    moveCard: (cardId, x, y) => {
      set((state) => ({
        room: state.room ? {
          ...state.room,
          map_cards: state.room.map_cards.map((card) => card.id === cardId ? {
            ...card,
            x: snapToGrid(x),
            y: snapToGrid(y),
          } : card),
        } : null,
      }))
    },

    commitMoveCard: (cardId, x, y) => {
      sendMessage({
        type: 'card.move.commit',
        payload: { cardId, x: snapToGrid(x), y: snapToGrid(y) },
      })
    },

    resizeCard: (cardId, gridScale) => {
      set((state) => ({
        room: state.room ? {
          ...state.room,
          map_cards: state.room.map_cards.map((card) => {
            if (card.id !== cardId) return card
            const nextSize = getCardGridSize(card.type, gridScale)
            return {
              ...card,
              width: nextSize.width,
              height: nextSize.height,
              grid_cols: nextSize.grid_cols,
              grid_rows: nextSize.grid_rows,
              grid_scale: nextSize.grid_scale,
            }
          }),
        } : null,
      }))
    },

    commitResizeCard: (cardId, gridScale) => {
      sendMessage({
        type: 'card.resize.commit',
        payload: { cardId, gridScale },
      })
    },

    toggleExpandCard: (cardId) => {
      set((state) => ({
        room: state.room ? {
          ...state.room,
          map_cards: state.room.map_cards.map((card) => (
            card.id === cardId ? { ...card, is_expanded: !card.is_expanded } : card
          )),
        } : null,
        expandedCardId: state.expandedCardId === cardId ? null : cardId,
      }))
    },

    editCard: (cardId, updates) => {
      sendMessage({
        type: 'card.edit',
        payload: { cardId, updates },
      })
    },

    deleteCard: (cardId) => {
      const sent = sendMessage({
        type: 'card.delete',
        payload: { cardId },
      })
      if (sent) {
        set({ contextMenu: null })
      }
    },

    recycleCard: (cardId) => {
      const sent = sendMessage({
        type: 'card.recycle',
        payload: { cardId },
      })
      if (sent) {
        set({ contextMenu: null })
      }
    },

    lockCard: (cardId) => {
      const { room, currentPlayerId } = get()
      const player = room?.players.find((item) => item.id === currentPlayerId)

      set((state) => ({
        room: state.room ? {
          ...state.room,
          map_cards: state.room.map_cards.map((card) => card.id === cardId ? {
            ...card,
            locked_by: player?.nickname,
            locked_by_player_id: currentPlayerId,
          } : card),
        } : null,
      }))

      sendMessage({
        type: 'card.lock',
        payload: { cardId },
      })
    },

    unlockCard: (cardId) => {
      set((state) => ({
        room: state.room ? {
          ...state.room,
          map_cards: state.room.map_cards.map((card) => card.id === cardId ? {
            ...card,
            locked_by: undefined,
            locked_by_player_id: undefined,
            locked_until: undefined,
          } : card),
        } : null,
      }))

      sendMessage({
        type: 'card.unlock',
        payload: { cardId },
      })
    },

    addConnection: (conn) => {
      sendMessage({
        type: 'connection.add',
        payload: conn,
      })
    },

    removeConnection: (connId) => {
      sendMessage({
        type: 'connection.remove',
        payload: { connectionId: connId },
      })
    },

    addAnnotation: (ann) => {
      sendMessage({
        type: 'annotation.add',
        payload: ann,
      })
    },

    removeAnnotation: (annId) => {
      sendMessage({
        type: 'annotation.remove',
        payload: { annotationId: annId },
      })
    },

    importPack: (value) => {
      try {
        const pack = assertDhPack(value)
        const sent = sendMessage({
          type: 'room.importPack',
          payload: { pack },
        })
        if (sent) {
          set({ isImportModalOpen: false })
          get().addToast(`已导入卡包：${pack.pack_name}`, 'success')
        }
      } catch (error) {
        get().addToast(error instanceof Error ? error.message : '卡包格式不正确', 'error')
      }
    },

    setContextMenu: (menu) => set({ contextMenu: menu }),
    setExpandedCard: (id) => set({ expandedCardId: id }),
    togglePlayerPanel: () => set((state) => ({ isPlayerPanelOpen: !state.isPlayerPanelOpen })),
    toggleHandPanel: () => set((state) => ({ isHandPanelOpen: !state.isHandPanelOpen })),
    toggleExportMenu: () => set((state) => ({ isExportMenuOpen: !state.isExportMenuOpen })),
    openImportModal: () => set({ isImportModalOpen: true }),
    closeImportModal: () => set({ isImportModalOpen: false }),
    openCreateCardModal: () => set({ isCreateCardModalOpen: true }),
    closeCreateCardModal: () => set({ isCreateCardModalOpen: false }),
    openRoomSettings: () => set({ isRoomSettingsOpen: true }),
    closeRoomSettings: () => set({ isRoomSettingsOpen: false }),
    openDrawModal: () => set((state) => ({ isDrawModalOpen: state.drawOptions.length > 0 })),
    closeDrawModal: () => set({ isDrawModalOpen: false }),
    openEndConfirm: () => set({ isEndCoCreationConfirmOpen: true }),
    closeEndConfirm: () => set({ isEndCoCreationConfirmOpen: false }),

    addToast: (message, type = 'info') => {
      const id = nanoid()
      set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
      window.setTimeout(() => get().removeToast(id), 3500)
    },

    removeToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    },
  }
})
