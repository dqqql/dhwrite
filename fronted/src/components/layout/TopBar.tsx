import React from 'react'
import { fetchDhRoomBackup } from '@/lib/realtime'
import { useStore } from '@/store/useStore'
import { getCardBodyText } from '@/utils/cardText'
import {
  BookOpen,
  ChevronDown,
  Clock,
  Download,
  FileJson,
  FileText,
  Hash,
  Layers,
  LogOut,
  Play,
  Settings,
  StopCircle,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'

export function TopBar({ onLeaveRoom }: { onLeaveRoom: () => void }) {
  const {
    room,
    currentPlayerId,
    connectionStatus,
    isExportMenuOpen,
    toggleExportMenu,
    openImportModal,
    openRoomSettings,
    openCardLibrary,
    startCoCreation,
    openEndConfirm,
    manualReconnect,
    leaveRoom,
    addToast,
  } = useStore()

  if (!room) return null
  const currentRoom = room

  const isHost = currentRoom.host_player_id === currentPlayerId
  const isCoCreation = currentRoom.mode === 'co-creation'
  const modeLabel = currentRoom.mode === 'co-creation'
    ? '共创模式'
    : currentRoom.mode === 'normal'
      ? '普通模式'
      : '自由模式'
  const isDisconnected = connectionStatus === 'error' || connectionStatus === 'idle'
  const isReconnecting = connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
  const expiresAt = new Date(currentRoom.expires_at)
  const daysLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  async function exportDhRoom() {
    try {
      const blob = await fetchDhRoomBackup(currentRoom.invite_code)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentRoom.room_name}.dhroom.json`
      link.click()
      URL.revokeObjectURL(url)
      addToast('房间备份已导出', 'success')
      toggleExportMenu()
    } catch (error) {
      addToast(error instanceof Error ? error.message : '导出房间备份失败', 'error')
    }
  }

  function exportMarkdown() {
    let markdown = `# ${currentRoom.room_name} - 叙事摘要\n\n`
    const roleCards = currentRoom.map_cards.filter((card) => card.type === 'Role')
    const locations = currentRoom.map_cards.filter((card) => card.type === 'Location')
    const features = currentRoom.map_cards.filter((card) => card.type === 'Feature')
    const hooks = currentRoom.map_cards.filter((card) => card.type === 'Hook')

    if (roleCards.length) {
      markdown += '## 角色卡\n'
      roleCards.forEach((card) => {
        markdown += `### ${card.title}\n${getCardBodyText(card)}\n\n`
      })
    }

    if (locations.length) {
      markdown += '## 地点\n'
      locations.forEach((card) => {
        markdown += `### ${card.title}\n${getCardBodyText(card)}\n\n`
      })
    }

    if (features.length) {
      markdown += '## 特色\n'
      features.forEach((card) => {
        markdown += `### ${card.title}\n${getCardBodyText(card)}\n\n`
      })
    }

    if (hooks.length) {
      markdown += '## 故事\n'
      hooks.forEach((card) => {
        markdown += `### ${card.title}\n${getCardBodyText(card)}\n\n`
      })
    }

    if (currentRoom.connections.length) {
      markdown += '## 关系\n'
      currentRoom.connections.forEach((connection) => {
        const from = currentRoom.map_cards.find((card) => card.id === connection.from_card_id)
        const to = currentRoom.map_cards.find((card) => card.id === connection.to_card_id)
        const relation = connection.color === 'red' ? '冲突' : connection.color === 'green' ? '盟友' : '未知'
        markdown += `- **${from?.title}** -> **${to?.title}** (${connection.label || relation})\n`
      })
      markdown += '\n'
    }

    if (currentRoom.annotations.length) {
      markdown += '## 标注\n'
      currentRoom.annotations.forEach((annotation) => {
        markdown += `- ${annotation.text}\n`
      })
    }

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentRoom.room_name}.md`
    link.click()
    URL.revokeObjectURL(url)
    addToast('叙事摘要已导出', 'success')
    toggleExportMenu()
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 52,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 0,
            background: 'linear-gradient(135deg, var(--accent-violet), #3b82f6)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: 'white',
          }}
        >
          匕
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {currentRoom.room_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <Hash size={9} color="var(--text-muted)" />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {currentRoom.invite_code}
            </span>
          </div>
        </div>
      </div>

      <div className={`mode-badge mode-badge--${isCoCreation ? 'cocreation' : 'free'}`}>
        <Layers size={11} />
        {modeLabel}
      </div>

      {isCoCreation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 99,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>牌堆</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currentRoom.deck.length}</span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 99,
          background: daysLeft < 1 ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${daysLeft < 1 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.15)'}`,
          fontSize: 11,
          color: daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)',
        }}
      >
        <Clock size={10} />
        {daysLeft > 0 ? `${daysLeft} 天后到期` : '今日到期'}
      </div>

      <div style={{ flex: 1 }} />

      {isReconnecting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 99,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            fontSize: 11,
            color: 'var(--accent-amber)',
          }}
        >
          <Wifi size={11} style={{ animation: 'pulse 1.5s infinite' }} />
          重连中
        </div>
      )}

      {isDisconnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 99,
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.2)',
            fontSize: 11,
            color: 'var(--accent-rose)',
          }}
        >
          <WifiOff size={11} />
          连接断开
          <button
            className="btn btn-sm"
            style={{
              marginLeft: 2,
              padding: '2px 8px',
              fontSize: 10,
              background: 'var(--accent-rose)',
              color: 'white',
              border: 'none',
              borderRadius: 99,
              cursor: 'pointer',
            }}
            onClick={(event) => {
              event.stopPropagation()
              manualReconnect()
            }}
          >
            重连
          </button>
        </div>
      )}

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

      <button className="btn btn-secondary btn-sm" onClick={openCardLibrary}>
        <BookOpen size={13} /> 卡包库
      </button>

      {isHost && (
        <button className="btn btn-secondary btn-sm" onClick={openImportModal}>
          <Upload size={13} /> 导入
        </button>
      )}

      <div style={{ position: 'relative' }}>
        <button className="btn btn-secondary btn-sm" onClick={toggleExportMenu}>
          <Download size={13} /> 导出 <ChevronDown size={11} />
        </button>
        {isExportMenuOpen && (
          <div className="context-menu" style={{ top: '100%', right: 0, left: 'auto', marginTop: 4, minWidth: 220 }}>
            <div className="context-menu__item" onClick={exportDhRoom}>
              <FileJson size={13} /> 房间备份 (.dhroom.json)
            </div>
            <div className="context-menu__item" onClick={exportMarkdown}>
              <FileText size={13} /> 叙事摘要 (.md)
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-ghost btn-icon" onClick={openRoomSettings} title="房间设置">
        <Settings size={15} />
      </button>

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          leaveRoom()
          onLeaveRoom()
        }}
        title="返回大厅"
        style={{ marginLeft: 4 }}
      >
        <LogOut size={13} /> 退出
      </button>
    </div>
  )
}
