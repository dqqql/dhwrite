// Smoke test: full co-creation flow with two simulated clients
// Usage: node smoke-test.mjs

import WebSocket from 'ws'

const API = 'http://127.0.0.1:8787'

let passed = 0
let failed = 0
function check(label, condition, detail) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
    passed++
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${path}: ${data.message || data.error || res.status}`)
  return data
}

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const messages = []
    const timer = setTimeout(() => reject(new Error('WebSocket connect timeout')), 5000)
    ws.on('open', () => { clearTimeout(timer); resolve({ ws, messages }) })
    ws.on('message', (data) => {
      try { messages.push(JSON.parse(data.toString())) } catch {}
    })
    ws.on('error', (e) => reject(new Error('WebSocket error: ' + (e.message || String(e)))))
  })
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg))
}

function drain(messages) {
  return messages.splice(0, messages.length)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Wait for a specific message type, but collect all messages until then
function collectUntil(messages, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${type}" (have: ${messages.map(m => m.type).join(', ') || 'none'})`))
    }, timeoutMs)
    const check = () => {
      const idx = messages.findIndex(m => m.type === type)
      if (idx >= 0) {
        clearTimeout(timer)
        const collected = messages.splice(0, idx + 1)
        resolve(collected)
      } else {
        setTimeout(check, 30)
      }
    }
    check()
  })
}

// Wait for N messages of a specific type
async function waitForUpdates(messages, count, timeoutMs = 5000) {
  const results = []
  for (let i = 0; i < count; i++) {
    const batch = await collectUntil(messages, 'room.updated', timeoutMs)
    results.push(batch[batch.length - 1]) // last one is the room.updated
  }
  return results
}

async function main() {
  console.log('=== 匕首之心 Smoke Test ===\n')

  // ─── 1. Create room ───
  console.log('1. Create room')
  const room = await post('/api/rooms', { nickname: '主持人', room_name: '测试房间' })
  const { session: sessionA, state: stateA } = room
  check('Room created', !!room.session, `invite: ${room.session.invite_code}`)
  check('Invite code is 6 chars', room.session.invite_code.length === 6)
  check('Player A is host', stateA.players.find(p => p.id === sessionA.player_id)?.is_host === true)

  // ─── 2. Join room ───
  console.log('\n2. Join room')
  const joined = await post('/api/rooms/join', { invite_code: sessionA.invite_code, nickname: '玩家B' })
  const { session: sessionB } = joined
  check('Player B joined', !!sessionB, sessionB.player_id)
  check('Players count is 2', joined.state.players.length === 2)

  // ─── 3. Connect both WebSockets ───
  console.log('\n3. Connect WebSockets')
  const a = await wsConnect(sessionA.websocket_url)
  await sleep(100)
  const snapA = a.messages.find(m => m.type === 'room.snapshot')
  check('WS A snapshot received', snapA?.type === 'room.snapshot')
  check('WS A player_id matches', snapA?.payload.you.player_id === sessionA.player_id)
  drain(a.messages)

  const b = await wsConnect(sessionB.websocket_url)
  await sleep(100)
  const snapB = b.messages.find(m => m.type === 'room.snapshot')
  check('WS B snapshot received', snapB?.type === 'room.snapshot')
  // Drain B's own online update
  drain(b.messages)
  // Drain A's "B joined" update
  const aDrain = drain(a.messages)
  check('A synced B online', aDrain.some(m => m.type === 'room.updated'))

  // ─── 4. Start co-creation ───
  console.log('\n4. Start co-creation')
  send(a.ws, { type: 'room.startCoCreation' })
  await sleep(200)
  const ccA = a.messages.find(m => m.type === 'room.updated')
  const ccB = b.messages.find(m => m.type === 'room.updated')
  const ccState = ccA?.payload.state
  check('Mode: co-creation', ccState?.mode === 'co-creation')
  check('Turn order set', ccState?.current_turn_player_id != null)
  check('Both have 3 cards', ccState?.hands[sessionA.player_id]?.length === 3 && ccState?.hands[sessionB.player_id]?.length === 3,
    `A:${ccState?.hands[sessionA.player_id]?.length} B:${ccState?.hands[sessionB.player_id]?.length}`)
  check('B synced start', ccB?.payload.state.mode === 'co-creation')
  drain(a.messages); drain(b.messages)

  // ─── 5. Draw card (3 options or fewer if deck runs low) ───
  console.log('\n5. Draw card')
  const whoseTurn = ccState.current_turn_player_id
  const turnWS = whoseTurn === sessionA.player_id ? a : b
  const otherWS = whoseTurn === sessionA.player_id ? b : a
  const turnSid = whoseTurn

  send(turnWS.ws, { type: 'card.draw' })
  const drawBatch = await collectUntil(turnWS.messages, 'draw.options')
  const drawOpts = drawBatch[drawBatch.length - 1]
  check('Draw options received', drawOpts?.payload?.cards?.length >= 1, `got ${drawOpts?.payload?.cards?.length} cards`)

  const picked = drawOpts.payload.cards[0]
  send(turnWS.ws, { type: 'card.draw.confirm', payload: { cardId: picked.id } })
  await sleep(200)
  const handSize = 4 // 3 initial + 1 drawn
  const drawUpdateA = a.messages.filter(m => m.type === 'room.updated')
  const drawUpdateB = b.messages.filter(m => m.type === 'room.updated')
  const finalHandSize = drawUpdateA[drawUpdateA.length - 1]?.payload?.state?.hands?.[turnSid]?.length
  check('Card added to hand', finalHandSize === handSize, `expected ${handSize}, got ${finalHandSize}`)
  check('B synced draw', drawUpdateB[drawUpdateB.length - 1]?.payload?.state?.hands?.[turnSid]?.length === handSize)
  drain(a.messages); drain(b.messages)

  // ─── 6. Play card onto map ───
  console.log('\n6. Play card')
  const currentState = drawUpdateA[drawUpdateA.length - 1]?.payload.state
  const handCards = currentState?.hands[turnSid] || []
  check('Has cards to play', handCards.length > 0)
  const cardToPlay = handCards[0]
  send(turnWS.ws, { type: 'card.play', payload: { cardId: cardToPlay.id, x: 240, y: 192 } })
  await sleep(200)
  const playA = a.messages.filter(m => m.type === 'room.updated')
  const playState = playA[playA.length - 1]?.payload.state
  const mapCards = playState?.map_cards || []
  check('Card on map', mapCards.length === 1, `map cards: ${mapCards.length}`)
  check('Card removed from hand', (playState?.hands[turnSid]?.length || 0) === handCards.length - 1)
  const placedCard = mapCards[0]
  drain(a.messages); drain(b.messages)

  // ─── 7. Lock + Move + Commit ───
  console.log('\n7. Move card')
  send(turnWS.ws, { type: 'card.lock', payload: { cardId: placedCard.id } })
  await sleep(100)
  send(turnWS.ws, { type: 'card.move.commit', payload: { cardId: placedCard.id, x: 480, y: 360 } })
  await sleep(200)
  const moveUpdates = a.messages.filter(m => m.type === 'room.updated')
  const moveState = moveUpdates[moveUpdates.length - 1]?.payload.state
  const movedCard = moveState?.map_cards.find(c => c.id === placedCard.id)
  check('Card moved', movedCard?.x === 480 && movedCard?.y === 360, `pos: ${movedCard?.x},${movedCard?.y}`)
  drain(a.messages); drain(b.messages)

  // ─── 8. Resize card ───
  console.log('\n8. Resize card')
  send(turnWS.ws, { type: 'card.resize.commit', payload: { cardId: placedCard.id, gridScale: 2 } })
  await sleep(200)
  const resizeUpdates = a.messages.filter(m => m.type === 'room.updated')
  const resizeState = resizeUpdates[resizeUpdates.length - 1]?.payload.state
  const resizedCard = resizeState?.map_cards.find(c => c.id === placedCard.id)
  check('Card resized', resizedCard?.grid_scale === 2, `scale: ${resizedCard?.grid_scale}`)
  check('B synced resize', b.messages.some(m => m.type === 'room.updated'))
  drain(a.messages); drain(b.messages)

  // ─── 9. End turn ───
  console.log('\n9. End turn')
  send(turnWS.ws, { type: 'turn.end' })
  await sleep(200)
  const turnUpdates = a.messages.filter(m => m.type === 'room.updated')
  const turnState = turnUpdates[turnUpdates.length - 1]?.payload.state
  const nextTurn = turnState?.current_turn_player_id
  check('Turn advanced', nextTurn !== whoseTurn && nextTurn != null, `from ${whoseTurn?.slice(-8)} to ${nextTurn?.slice(-8)}`)
  drain(a.messages); drain(b.messages)

  // ─── 10. Force skip (host skips next player) ───
  console.log('\n10. Force skip')
  if (nextTurn) {
    send(a.ws, { type: 'turn.forceSkip', payload: { playerId: nextTurn } })
    await sleep(200)
    const skipUpdates = a.messages.filter(m => m.type === 'room.updated')
    const skipState = skipUpdates[skipUpdates.length - 1]?.payload.state
    check('Player skipped', skipState?.current_turn_player_id !== nextTurn)
    drain(a.messages); drain(b.messages)
  } else {
    console.log('  (no next turn, skipping)')
    check('(skipped)', true)
  }

  // ─── 11. Create custom card ───
  console.log('\n11. Create custom card')
  send(turnWS.ws, { type: 'card.create', payload: { card: { type: 'NPC', title: '自定义角色', content: '测试卡', style: '#ff0000' } } })
  await sleep(200)
  const customUpdate = a.messages.find(m => m.type === 'room.updated')
  const customState = customUpdate?.payload?.state
  const customInHand = customState?.hands[turnSid]?.some(c => c.is_custom)
  check('Custom card in hand', customInHand === true)
  drain(a.messages); drain(b.messages)

  // ─── 12. Export room backup ───
  console.log('\n12. Export .dhroom.json')
  const exportRes = await fetch(`${API}/api/rooms/${sessionA.invite_code}/export/dhroom`)
  check('Export HTTP 200', exportRes.ok)
  const backup = await exportRes.json()
  check('Export format is dhroom', backup.format === 'dhroom')
  check('Export has map cards', backup.map.cards.length >= 1)

  // ─── 13. End co-creation ───
  console.log('\n13. End co-creation')
  send(a.ws, { type: 'room.endCoCreation' })
  await sleep(200)
  const endUpdate = a.messages.find(m => m.type === 'room.updated')
  const endState = endUpdate?.payload.state
  check('Mode is normal', endState?.mode === 'normal')
  const allHandsEmpty = Object.values(endState?.hands || {}).every(h => h.length === 0)
  check('Hands recalled', allHandsEmpty)
  drain(a.messages); drain(b.messages)

  // ─── 14. Reconnect ───
  console.log('\n14. Reconnect')
  b.ws.close()
  await sleep(300)
  const b2 = await wsConnect(sessionB.websocket_url)
  await sleep(200)
  const snapB2 = b2.messages.find(m => m.type === 'room.snapshot')
  check('Reconnect OK', snapB2?.type === 'room.snapshot')
  b2.ws.close()

  // ─── Cleanup ───
  a.ws.close()

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('\nFATAL:', err.message || err)
  process.exit(1)
})
