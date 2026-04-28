import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Plus, LogIn, AlertTriangle } from 'lucide-react'

interface LandingPageProps {
  onEnterRoom: () => void
}

export function LandingPage({ onEnterRoom }: LandingPageProps) {
  const { initRoom, addToast } = useStore()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [roomName, setRoomName] = useState('')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) { addToast('请输入昵称', 'error'); return }
    initRoom()
    onEnterRoom()
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) { addToast('请输入昵称', 'error'); return }
    if (!inviteCode.trim()) { addToast('请输入邀请码', 'error'); return }
    // TODO: Validate invite code with backend
    initRoom()
    addToast('以演示模式加入房间（后端接入后将验证邀请码）', 'info')
    onEnterRoom()
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      background: 'var(--bg-base)',
      backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }}>
      {/* Glow orbs */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,111,222,0.12) 0%, transparent 70%)',
        top: '10%', left: '20%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(88,101,242,0.10) 0%, transparent 70%)',
        bottom: '10%', right: '15%', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 0,
            background: 'var(--accent-violet)',
            marginBottom: 16, boxShadow: '0 8px 24px rgba(37,99,235,0.18)',
            fontSize: 28, fontWeight: 800, color: 'white',
          }}>
            匕
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 6 }}>
            匕首之心
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
            团前共创工具 · 多人卡牌地图协作
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: 'var(--bg-base)', borderRadius: 0, padding: 3 }}>
            {(['create', 'join'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 0,
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit',
                  background: tab === t ? 'var(--bg-elevated)' : 'transparent',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {t === 'create' ? '创建房间' : '加入房间'}
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
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="德利安之墓 · 团前准备"
                  maxLength={40}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="label">你的昵称</label>
                <input
                  className="input"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="输入你的昵称…"
                  maxLength={20}
                  required
                />
              </div>

              {/* 3-day warning */}
              <div style={{
                display: 'flex', gap: 6, alignItems: 'flex-start',
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                marginBottom: 18, fontSize: 12, color: 'var(--accent-amber)', lineHeight: 1.5,
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>房间仅临时保存 <strong>3 天</strong>，到期自动删除。请及时导出备份。</span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={15} /> 创建房间并进入
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">邀请码</label>
                <input
                  className="input"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="输入 6 位邀请码…"
                  maxLength={6}
                  style={{ letterSpacing: '4px', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', textAlign: 'center' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="label">你的昵称</label>
                <input
                  className="input"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="输入你的昵称…"
                  maxLength={20}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <LogIn size={15} /> 加入房间
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          基于《匕首之心》TTRPG · 当前为演示模式
        </div>
      </div>
    </div>
  )
}
