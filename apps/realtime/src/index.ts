import {
  assertDhPack,
  assertDhRoomBackup,
  createBuiltInPackLibrary,
  createDeckFromBuiltInPackIds,
  getCardGridSize,
  isBuiltInPackId,
  normalizeCardType,
  normalizeCardDimensions,
  normalizeBuiltInPackSelection,
  normalizeTerritoryRect,
  safeJsonParse,
  snapToGrid,
  type CardType,
  type ClientMessage,
  type DeckCardType,
  type DhCard,
  type DhPack,
  type DhRoomBackup,
  type MapCard,
  type Player,
  type RoleCardDetails,
  type RoomPackLibraryItem,
  type RoomState,
} from '../../../packages/shared/src/index'

export interface Env {
  ROOMS: DurableObjectNamespace
  DHGC_DB?: D1Database
  SESSION_SECRET: string
  PUBLIC_API_BASE?: string
}

type MapCardUpdateInput = Omit<Partial<MapCard>, 'territory'> & {
  territory?: MapCard['territory'] | null
}

interface SessionPayload {
  room_id: string
  invite_code: string
  player_id: string
  nickname: string
  exp: number
}

interface SocketSession {
  playerId: string
  nickname: string
}

const PLAYER_COLORS = ['#f43f5e', '#2563eb', '#f59e0b', '#10b981', '#a855f7', '#06b6d4']
const ROOM_TTL_MS = 3 * 24 * 60 * 60 * 1000
const DRAW_TYPES: DeckCardType[] = ['Location', 'Feature', 'Hook']
const STARTING_CARDS_PER_TYPE = 2

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return emptyCors()

    const url = new URL(request.url)
    try {
      if (url.pathname === '/api/health') {
        return json({ ok: true, service: 'dhgc-realtime', time: new Date().toISOString() })
      }

      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        return createRoom(request, env)
      }

      if (url.pathname === '/api/rooms/join' && request.method === 'POST') {
        return joinRoom(request, env)
      }

      const exportMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/export\/dhroom$/i)
      if (exportMatch && request.method === 'GET') {
        const inviteCode = normaliseInvite(exportMatch[1])
        const stub = roomStub(env, inviteCode)
        const response = await stub.fetch(internalRequest('/internal/export/dhroom'))
        return withCors(response)
      }

      const wsMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/ws$/i)
      if (wsMatch && request.headers.get('Upgrade') === 'websocket') {
        const inviteCode = normaliseInvite(wsMatch[1])
        const stub = roomStub(env, inviteCode)
        return stub.fetch(request)
      }

      return json({ error: 'not_found' }, { status: 404 })
    } catch (error) {
      return json({ error: 'internal_error', message: messageFrom(error) }, { status: 500 })
    }
  },
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { room_name?: string; nickname?: string; selected_pack_ids?: string[] }
  const roomName = cleanText(body.room_name, 'Untitled Room', 60)
  const nickname = cleanText(body.nickname, '', 24)
  if (!nickname) return json({ error: 'nickname_required' }, { status: 400 })

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = generateInviteCode()
    const playerId = id('player')
    const stub = roomStub(env, inviteCode)
    const createResponse = await stub.fetch(internalRequest('/internal/create', {
      method: 'POST',
      body: JSON.stringify({ roomName, inviteCode, playerId, nickname, selectedPackIds: body.selected_pack_ids ?? [] }),
    }))

    if (createResponse.status === 409) continue
    if (!createResponse.ok) return withCors(createResponse)

    const payload = await createResponse.json() as { state: RoomState; player: Player }
    return roomSessionResponse(request, env, payload.state, payload.player)
  }

  return json({ error: 'invite_collision' }, { status: 500 })
}

async function joinRoom(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { invite_code?: string; nickname?: string }
  const inviteCode = normaliseInvite(body.invite_code ?? '')
  const nickname = cleanText(body.nickname, '', 24)
  if (!inviteCode) return json({ error: 'invite_code_required' }, { status: 400 })
  if (!nickname) return json({ error: 'nickname_required' }, { status: 400 })

  const stub = roomStub(env, inviteCode)
  const joinResponse = await stub.fetch(internalRequest('/internal/join', {
    method: 'POST',
    body: JSON.stringify({ nickname, playerId: id('player') }),
  }))
  if (!joinResponse.ok) return withCors(joinResponse)

  const payload = await joinResponse.json() as { state: RoomState; player: Player }
  return roomSessionResponse(request, env, payload.state, payload.player)
}

async function roomSessionResponse(request: Request, env: Env, state: RoomState, player: Player): Promise<Response> {
  const token = await signSession(getSessionSecret(env), {
    room_id: state.room_id,
    invite_code: state.invite_code,
    player_id: player.id,
    nickname: player.nickname,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
  })

  return json({
    session: {
      room_id: state.room_id,
      invite_code: state.invite_code,
      player_id: player.id,
      nickname: player.nickname,
      token,
      websocket_url: buildWebSocketUrl(request, env, state.invite_code, token),
    },
    state,
  })
}

export class RoomDurableObject {
  private room: RoomState | null = null
  private sockets = new Map<WebSocket, SocketSession>()
  private pendingDraws = new Map<string, DhCard[]>()

  constructor(private readonly ctx: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/internal/create' && request.method === 'POST') return this.create(request)
    if (url.pathname === '/internal/join' && request.method === 'POST') return this.join(request)
    if (url.pathname === '/internal/export/dhroom' && request.method === 'GET') return this.exportDhRoom()

    if (request.headers.get('Upgrade') === 'websocket') return this.connectWebSocket(request)

    return json({ error: 'not_found' }, { status: 404 })
  }

  private async create(request: Request): Promise<Response> {
    await this.load()
    if (this.room) return json({ error: 'room_exists' }, { status: 409 })

    const body = await request.json() as {
      roomName: string
      inviteCode: string
      playerId: string
      nickname: string
      selectedPackIds: string[]
    }

    const now = new Date()
    const host = makePlayer(body.playerId, body.nickname, PLAYER_COLORS[0], true, now)
    const selectedPackIds = normalizeBuiltInPackSelection(body.selectedPackIds, true)
    const deck = shuffle(createDeckFromBuiltInPackIds(selectedPackIds))

    this.room = {
      room_id: body.inviteCode,
      room_name: body.roomName,
      invite_code: body.inviteCode,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ROOM_TTL_MS).toISOString(),
      mode: 'free',
      host_player_id: host.id,
      current_turn_player_id: null,
      turn_order: [host.id],
      players: [host],
      hands: { [host.id]: [] },
      deck,
      map_cards: [],
      connections: [],
      annotations: [],
      pack_library: createBuiltInPackLibrary(),
      settings: {
        imports_enabled: true,
      },
      selected_pack_ids: selectedPackIds,
      drawn_this_turn: {},
      snapshot_version: 0,
      updated_at: now.toISOString(),
    }

    await this.save()
    return json({ state: this.publicState(), player: host })
  }

  private async join(request: Request): Promise<Response> {
    const room = await this.mustLoad()
    if (Date.parse(room.expires_at) <= Date.now()) {
      return json({ error: 'room_expired' }, { status: 410 })
    }

    const body = await request.json() as { nickname: string; playerId: string }
    const now = new Date()
    const color = PLAYER_COLORS[room.players.length % PLAYER_COLORS.length]
    const player = makePlayer(body.playerId, cleanText(body.nickname, 'Player', 24), color, false, now)

    room.players.push(player)
    room.turn_order.push(player.id)
    room.hands[player.id] = []
    await this.commit('player.joined')

    return json({ state: this.publicState(), player })
  }

  private async connectWebSocket(request: Request): Promise<Response> {
    const room = await this.mustLoad()
    const url = new URL(request.url)
    const token = url.searchParams.get('token') ?? ''
    const session = await verifySession(getSessionSecret(this.env), token)
    if (!session || session.invite_code !== room.invite_code) {
      return new Response('Invalid session token', { status: 401 })
    }

    const player = room.players.find(item => item.id === session.player_id)
    if (!player) return new Response('Unknown player', { status: 403 })

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    server.accept()

    this.sockets.set(server, { playerId: player.id, nickname: player.nickname })
    player.is_online = true
    player.last_seen_at = new Date().toISOString()
    room.updated_at = new Date().toISOString()
    room.snapshot_version += 1
    await this.save()

    server.send(JSON.stringify({
      type: 'room.snapshot',
      payload: { state: this.publicState(), you: { player_id: player.id } },
    }))
    this.broadcast({ type: 'room.updated', payload: { state: this.publicState(), reason: 'player.online' } })

    server.addEventListener('message', event => {
      void this.handleMessage(server, event.data).catch(error => {
        this.sendError(server, undefined, 'handler_error', messageFrom(error))
      })
    })

    server.addEventListener('close', () => {
      void this.disconnect(server)
    })

    server.addEventListener('error', () => {
      void this.disconnect(server)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  private async handleMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const session = this.sockets.get(socket)
    if (!session) return
    const message = typeof data === 'string' ? safeJsonParse(data) as ClientMessage : null
    if (!message || typeof message.type !== 'string') {
      this.sendError(socket, undefined, 'invalid_message', 'Message must be JSON with a type')
      return
    }

    try {
      await this.applyMessage(session, message, socket)
      if (message.requestId) this.send(socket, { type: 'ack', requestId: message.requestId, payload: { ok: true } })
    } catch (error) {
      this.sendError(socket, message.requestId, 'rejected', messageFrom(error))
    }
  }

  private async applyMessage(session: SocketSession, message: ClientMessage, socket: WebSocket): Promise<void> {
    const room = await this.mustLoad()
    const player = this.requirePlayer(session.playerId)

    switch (message.type) {
      case 'ping':
        this.send(socket, { type: 'pong', requestId: message.requestId, payload: { server_time: new Date().toISOString() } })
        return

      case 'room.startCoCreation':
        this.requireHost(player)
        this.startCoCreation()
        await this.commit('room.startCoCreation')
        return

      case 'room.endCoCreation':
        this.requireHost(player)
        this.endCoCreation()
        await this.commit('room.endCoCreation')
        return

      case 'room.updateSelectedPacks':
        this.requireHost(player)
        this.updateSelectedPacks(message.payload.selectedPackIds)
        await this.commit('room.updateSelectedPacks')
        return

      case 'room.updateSettings':
        this.requireHost(player)
        this.updateSettings(message.payload.importsEnabled)
        await this.commit('room.updateSettings')
        return

      case 'turn.end':
        this.requireCoCreation()
        this.advanceTurn()
        await this.commit('turn.end')
        return

      case 'turn.forceSkip':
        this.requireHost(player)
        this.advanceTurn(message.payload.playerId)
        await this.commit('turn.forceSkip')
        return

      case 'card.draw':
        this.requireCurrentTurn(player)
        if (room.drawn_this_turn[player.id]) throw new Error('Already drew this turn')
        this.pendingDraws.set(player.id, this.buildDrawOptions())
        this.send(socket, {
          type: 'draw.options',
          requestId: message.requestId,
          payload: { cards: this.pendingDraws.get(player.id) ?? [] },
        })
        return

      case 'card.draw.confirm': {
        this.requireCurrentTurn(player)
        const options = this.pendingDraws.get(player.id) ?? []
        const selected = options.find(card => card.id === message.payload.cardId)
        if (!selected) throw new Error('Selected card is not in draw options')
        room.deck = room.deck.filter(card => card.id !== selected.id)
        room.hands[player.id] = [...(room.hands[player.id] ?? []), selected]
        room.drawn_this_turn[player.id] = true
        this.pendingDraws.delete(player.id)
        await this.commit('card.draw.confirm')
        return
      }

      case 'card.create': {
        if (message.payload.card.type === 'Role') {
          throw new Error('Role cards are created automatically for each player')
        }
        const card: DhCard = { ...message.payload.card, id: id('card'), is_custom: true }
        room.hands[player.id] = [...(room.hands[player.id] ?? []), card]
        await this.commit('card.create')
        return
      }

      case 'card.play':
        this.requireCurrentTurn(player)
        this.playCard(player, message.payload.cardId, message.payload.x, message.payload.y)
        await this.commit('card.play')
        return

      case 'card.lock':
        this.lockCard(player, message.payload.cardId)
        await this.commit('card.lock')
        return

      case 'card.unlock':
        this.unlockCard(player, message.payload.cardId)
        await this.commit('card.unlock')
        return

      case 'card.move.commit':
        this.requireUnlockedOrOwner(player, message.payload.cardId)
        this.moveMapCard(message.payload.cardId, snapToGrid(message.payload.x), snapToGrid(message.payload.y))
        this.unlockCard(player, message.payload.cardId)
        await this.commit('card.move.commit')
        return

      case 'card.resize.commit': {
        this.requireUnlockedOrOwner(player, message.payload.cardId)
        const card = this.requireMapCard(message.payload.cardId)
        this.resizeMapCard(card.id, message.payload.width, message.payload.height)
        await this.commit('card.resize.commit')
        return
      }

      case 'card.edit': {
        this.requireUnlockedOrOwner(player, message.payload.cardId)
        const card = this.requireMapCard(message.payload.cardId)
        const updates: MapCardUpdateInput = { ...message.payload.updates }

        if (card.type === 'Location' && Object.prototype.hasOwnProperty.call(updates, 'territory')) {
          if (updates.territory) {
            updates.territory = normalizeTerritoryRect(updates.territory, card.width, card.height)
          } else {
            updates.territory = undefined
          }
        }

        this.updateMapCard(message.payload.cardId, updates)
        await this.commit('card.edit')
        return
      }

      case 'card.delete':
        if (room.mode === 'co-creation') throw new Error('Recycle cards during co-creation instead of deleting them')
        room.map_cards = room.map_cards.filter(card => card.id !== message.payload.cardId)
        room.connections = room.connections.filter(conn => (
          conn.from_card_id !== message.payload.cardId && conn.to_card_id !== message.payload.cardId
        ))
        await this.commit('card.delete')
        return

      case 'card.recycle':
        this.recycleCard(player, message.payload.cardId)
        await this.commit('card.recycle')
        return

      case 'connection.add':
        this.addConnection(message.payload)
        await this.commit('connection.add')
        return

      case 'connection.update':
        this.updateConnection(message.payload.connectionId, message.payload.updates)
        await this.commit('connection.update')
        return

      case 'connection.remove':
        room.connections = room.connections.filter(conn => conn.id !== message.payload.connectionId)
        await this.commit('connection.remove')
        return

      case 'annotation.add':
        this.addAnnotation(message.payload)
        await this.commit('annotation.add')
        return

      case 'annotation.update':
        this.updateAnnotation(message.payload.annotationId, message.payload.updates)
        await this.commit('annotation.update')
        return

      case 'annotation.remove':
        room.annotations = room.annotations.filter(ann => ann.id !== message.payload.annotationId)
        await this.commit('annotation.remove')
        return

      case 'room.importPack': {
        this.requireHost(player)
        this.requireImportsEnabled()
        const pack = assertDhPack(message.payload.pack)
        this.importPack(pack)
        await this.commit('room.importPack')
        return
      }

      case 'room.importLibraryPack':
        this.requireHost(player)
        this.requireImportsEnabled()
        this.importLibraryPack(message.payload.packId)
        await this.commit('room.importLibraryPack')
        return

      case 'room.importCards':
        this.requireImportsEnabled()
        this.importCards(message.payload.packId, message.payload.cardIds)
        await this.commit('room.importCards')
        return

      case 'room.importRoomBackup': {
        this.requireHost(player)
        this.requireImportsEnabled()
        const backup = assertDhRoomBackup(message.payload.backup)
        this.importRoomBackup(backup)
        await this.commit('room.importRoomBackup')
        return
      }
    }
  }

  private startCoCreation(): void {
    const room = this.requireRoom()
    const onlinePlayers = room.players.filter(item => item.is_online)

    room.mode = 'co-creation'
    room.drawn_this_turn = {}
    room.current_turn_player_id = this.nextOnlinePlayer(room.turn_order[0] ?? null)
    this.pendingDraws.clear()

    for (const playerId of Object.keys(room.hands)) {
      room.hands[playerId] = []
    }

    for (const player of onlinePlayers) {
      const openingHand = this.drawCardsForTypes(DRAW_TYPES.map((type) => ({ type, count: STARTING_CARDS_PER_TYPE })))
      const roleCard = this.hasRoleCardOnMap(player.id) ? [] : [buildRoleCard(player)]
      room.hands[player.id] = [...roleCard, ...openingHand]
    }
  }

  private endCoCreation(): void {
    const room = this.requireRoom()
    const returned: DhCard[] = []
    for (const playerId of Object.keys(room.hands)) {
      returned.push(...room.hands[playerId].filter(card => !card.is_custom && card.type !== 'Role'))
      room.hands[playerId] = []
    }
    room.deck = shuffle([...room.deck, ...returned])
    room.mode = 'normal'
    room.current_turn_player_id = null
    room.drawn_this_turn = {}
    this.pendingDraws.clear()
  }

  private buildDrawOptions(): DhCard[] {
    const room = this.requireRoom()
    const options: DhCard[] = []

    for (const type of DRAW_TYPES) {
      const candidate = room.deck.find((card) => card.type === type)
      if (!candidate) {
        throw new Error(`Not enough ${type} cards left in deck to draw`)
      }
      options.push(candidate)
    }

    return options
  }

  private drawCardsForTypes(requests: Array<{ type: DeckCardType; count: number }>): DhCard[] {
    const room = this.requireRoom()
    let remainingDeck = [...room.deck]
    const drawn: DhCard[] = []

    for (const request of requests) {
      const selectedIndexes: number[] = []

      for (let index = 0; index < remainingDeck.length && selectedIndexes.length < request.count; index += 1) {
        if (remainingDeck[index].type === request.type) {
          selectedIndexes.push(index)
        }
      }

      if (selectedIndexes.length < request.count) {
        throw new Error(`Not enough ${request.type} cards left in deck`)
      }

      const selectedIndexSet = new Set(selectedIndexes)
      drawn.push(...selectedIndexes.map((index) => remainingDeck[index]))
      remainingDeck = remainingDeck.filter((_, index) => !selectedIndexSet.has(index))
    }

    room.deck = remainingDeck
    return drawn
  }

  private hasRoleCardOnMap(playerId: string): boolean {
    return this.requireRoom().map_cards.some((card) => card.type === 'Role' && card.placed_by_player_id === playerId)
  }

  private playCard(player: Player, cardId: string, x: number, y: number): void {
    const room = this.requireRoom()
    const hand = room.hands[player.id] ?? []
    const card = hand.find(item => item.id === cardId)
    if (!card) throw new Error('Card is not in your hand')

    const size = getCardGridSize(card.type)
    const mapCard: MapCard = {
      ...card,
      ...size,
      x: snapToGrid(x),
      y: snapToGrid(y),
      placed_by: player.nickname,
      placed_by_player_id: player.id,
      player_color: player.color,
      is_expanded: false,
    }

    room.hands[player.id] = hand.filter(item => item.id !== cardId)
    room.map_cards.push(mapCard)
  }

  private recycleCard(player: Player, cardId: string): void {
    const room = this.requireRoom()
    const card = this.requireMapCard(cardId)
    if (room.mode !== 'co-creation') throw new Error('Recycle is only available during co-creation')
    if (card.placed_by_player_id !== player.id && player.id !== room.host_player_id) {
      throw new Error('Only the owner or host can recycle this card')
    }
    room.map_cards = room.map_cards.filter(item => item.id !== cardId)
    room.connections = room.connections.filter(conn => conn.from_card_id !== cardId && conn.to_card_id !== cardId)
    room.hands[card.placed_by_player_id] = [...(room.hands[card.placed_by_player_id] ?? []), stripMapFields(card)]
  }

  private importPack(pack: DhPack): void {
    const room = this.requireRoom()
    const packId = id('pack')
    const libraryPack: RoomPackLibraryItem = {
      id: packId,
      pack_name: pack.pack_name,
      source: 'imported',
      cards: pack.cards.map((card, index) => ({
        id: card.id ?? `${packId}:card:${index}`,
        type: card.type,
        title: card.title,
        content: card.content,
        style: card.style,
      })),
    }
    const cards = this.instantiatePackCards(libraryPack)

    room.pack_library.push(libraryPack)
    if (!room.selected_pack_ids.includes(packId)) {
      room.selected_pack_ids.push(packId)
    }
    room.deck = shuffle([...room.deck, ...cards])
  }

  private importLibraryPack(packId: string): void {
    const room = this.requireRoom()
    const pack = this.requirePackLibraryItem(packId)
    room.deck = shuffle([...room.deck, ...this.instantiatePackCards(pack, true)])
  }

  private importCards(packId: string, cardIds: string[]): void {
    if (!cardIds.length) throw new Error('Select at least one card to import')

    const room = this.requireRoom()
    const pack = this.requirePackLibraryItem(packId)
    const allowedCardIds = new Set(cardIds)
    const selectedCards = pack.cards.filter((card) => allowedCardIds.has(card.id))

    if (!selectedCards.length) throw new Error('Selected cards were not found in the pack')

    room.deck = shuffle([...room.deck, ...selectedCards.map((card) => ({
      id: id('card'),
      type: card.type,
      title: card.title,
      content: card.content,
      style: card.style,
      is_custom: false,
      pack_id: this.resolveImportedDeckPackId(pack, true),
    }))])
  }

  private importRoomBackup(backup: DhRoomBackup): void {
    const room = this.requireRoom()
    const activePlayers = room.players
    const hostPlayerId = room.host_player_id
    const nicknameToPlayer = new Map(activePlayers.map((player) => [player.nickname, player]))
    const hands: Record<string, DhCard[]> = Object.fromEntries(activePlayers.map((player) => [player.id, []]))
    const fallbackDeck: DhCard[] = []

    for (const hand of backup.session.hands) {
      const player = nicknameToPlayer.get(hand.owner)
      if (player) {
        hands[player.id] = [...hands[player.id], ...structuredClone(hand.cards)]
      } else {
        fallbackDeck.push(...structuredClone(hand.cards))
      }
    }

    const importedLibrary = backup.library?.packs?.length
      ? structuredClone(backup.library.packs)
      : createBuiltInPackLibrary()
    const importedSelectedPackIds = backup.library?.selected_pack_ids?.length
      ? [...backup.library.selected_pack_ids]
      : [...room.selected_pack_ids]
    const deck = structuredClone(backup.session.deck ?? [])
    const turnOrder = backup.session.turn_order
      .map((nickname) => nicknameToPlayer.get(nickname)?.id)
      .filter((playerId): playerId is string => Boolean(playerId))

    for (const player of activePlayers) {
      if (!turnOrder.includes(player.id)) {
        turnOrder.push(player.id)
      }
    }

    const currentTurnPlayerId = backup.session.current_turn_player
      ? nicknameToPlayer.get(backup.session.current_turn_player)?.id ?? null
      : null

    room.room_name = backup.room.name || room.room_name
    room.mode = backup.session.mode
    room.current_turn_player_id = currentTurnPlayerId
    room.turn_order = turnOrder
    room.hands = hands
    room.deck = shuffle([...deck, ...fallbackDeck])
    room.map_cards = structuredClone(backup.map.cards)
    room.connections = structuredClone(backup.map.connections)
    room.annotations = structuredClone(backup.map.annotations)
    room.pack_library = importedLibrary
    room.selected_pack_ids = importedSelectedPackIds
    room.settings = {
      ...room.settings,
      imports_enabled: backup.settings?.imports_enabled ?? true,
    }
    room.host_player_id = hostPlayerId
    room.players = activePlayers.map((player) => ({
      ...player,
      is_host: player.id === hostPlayerId,
    }))
    room.drawn_this_turn = Object.fromEntries(activePlayers.map((player) => [player.id, false]))
    this.pendingDraws.clear()
  }

  private updateSelectedPacks(nextBuiltInPackIds: string[]): void {
    const room = this.requireRoom()
    if (room.mode === 'co-creation') {
      throw new Error('Cannot change selected packs during co-creation')
    }

    const selectedBuiltInPackIds = normalizeBuiltInPackSelection(nextBuiltInPackIds, false)
    if (!selectedBuiltInPackIds.length) {
      throw new Error('Select at least one built-in pack')
    }

    const importedPackIds = room.selected_pack_ids.filter((packId) => !isBuiltInPackId(packId))
    room.selected_pack_ids = [...selectedBuiltInPackIds, ...importedPackIds]
    this.rebuildDeckFromSelectedPacks(selectedBuiltInPackIds)
  }

  private updateSettings(importsEnabled: boolean): void {
    const room = this.requireRoom()
    room.settings = {
      ...room.settings,
      imports_enabled: importsEnabled,
    }
  }

  private rebuildDeckFromSelectedPacks(selectedBuiltInPackIds: string[]): void {
    const room = this.requireRoom()
    const reservedBuiltInCardIds = new Set<string>()

    for (const card of room.map_cards) {
      if (card.pack_id && isBuiltInPackId(card.pack_id)) {
        reservedBuiltInCardIds.add(card.id)
      }
    }

    for (const hand of Object.values(room.hands)) {
      for (const card of hand) {
        if (card.pack_id && isBuiltInPackId(card.pack_id)) {
          reservedBuiltInCardIds.add(card.id)
        }
      }
    }

    const builtInDeck = createDeckFromBuiltInPackIds(selectedBuiltInPackIds)
      .filter((card) => !reservedBuiltInCardIds.has(card.id))
    const importedAndCustomDeck = room.deck.filter((card) => !card.pack_id || !isBuiltInPackId(card.pack_id))

    room.deck = shuffle([...builtInDeck, ...importedAndCustomDeck])
  }

  private instantiatePackCards(pack: RoomPackLibraryItem, manualImport = false): DhCard[] {
    return pack.cards.map((card) => ({
      id: id('card'),
      type: card.type,
      title: card.title,
      content: card.content,
      style: card.style,
      is_custom: false,
      pack_id: this.resolveImportedDeckPackId(pack, manualImport),
    }))
  }

  private resolveImportedDeckPackId(pack: RoomPackLibraryItem, manualImport: boolean): string {
    if (!manualImport || pack.source !== 'built-in') return pack.id
    return `manual:${pack.id}`
  }

  private addConnection(connection: { from_card_id: string; to_card_id: string; color: 'red' | 'green' | 'gray'; label?: string }): void {
    const room = this.requireRoom()
    this.assertConnectionEndpoints(connection.from_card_id, connection.to_card_id)

    const exists = room.connections.some((item) => (
      item.from_card_id === connection.from_card_id && item.to_card_id === connection.to_card_id
    ))
    if (exists) {
      throw new Error('Connection already exists between these cards')
    }

    room.connections.push({
      id: id('conn'),
      from_card_id: connection.from_card_id,
      to_card_id: connection.to_card_id,
      color: connection.color,
      label: cleanOptionalText(connection.label, 40),
    })
  }

  private updateConnection(connectionId: string, updates: Partial<{ color: 'red' | 'green' | 'gray'; label?: string }>): void {
    const room = this.requireRoom()
    const index = room.connections.findIndex((item) => item.id === connectionId)
    if (index < 0) throw new Error('Unknown connection')

    const existing = room.connections[index]
    room.connections[index] = {
      ...existing,
      ...(updates.color ? { color: updates.color } : {}),
      ...(Object.prototype.hasOwnProperty.call(updates, 'label')
        ? { label: cleanOptionalText(updates.label, 40) }
        : {}),
    }
  }

  private lockCard(player: Player, cardId: string): void {
    const card = this.requireMapCard(cardId)
    if (card.locked_by_player_id && card.locked_by_player_id !== player.id) throw new Error('Card is locked by another player')
    card.locked_by = player.nickname
    card.locked_by_player_id = player.id
    card.locked_until = new Date(Date.now() + 30_000).toISOString()
  }

  private unlockCard(player: Player, cardId: string): void {
    const card = this.requireMapCard(cardId)
    if (card.locked_by_player_id && card.locked_by_player_id !== player.id) return
    delete card.locked_by
    delete card.locked_by_player_id
    delete card.locked_until
  }

  private updateMapCard(cardId: string, updates: MapCardUpdateInput): void {
    const room = this.requireRoom()
    room.map_cards = room.map_cards.map((card) => {
      if (card.id !== cardId) return card

      const { territory, ...restUpdates } = updates
      const nextCard: MapCard = { ...card, ...restUpdates }

      if (!Object.prototype.hasOwnProperty.call(updates, 'territory')) {
        return nextCard
      }

      if (territory) {
        return { ...nextCard, territory }
      }

      delete nextCard.territory
      return nextCard
    })
  }

  private moveMapCard(cardId: string, x: number, y: number): void {
    this.updateMapCard(cardId, { x, y })
  }

  private addAnnotation(annotation: { id?: string; text: string; x: number; y: number; font_size: number }): void {
    const room = this.requireRoom()
    const annotationId = typeof annotation.id === 'string' && annotation.id.trim() ? annotation.id.trim() : id('ann')
    const exists = room.annotations.some((item) => item.id === annotationId)
    if (exists) {
      throw new Error('Annotation id already exists')
    }

    room.annotations.push({
      id: annotationId,
      text: cleanText(annotation.text, '新标注', 280),
      x: finiteNumber(annotation.x, 0),
      y: finiteNumber(annotation.y, 0),
      font_size: clamp(Math.round(finiteNumber(annotation.font_size, 18)), 12, 48),
    })
  }

  private updateAnnotation(annotationId: string, updates: Partial<{ text: string; x: number; y: number; font_size: number }>): void {
    const annotation = this.requireAnnotation(annotationId)

    if (typeof updates.text === 'string') {
      annotation.text = cleanText(updates.text, annotation.text, 280)
    }
    if (typeof updates.x === 'number') {
      annotation.x = finiteNumber(updates.x, annotation.x)
    }
    if (typeof updates.y === 'number') {
      annotation.y = finiteNumber(updates.y, annotation.y)
    }
    if (typeof updates.font_size === 'number') {
      annotation.font_size = clamp(Math.round(finiteNumber(updates.font_size, annotation.font_size)), 12, 48)
    }
  }

  private resizeMapCard(cardId: string, width: number, height: number): void {
    const card = this.requireMapCard(cardId)
    this.updateMapCard(cardId, normalizeCardDimensions(card.type, width, height))
  }

  private advanceTurn(skipPlayerId?: string): void {
    const room = this.requireRoom()
    const onlineOrder = room.turn_order.filter(id => (
      id !== skipPlayerId && room.players.find(player => player.id === id)?.is_online
    ))
    if (!onlineOrder.length) {
      room.current_turn_player_id = null
      return
    }

    const current = room.current_turn_player_id
    const currentIndex = current ? onlineOrder.indexOf(current) : -1
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % onlineOrder.length
    room.current_turn_player_id = onlineOrder[nextIndex]
    room.drawn_this_turn[room.current_turn_player_id] = false
  }

  private nextOnlinePlayer(preferred: string | null): string | null {
    const room = this.requireRoom()
    const online = room.turn_order.filter(id => room.players.find(player => player.id === id)?.is_online)
    if (!online.length) return null
    return preferred && online.includes(preferred) ? preferred : online[0]
  }

  private async disconnect(socket: WebSocket): Promise<void> {
    const session = this.sockets.get(socket)
    if (!session) return
    this.sockets.delete(socket)

    const room = await this.load()
    const player = room?.players.find(item => item.id === session.playerId)
    if (!room || !player) return

    player.is_online = false
    player.last_seen_at = new Date().toISOString()
    this.transferHostIfNeeded()
    await this.commit('player.offline')
  }

  private transferHostIfNeeded(): void {
    const room = this.requireRoom()
    const host = room.players.find(player => player.id === room.host_player_id)
    if (host?.is_online) return

    const nextHost = room.players.find(player => player.is_online)
    if (!nextHost) return

    room.host_player_id = nextHost.id
    room.players = room.players.map(player => ({ ...player, is_host: player.id === nextHost.id }))
  }

  private async exportDhRoom(): Promise<Response> {
    const room = await this.mustLoad()
    const host = room.players.find(player => player.id === room.host_player_id)
    const currentTurn = room.players.find(player => player.id === room.current_turn_player_id)
    const backup: DhRoomBackup = {
      format: 'dhroom',
      version: 1,
      room: {
        id: room.room_id,
        name: room.room_name,
        invite_code: room.invite_code,
        created_at: room.created_at,
        expires_at: room.expires_at,
      },
      session: {
        mode: room.mode,
        current_host: host?.nickname ?? '',
        current_turn_player: currentTurn?.nickname ?? null,
        turn_order: room.turn_order
          .map(id => room.players.find(player => player.id === id)?.nickname)
          .filter((name): name is string => Boolean(name)),
        deck: room.deck,
        hands: Object.entries(room.hands).map(([ownerId, cards]) => ({
          owner: room.players.find(player => player.id === ownerId)?.nickname ?? ownerId,
          cards,
        })),
      },
      map: {
        cards: room.map_cards,
        connections: room.connections,
        annotations: room.annotations,
      },
      library: {
        packs: room.pack_library,
        selected_pack_ids: room.selected_pack_ids,
      },
      settings: room.settings,
      players: room.players.map(player => ({
        id: player.id,
        nickname: player.nickname,
        color: player.color,
        is_host: player.id === room.host_player_id,
        is_online: player.is_online,
      })),
      exported_at: new Date().toISOString(),
    }

    return json(backup)
  }

  private async commit(reason: string): Promise<void> {
    const room = this.requireRoom()
    room.updated_at = new Date().toISOString()
    room.snapshot_version += 1
    await this.save()
    this.broadcast({ type: 'room.updated', payload: { state: this.publicState(), reason } })
  }

  private async load(): Promise<RoomState | null> {
    if (this.room) return this.room
    const storedRoom = await this.ctx.storage.get<RoomState>('room') ?? null
    this.room = storedRoom ? this.migrateRoomState(storedRoom) : null
    return this.room
  }

  private async mustLoad(): Promise<RoomState> {
    const room = await this.load()
    if (!room) throw new HttpError(404, 'room_not_found')
    return room
  }

  private async save(): Promise<void> {
    if (!this.room) return
    await this.ctx.storage.put('room', this.room)
  }

  private publicState(): RoomState {
    return structuredClone(this.requireRoom())
  }

  private requireRoom(): RoomState {
    if (!this.room) throw new Error('Room is not loaded')
    return this.room
  }

  private migrateRoomState(room: RoomState): RoomState {
    const migrated = room as RoomState & {
      pack_library?: RoomPackLibraryItem[]
      settings?: { imports_enabled?: boolean }
    }
    const packLibrary = migrated.pack_library?.length ? migrated.pack_library : createBuiltInPackLibrary()
    const importedPackIds = new Set(packLibrary.filter((pack) => pack.source === 'imported').map((pack) => pack.id))
    const builtInSelection = normalizeBuiltInPackSelection(room.selected_pack_ids, false)
    const importedSelection = (room.selected_pack_ids ?? []).filter((packId) => importedPackIds.has(packId))
    const selectedPackIds = [
      ...(builtInSelection.length ? builtInSelection : normalizeBuiltInPackSelection(undefined, true)),
      ...importedSelection,
    ]

    return {
      ...room,
      deck: room.deck.map((card) => normalizeStoredCard(card)),
      hands: Object.fromEntries(
        Object.entries(room.hands).map(([playerId, cards]) => [playerId, cards.map((card) => normalizeStoredCard(card))]),
      ),
      map_cards: room.map_cards.map((card) => normalizeStoredCard(card) as MapCard),
      settings: {
        imports_enabled: migrated.settings?.imports_enabled ?? true,
      },
      pack_library: packLibrary.map((pack) => ({
        ...pack,
        cards: pack.cards.map((card) => normalizeStoredPackCard(card)),
      })),
      selected_pack_ids: Array.from(new Set(selectedPackIds)),
    }
  }

  private requirePlayer(playerId: string): Player {
    const player = this.requireRoom().players.find(item => item.id === playerId)
    if (!player) throw new Error('Unknown player')
    return player
  }

  private requireMapCard(cardId: string): MapCard {
    const card = this.requireRoom().map_cards.find(item => item.id === cardId)
    if (!card) throw new Error('Unknown map card')
    return card
  }

  private requirePackLibraryItem(packId: string): RoomPackLibraryItem {
    const pack = this.requireRoom().pack_library.find((item) => item.id === packId)
    if (!pack) throw new Error('Unknown pack')
    return pack
  }

  private requireHost(player: Player): void {
    if (player.id !== this.requireRoom().host_player_id) throw new Error('Host permission required')
  }

  private requireImportsEnabled(): void {
    if (!this.requireRoom().settings.imports_enabled) {
      throw new Error('Import feature is disabled in room settings')
    }
  }

  private requireCoCreation(): void {
    if (this.requireRoom().mode !== 'co-creation') throw new Error('Co-creation mode required')
  }

  private requireCurrentTurn(player: Player): void {
    this.requireCoCreation()
    if (this.requireRoom().current_turn_player_id !== player.id) throw new Error('It is not your turn')
  }

  private requireUnlockedOrOwner(player: Player, cardId: string): void {
    const card = this.requireMapCard(cardId)
    if (card.locked_by_player_id && card.locked_by_player_id !== player.id) {
      throw new Error('Card is locked by another player')
    }
  }

  private assertConnectionEndpoints(fromCardId: string, toCardId: string): void {
    if (fromCardId === toCardId) {
      throw new Error('Cannot connect a card to itself')
    }

    this.requireMapCard(fromCardId)
    this.requireMapCard(toCardId)
  }

  private send(socket: WebSocket, message: unknown): void {
    socket.send(JSON.stringify(message))
  }

  private sendError(socket: WebSocket, requestId: string | undefined, code: string, message: string): void {
    this.send(socket, { type: 'error', requestId, payload: { code, message } })
  }

  private broadcast(message: unknown): void {
    const encoded = JSON.stringify(message)
    for (const socket of this.sockets.keys()) {
      try {
        socket.send(encoded)
      } catch {
        this.sockets.delete(socket)
      }
    }
  }

  private requireAnnotation(annotationId: string) {
    const annotation = this.requireRoom().annotations.find((item) => item.id === annotationId)
    if (!annotation) throw new Error('Unknown annotation')
    return annotation
  }
}

function stripMapFields(card: MapCard): DhCard {
  return {
    id: card.id,
    type: card.type,
    title: card.title,
    content: card.content,
    style: card.style,
    is_custom: card.is_custom,
    pack_id: card.pack_id,
    role_details: card.role_details,
  }
}

function buildRoleCard(player: Player): DhCard {
  return {
    id: id('role'),
    type: 'Role',
    title: `${player.nickname}的角色`,
    content: '记录角色从创建到与他人相聚前最重要的经历、目标或秘密。',
    style: '#f59e0b',
    is_custom: false,
    role_details: {
      player_name: player.nickname,
      profession: '',
      ancestry: '',
      community: '',
    },
  }
}

function normalizeStoredCard<T extends { type: CardType; role_details?: RoleCardDetails }>(card: T): T {
  const normalizedType = normalizeCardType(card.type) ?? (card.role_details ? 'Role' : 'Hook')
  return {
    ...card,
    type: normalizedType,
    ...(normalizedType === 'Role' ? {} : { role_details: undefined }),
  }
}

function normalizeStoredPackCard<T extends { type: DeckCardType }>(card: T): T {
  const normalizedType = normalizeCardType(card.type)
  return {
    ...card,
    type: normalizedType === 'Role' || !normalizedType ? 'Hook' : normalizedType,
  }
}

function makePlayer(idValue: string, nickname: string, color: string, isHost: boolean, now: Date): Player {
  return {
    id: idValue,
    nickname,
    color,
    is_host: isHost,
    is_online: true,
    joined_at: now.toISOString(),
    last_seen_at: now.toISOString(),
  }
}

function roomStub(env: Env, inviteCode: string): DurableObjectStub {
  return env.ROOMS.get(env.ROOMS.idFromName(inviteCode))
}

function internalRequest(pathname: string, init?: RequestInit): Request {
  return new Request(`https://room.local${pathname}`, init)
}

function buildWebSocketUrl(request: Request, env: Env, inviteCode: string, token: string): string {
  const forwardedHost = request.headers.get('X-Forwarded-Host')
  const base = env.PUBLIC_API_BASE ?? (forwardedHost ? `https://${forwardedHost}` : request.url)
  const url = new URL(base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `/api/rooms/${inviteCode}/ws`
  url.search = new URLSearchParams({ token }).toString()
  return url.toString()
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
}

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return (text || fallback).slice(0, maxLength)
}

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim().slice(0, maxLength)
  return text || undefined
}

function normaliseInvite(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1)
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function getSessionSecret(env: Env): string {
  return env.SESSION_SECRET?.trim() || 'dhgc-local-dev-session-secret'
}

async function signSession(secret: string, payload: SessionPayload): Promise<string> {
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = await hmac(secret, body)
  return `${body}.${signature}`
}

async function verifySession(secret: string, token: string): Promise<SessionPayload | null> {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = await hmac(secret, body)
  if (signature !== expected) return null
  const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

async function hmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return base64UrlEncodeBytes(new Uint8Array(signature))
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value))
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string): string {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new TextDecoder().decode(bytes)
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return withCors(new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  }))
}

function emptyCors(): Response {
  return withCors(new Response(null, { status: 204 }))
}

function withCors(response: Response): Response {
  const next = new Response(response.body, response)
  next.headers.set('access-control-allow-origin', '*')
  next.headers.set('access-control-allow-methods', 'GET,POST,OPTIONS')
  next.headers.set('access-control-allow-headers', 'content-type,authorization')
  return next
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}
