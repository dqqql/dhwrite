import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Modal } from './Modal'
import { Clock, Copy, Check, Trash2 } from 'lucide-react'

const LOADED_AT = Date.now()

export function RoomSettingsModal() {
  const { room, isRoomSettingsOpen, closeRoomSettings, addToast } = useStore()
  const [copied, setCopied] = useState(false)

  if (!room) return null

  const expiresAt = new Date(room.expires_at)
  const msLeft = expiresAt.getTime() - LOADED_AT
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)))
  const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))

  function copyCode() {
    navigator.clipboard.writeText(room!.invite_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('邀请码已复制！', 'success')
  }

  return (
    <Modal open={isRoomSettingsOpen} onClose={closeRoomSettings} title="房间设置" maxWidth={440}>
      {/* Room info */}
      <div style={{
        background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)',
        padding: 14, marginBottom: 16,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{room.room_name}</div>

        {/* Expiry warning */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          background: daysLeft < 1 ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${daysLeft < 1 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
        }}>
          <Clock size={13} color={daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)'} />
          <span style={{ fontSize: 12, color: daysLeft < 1 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>
            房间将在 {daysLeft > 0 ? `${daysLeft} 天` : ''} {hoursLeft} 小时后自动删除
            {daysLeft < 1 && ' — 请尽快导出备份！'}
          </span>
        </div>
      </div>

      {/* Invite code */}
      <div style={{ marginBottom: 16 }}>
        <label className="label">邀请码</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
            fontSize: 20, fontWeight: 700, letterSpacing: '4px', fontFamily: 'monospace',
            color: 'var(--accent-violet)',
          }}>
            {room.invite_code}
          </div>
          <button className="btn btn-secondary" onClick={copyCode} style={{ minWidth: 80 }}>
            {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
          </button>
        </div>
      </div>

      {/* Players */}
      <div style={{ marginBottom: 20 }}>
        <label className="label">玩家列表（{room.players.length}）</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {room.players.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-overlay)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: p.is_online ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {p.nickname}
                {p.is_host && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent-amber)' }}>房主</span>}
              </span>
              <span style={{ fontSize: 11, color: p.is_online ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {p.is_online ? '在线' : '离线'}
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
