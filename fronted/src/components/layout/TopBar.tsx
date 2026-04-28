import React from 'react'
import { useStore } from '@/store/useStore'
import {
  Settings, Download, Upload, Play, StopCircle,
  Clock, Hash, ChevronDown, Layers, FileJson, FileText,
} from 'lucide-react'

export function TopBar() {
  const {
    room, currentPlayerId, isExportMenuOpen, toggleExportMenu,
    openImportModal, openRoomSettings, startCoCreation, openEndConfirm,
    addToast,
  } = useStore()

  const isHost = room?.host_player_id === currentPlayerId
  const isCoCreation = room?.mode === 'co-creation'

  function exportDhRoom() {
    if (!room) return
    // TODO: Build full dhroom.json from backend snapshot; local mock below
    const data = {
      format: 'dhroom', version: 1,
      room: { name: room.room_name, invite_code: room.invite_code, created_at: new Date().toISOString(), expires_at: room.expires_at },
      session: { mode: room.mode, current_host: room.players.find(p => p.id === room.host_player_id)?.nickname },
      map: { cards: room.map_cards, connections: room.connections, annotations: room.annotations },
      players: room.players,
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${room.room_name}.dhroom.json`; a.click()
    URL.revokeObjectURL(url)
    addToast('房间备份已导出！', 'success')
    toggleExportMenu()
  }

  function exportMarkdown() {
    if (!room) return
    let md = `# ${room.room_name} · 叙事摘要\n\n`
    const locs = room.map_cards.filter(c => c.type === 'Location')
    const npcs = room.map_cards.filter(c => c.type === 'NPC')
    const feats = room.map_cards.filter(c => c.type === 'Feature')
    if (locs.length) { md += `## 地点\n`; locs.forEach(c => { md += `### ${c.title}\n${c.content}\n\n` }) }
    if (npcs.length) { md += `## 人物\n`; npcs.forEach(c => { md += `### ${c.title}\n${c.content}\n\n` }) }
    if (feats.length) { md += `## 特色\n`; feats.forEach(c => { md += `### ${c.title}\n${c.content}\n\n` }) }
    if (room.connections.length) {
      md += `## 关系\n`
      room.connections.forEach(conn => {
        const f = room.map_cards.find(c => c.id === conn.from_card_id)
        const t = room.map_cards.find(c => c.id === conn.to_card_id)
        const rel = conn.color === 'red' ? '冲突' : conn.color === 'green' ? '盟友' : '未知'
        md += `- **${f?.title}** → **${t?.title}** (${conn.label || rel})\n`
      })
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${room.room_name}.md`; a.click()
    URL.revokeObjectURL(url)
    addToast('叙事摘要已导出！', 'success')
    toggleExportMenu()
  }

  if (!room) return null

  const expiresAt = new Date(room.expires_at)
  const daysLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 14px',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border-subtle)',
      height: 52,
    }}>
      {/* Logo + room name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 0,
          background: 'var(--accent-violet)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'white',
          boxShadow: 'none',
        }}>
          匕
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {room.room_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <Hash size={9} color="var(--text-muted)" />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {room.invite_code}
            </span>
          </div>
        </div>
      </div>

      {/* Mode badge */}
      <div className={`mode-badge mode-badge--${isCoCreation ? 'cocreation' : 'free'}`}>
        <Layers size={11} />
        {isCoCreation ? '共创模式' : '自由模式'}
      </div>

      {/* Deck remaining */}
      {isCoCreation && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 99,
          background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
          fontSize: 11, color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>牌堆</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{room.deck_remaining}</span>
        </div>
      )}

      {/* Expiry warning */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 99,
        background: daysLeft < 1 ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${daysLeft < 1 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.15)'}`,
        fontSize: 11,
        color: daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)',
      }}>
        <Clock size={10} />
        {daysLeft > 0 ? `${daysLeft}天后删除` : '今日到期！'}
      </div>

      <div style={{ flex: 1 }} />

      {/* Host controls */}
      {isHost && (
        isCoCreation ? (
          <button className="btn btn-danger btn-sm" onClick={openEndConfirm}>
            <StopCircle size={13} /> 结束共创
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={startCoCreation}>
            <Play size={13} /> 开始共创
          </button>
        )
      )}

      {/* Import */}
      <button className="btn btn-secondary btn-sm" onClick={openImportModal}>
        <Upload size={13} /> 导入
      </button>

      {/* Export menu */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-secondary btn-sm" onClick={toggleExportMenu}>
          <Download size={13} /> 导出 <ChevronDown size={11} />
        </button>
        {isExportMenuOpen && (
          <div className="context-menu" style={{ top: '100%', right: 0, left: 'auto', marginTop: 4, minWidth: 200 }}>
            <div className="context-menu__item" onClick={exportDhRoom}>
              <FileJson size={13} /> 房间备份 (.dhroom.json)
            </div>
            <div className="context-menu__item" onClick={exportMarkdown}>
              <FileText size={13} /> 叙事摘要 (.md)
            </div>
          </div>
        )}
      </div>

      {/* Room settings */}
      <button className="btn btn-ghost btn-icon" onClick={openRoomSettings} title="房间设置">
        <Settings size={15} />
      </button>
    </div>
  )
}
