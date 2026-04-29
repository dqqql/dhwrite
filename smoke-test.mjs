// Smoke test: room creation -> co-creation -> annotation flow -> export -> reconnect
// Usage: node smoke-test.mjs

import WebSocket from 'ws'

const API = 'http://127.0.0.1:8787'

let passed = 0
let failed = 0

function check(label, condition, detail) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
    passed += 1
    return
  }

  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` - ${detail}` : ''}`)
  failed += 1
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`${path}: ${data.message || data.error || res.status}`)
  }

  return data
}

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const messages = []
    const timer = setTimeout(() => reject(new Error('WebSocket connect timeout')), 5000)

    ws.on('open', () => {
      clearTimeout(timer)
      resolve({ ws, messages })
    })

    ws.on('message', (data) => {
      try {
        messages.push(JSON.parse(data.toString()))
      } catch {
        // Ignore malformed frames in smoke test collection.
      }
    })

    ws.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`WebSocket error: ${error.message || String(error)}`))
    })
  })
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg))
}

function drain(messages) {
  return messages.splice(0, messages.length)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function collectUntil(messages, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${type}" (have: ${messages.map((message) => message.type).join(', ') || 'none'})`))
    }, timeoutMs)

    const poll = () => {
      const index = messages.findIndex((message) => message.type === type)
      if (index >= 0) {
        clearTimeout(timer)
        resolve(messages.splice(0, index + 1))
        return
      }

      setTimeout(poll, 30)
    }

    poll()
  })
}

async function waitForRoomUpdate(messages, timeoutMs = 5000) {
  const batch = await collectUntil(messages, 'room.updated', timeoutMs)
  return batch[batch.length - 1]
}

function findPlayer(state, playerId) {
  return state.players.find((player) => player.id === playerId)
}

async function main() {
  console.log('=== Dagger Heart Smoke Test ===\n')

  console.log('1. Create room')
  const room = await post('/api/rooms', { nickname: 'Host', room_name: 'Smoke Test Room' })
  const { session: sessionA, state: stateA } = room
  check('Room created', Boolean(sessionA), `invite: ${sessionA?.invite_code}`)
  check('Invite code is 6 chars', sessionA.invite_code.length === 6)
  check('Player A is host', findPlayer(stateA, sessionA.player_id)?.is_host === true)

  console.log('\n2. Join room')
  const joined = await post('/api/rooms/join', { invite_code: sessionA.invite_code, nickname: 'Player B' })
  const { session: sessionB } = joined
  check('Player B joined', Boolean(sessionB), sessionB.player_id)
  check('Players count is 2', joined.state.players.length === 2)

  console.log('\n3. Connect WebSockets')
  const a = await wsConnect(sessionA.websocket_url)
  await sleep(100)
  const snapshotA = a.messages.find((message) => message.type === 'room.snapshot')
  check('WS A snapshot received', snapshotA?.type === 'room.snapshot')
  check('WS A player matches session', snapshotA?.payload.you.player_id === sessionA.player_id)
  drain(a.messages)

  const b = await wsConnect(sessionB.websocket_url)
  await sleep(100)
  const snapshotB = b.messages.find((message) => message.type === 'room.snapshot')
  check('WS B snapshot received', snapshotB?.type === 'room.snapshot')
  drain(b.messages)
  const aOnlineUpdates = drain(a.messages)
  check('A saw B come online', aOnlineUpdates.some((message) => message.type === 'room.updated'))

  console.log('\n4. Start co-creation')
  send(a.ws, { type: 'room.startCoCreation' })
  const startA = await waitForRoomUpdate(a.messages)
  const startB = await waitForRoomUpdate(b.messages)
  const startState = startA.payload.state
  check('Mode is co-creation', startState.mode === 'co-creation')
  check(
    'Both players received 5 starting cards',
    startState.hands[sessionA.player_id]?.length === 5 && startState.hands[sessionB.player_id]?.length === 5,
    `A:${startState.hands[sessionA.player_id]?.length} B:${startState.hands[sessionB.player_id]?.length}`,
  )
  check('B synced co-creation start', startB.payload.state.mode === 'co-creation')
  drain(a.messages)
  drain(b.messages)

  console.log('\n5. Draw a card')
  const currentTurnPlayerId = startState.current_turn_player_id
  const turnClient = currentTurnPlayerId === sessionA.player_id ? a : b
  const turnSessionId = currentTurnPlayerId
  send(turnClient.ws, { type: 'card.draw' })
  const drawBatch = await collectUntil(turnClient.messages, 'draw.options')
  const drawOptions = drawBatch[drawBatch.length - 1]
  check('Draw options received', drawOptions.payload.cards.length >= 1, `got ${drawOptions.payload.cards.length}`)

  const picked = drawOptions.payload.cards[0]
  send(turnClient.ws, { type: 'card.draw.confirm', payload: { cardId: picked.id } })
  const drawUpdateA = await waitForRoomUpdate(a.messages)
  const drawUpdateB = await waitForRoomUpdate(b.messages)
  const drawState = drawUpdateA.payload.state
  check('Hand increased after draw', drawState.hands[turnSessionId].length === 6, `size ${drawState.hands[turnSessionId].length}`)
  check('Other client synced draw', drawUpdateB.payload.state.hands[turnSessionId].length === 6)
  drain(a.messages)
  drain(b.messages)

  console.log('\n6. Play a card onto the map')
  const cardToPlay = drawState.hands[turnSessionId][0]
  send(turnClient.ws, { type: 'card.play', payload: { cardId: cardToPlay.id, x: 240, y: 192 } })
  const playUpdateA = await waitForRoomUpdate(a.messages)
  const playUpdateB = await waitForRoomUpdate(b.messages)
  const playState = playUpdateA.payload.state
  const placedCard = playState.map_cards.find((card) => card.id === cardToPlay.id)
  check('Card appeared on map', Boolean(placedCard))
  check('Hand decreased after play', playState.hands[turnSessionId].length === 5, `size ${playState.hands[turnSessionId].length}`)
  check('Other client synced played card', playUpdateB.payload.state.map_cards.some((card) => card.id === cardToPlay.id))
  drain(a.messages)
  drain(b.messages)

  console.log('\n7. Move the map card')
  send(turnClient.ws, { type: 'card.lock', payload: { cardId: placedCard.id } })
  await waitForRoomUpdate(a.messages)
  await waitForRoomUpdate(b.messages)
  send(turnClient.ws, { type: 'card.move.commit', payload: { cardId: placedCard.id, x: 480, y: 360 } })
  const moveUpdateA = await waitForRoomUpdate(a.messages)
  const movedCard = moveUpdateA.payload.state.map_cards.find((card) => card.id === placedCard.id)
  check('Card moved to target position', movedCard?.x === 480 && movedCard?.y === 360, `pos ${movedCard?.x},${movedCard?.y}`)
  await waitForRoomUpdate(b.messages)
  drain(a.messages)
  drain(b.messages)

  console.log('\n8. Resize the map card')
  const nextWidth = movedCard.width + 48
  const nextHeight = movedCard.height + 48
  send(turnClient.ws, { type: 'card.resize.commit', payload: { cardId: placedCard.id, width: nextWidth, height: nextHeight } })
  const resizeUpdateA = await waitForRoomUpdate(a.messages)
  const resizedCard = resizeUpdateA.payload.state.map_cards.find((card) => card.id === placedCard.id)
  check('Card width updated', resizedCard.width >= nextWidth, `width ${resizedCard.width}`)
  check('Card height updated', resizedCard.height >= nextHeight, `height ${resizedCard.height}`)
  await waitForRoomUpdate(b.messages)
  drain(a.messages)
  drain(b.messages)

  console.log('\n9. Annotation flow')
  const annotationId = 'ann_smoke'
  send(a.ws, {
    type: 'annotation.add',
    payload: {
      id: annotationId,
      text: 'First note',
      x: 336,
      y: 216,
      font_size: 18,
    },
  })
  const annotationAddA = await waitForRoomUpdate(a.messages)
  const annotationAddB = await waitForRoomUpdate(b.messages)
  const addedAnnotation = annotationAddA.payload.state.annotations.find((annotation) => annotation.id === annotationId)
  check('Annotation created', Boolean(addedAnnotation))
  check('Other client synced annotation create', annotationAddB.payload.state.annotations.some((annotation) => annotation.id === annotationId))
  drain(a.messages)
  drain(b.messages)

  send(a.ws, {
    type: 'annotation.update',
    payload: {
      annotationId,
      updates: {
        text: 'Updated note',
        x: 360,
        y: 240,
        font_size: 24,
      },
    },
  })
  const annotationUpdateA = await waitForRoomUpdate(a.messages)
  const updatedAnnotation = annotationUpdateA.payload.state.annotations.find((annotation) => annotation.id === annotationId)
  check(
    'Annotation updated',
    updatedAnnotation?.text === 'Updated note'
      && updatedAnnotation?.x === 360
      && updatedAnnotation?.y === 240
      && updatedAnnotation?.font_size === 24,
    JSON.stringify(updatedAnnotation),
  )
  await waitForRoomUpdate(b.messages)
  drain(a.messages)
  drain(b.messages)

  send(a.ws, { type: 'annotation.remove', payload: { annotationId } })
  const annotationRemoveA = await waitForRoomUpdate(a.messages)
  const annotationRemoveB = await waitForRoomUpdate(b.messages)
  check('Annotation removed', !annotationRemoveA.payload.state.annotations.some((annotation) => annotation.id === annotationId))
  check('Other client synced annotation remove', !annotationRemoveB.payload.state.annotations.some((annotation) => annotation.id === annotationId))
  drain(a.messages)
  drain(b.messages)

  console.log('\n10. End turn')
  send(turnClient.ws, { type: 'turn.end' })
  const turnUpdateA = await waitForRoomUpdate(a.messages)
  const turnState = turnUpdateA.payload.state
  check(
    'Turn advanced to next player',
    turnState.current_turn_player_id !== currentTurnPlayerId && turnState.current_turn_player_id != null,
    `from ${currentTurnPlayerId?.slice(-8)} to ${turnState.current_turn_player_id?.slice(-8)}`,
  )
  await waitForRoomUpdate(b.messages)
  drain(a.messages)
  drain(b.messages)

  console.log('\n11. Create a custom card')
  send(turnClient.ws, {
    type: 'card.create',
    payload: {
      card: {
        type: 'NPC',
        title: 'Custom Contact',
        content: 'Created in smoke test',
        style: '#ff0000',
      },
    },
  })
  const customUpdateA = await waitForRoomUpdate(a.messages)
  const customState = customUpdateA.payload.state
  check('Custom card added to hand', customState.hands[turnSessionId].some((card) => card.is_custom))
  await waitForRoomUpdate(b.messages)
  drain(a.messages)
  drain(b.messages)

  console.log('\n12. Export room backup')
  const exportRes = await fetch(`${API}/api/rooms/${sessionA.invite_code}/export/dhroom`)
  check('Export returned HTTP 200', exportRes.ok)
  const backup = await exportRes.json()
  check('Export format is dhroom', backup.format === 'dhroom')
  check('Export contains map cards', backup.map.cards.length >= 1)
  check('Export contains annotations array', Array.isArray(backup.map.annotations))

  console.log('\n13. End co-creation')
  send(a.ws, { type: 'room.endCoCreation' })
  const endUpdateA = await waitForRoomUpdate(a.messages)
  const endUpdateB = await waitForRoomUpdate(b.messages)
  const endState = endUpdateA.payload.state
  check('Mode is normal after ending co-creation', endState.mode === 'normal')
  check('All hands recalled', Object.values(endState.hands).every((hand) => hand.length === 0))
  check('Other client synced co-creation end', endUpdateB.payload.state.mode === 'normal')
  drain(a.messages)
  drain(b.messages)

  console.log('\n14. Reconnect')
  b.ws.close()
  await sleep(300)
  const b2 = await wsConnect(sessionB.websocket_url)
  await sleep(200)
  const reconnectSnapshot = b2.messages.find((message) => message.type === 'room.snapshot')
  check('Reconnect snapshot received', reconnectSnapshot?.type === 'room.snapshot')

  a.ws.close()
  b2.ws.close()

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('\nFATAL:', error.message || error)
  process.exit(1)
})
