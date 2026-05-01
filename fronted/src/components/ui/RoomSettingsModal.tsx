import React, { useEffect, useMemo, useState } from 'react'
import { createBuiltInPackLibrary, DEFAULT_BUILT_IN_PACK_IDS } from '@dhgc/shared'
import { useStore } from '@/store/useStore'
import { Modal } from './Modal'
import { Check, Clock, Copy, Trash2 } from 'lucide-react'

const LOADED_AT = Date.now()

export function RoomSettingsModal() {
  const {
    room,
    currentPlayerId,
    isRoomSettingsOpen,
    closeRoomSettings,
    updateSelectedPacks,
    updateImportsEnabled,
    addToast,
  } = useStore()
  const [copied, setCopied] = useState(false)
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(DEFAULT_BUILT_IN_PACK_IDS)
  const selectedPackKey = room?.selected_built_in_pack_ids.join('|') ?? ''

  useEffect(() => {
    if (!room || !isRoomSettingsOpen) return

    const builtInSelection = room.selected_built_in_pack_ids
    setSelectedPackIds(builtInSelection.length ? builtInSelection : DEFAULT_BUILT_IN_PACK_IDS)
  }, [isRoomSettingsOpen, room?.room_id, selectedPackKey])

  const builtInPacks = useMemo(() => (
    createBuiltInPackLibrary()
  ), [])

  if (!room) return null
  const currentRoom = room

  const expiresAt = new Date(currentRoom.expires_at)
  const msLeft = expiresAt.getTime() - LOADED_AT
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)))
  const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const isHost = currentRoom.host_player_id === currentPlayerId
  const isCoCreation = currentRoom.mode === 'co-creation'
  const importedPackCount = currentRoom.imported_pack_library.length

  function copyCode() {
    navigator.clipboard.writeText(currentRoom.invite_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('邀请码已复制', 'success')
  }

  function togglePack(packId: string) {
    setSelectedPackIds((current) => (
      current.includes(packId)
        ? current.filter((id) => id !== packId)
        : [...current, packId]
    ))
  }

  function saveSelectedPacks() {
    updateSelectedPacks(selectedPackIds)
  }

  return (
    <Modal open={isRoomSettingsOpen} onClose={closeRoomSettings} title="房间设置" maxWidth={560}>
      <div
        style={{
          background: 'var(--bg-overlay)',
          borderRadius: 'var(--radius-md)',
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{currentRoom.room_name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>邀请码：{currentRoom.invite_code}</div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            background: daysLeft < 1 ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${daysLeft < 1 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}
        >
          <Clock size={13} color={daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)'} />
          <span style={{ fontSize: 12, color: daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>
            房间将在 {daysLeft > 0 ? `${daysLeft} 天 ` : ''}{hoursLeft} 小时后自动删除。
            {daysLeft < 1 ? ' 请尽快导出备份。' : ''}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="label">邀请码</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '4px',
              fontFamily: 'monospace',
              color: 'var(--accent-violet)',
            }}
          >
            {currentRoom.invite_code}
          </div>
          <button className="btn btn-secondary" onClick={copyCode} style={{ minWidth: 88 }}>
            {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <label className="label" style={{ marginBottom: 0 }}>导入功能</label>
          <button
            type="button"
            className={`btn btn-sm ${currentRoom.settings.imports_enabled ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateImportsEnabled(!currentRoom.settings.imports_enabled)}
            disabled={!isHost}
          >
            {currentRoom.settings.imports_enabled ? '已启用' : '未启用'}
          </button>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          {!isHost && '只有房主可以切换导入功能。'}
          {isHost && '启用后：房主可以导入整包和房间备份；所有人都可以从卡包库导入选中的卡牌。'}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <label className="label" style={{ marginBottom: 0 }}>内置卡包启用</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedPackIds(builtInPacks.map((pack) => pack.id))}
              disabled={!isHost || isCoCreation}
            >
              全选
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={saveSelectedPacks}
              disabled={!isHost || isCoCreation || !selectedPackIds.length}
            >
              保存
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {builtInPacks.map((pack) => {
            const checked = selectedPackIds.includes(pack.id)

            return (
              <label
                key={pack.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  border: checked ? '1px solid var(--accent-violet)' : '1px solid var(--border-default)',
                  background: checked ? 'rgba(124,111,222,0.08)' : 'var(--bg-overlay)',
                  cursor: !isHost || isCoCreation ? 'default' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePack(pack.id)}
                  disabled={!isHost || isCoCreation}
                  style={{ marginTop: 2 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {pack.pack_name}
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {pack.cards.length} 张
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {pack.description ?? '未提供简介'}
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
          {!isHost && '只有房主可以调整内置卡包启用状态。'}
          {isHost && isCoCreation && '共创进行中时不能修改内置卡包，请结束当前轮次后再调整。'}
          {isHost && !isCoCreation && '保存后会立即重建未发出的内置牌堆，地图上和手牌中的现有卡不会丢失。'}
          {importedPackCount > 0 && ` 当前房间还保留 ${importedPackCount} 套已导入卡包，可在卡包库查看。`}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
          <label className="label">玩家列表（{currentRoom.players.length}）</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentRoom.players.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-overlay)',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: player.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: player.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {player.nickname}
                {player.is_host && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent-amber)' }}>房主</span>}
              </span>
              <span style={{ fontSize: 11, color: player.is_online ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {player.is_online ? '在线' : '离线'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-danger btn-sm" disabled>
          <Trash2 size={13} /> 删除房间
        </button>
        <button className="btn btn-secondary" onClick={closeRoomSettings}>关闭</button>
      </div>
    </Modal>
  )
}
