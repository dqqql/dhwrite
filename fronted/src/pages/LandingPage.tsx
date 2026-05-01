import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { AlertTriangle, LogIn, Plus } from 'lucide-react'

interface LandingPageProps {
  onEnterRoom: () => void
}

export function LandingPage({ onEnterRoom }: LandingPageProps) {
  const { createRoom, joinRoom, isEnteringRoom, addToast } = useStore()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [roomName, setRoomName] = useState('')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()

    if (!nickname.trim()) {
      addToast('请输入你的昵称', 'error')
      return
    }

    const entered = await createRoom({
      nickname,
      roomName,
    })

    if (entered) onEnterRoom()
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault()

    if (!nickname.trim()) {
      addToast('请输入你的昵称', 'error')
      return
    }

    if (!inviteCode.trim()) {
      addToast('请输入邀请码', 'error')
      return
    }

    const entered = await joinRoom({
      inviteCode,
      nickname,
    })

    if (entered) onEnterRoom()
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,111,222,0.12) 0%, transparent 70%)',
          top: '10%',
          left: '20%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88,101,242,0.10) 0%, transparent 70%)',
          bottom: '10%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 0,
              background: 'linear-gradient(135deg, var(--accent-violet), #3b82f6)',
              marginBottom: 20,
              boxShadow: '0 12px 32px -8px rgba(37,99,235,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
              fontSize: 32,
              fontWeight: 800,
              color: 'white',
            }}
          >
            匕
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
            匕首之心
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', letterSpacing: '0.01em', fontWeight: 500 }}>
            团前共创工具 · 多人卡牌地图协作
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 32 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'var(--bg-overlay)', borderRadius: 0, padding: 4 }}>
            {(['create', 'join'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 0,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: tab === value ? 'var(--bg-elevated)' : 'transparent',
                  color: tab === value ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                  boxShadow: tab === value ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {value === 'create' ? '创建房间' : '加入房间'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">房间名称</label>
                <input
                  className="input"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="德利安之境 · 团前准备"
                  maxLength={40}
                  disabled={isEnteringRoom}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="label">你的昵称</label>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="输入你的昵称"
                  maxLength={20}
                  disabled={isEnteringRoom}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  marginBottom: 18,
                  fontSize: 12,
                  color: 'var(--accent-amber)',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>创建房间后默认启用全部内置卡包。房间适合临时共创，最多保留 3 天，到期会自动删除；建议每次完成后立即导出房间备份。</span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isEnteringRoom}>
                <Plus size={15} /> {isEnteringRoom ? '连接中…' : '创建房间并进入'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">邀请码</label>
                <input
                  className="input"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="输入 6 位邀请码"
                  maxLength={6}
                  style={{ letterSpacing: '4px', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', textAlign: 'center' }}
                  disabled={isEnteringRoom}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="label">你的昵称</label>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="输入你的昵称"
                  maxLength={20}
                  disabled={isEnteringRoom}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isEnteringRoom}>
                <LogIn size={15} /> {isEnteringRoom ? '连接中…' : '加入房间'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          基于《匕首之心》TRPG · 多人共创与地图协作
        </div>
      </div>
    </div>
  )
}
