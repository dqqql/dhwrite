import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Modal } from './Modal'

interface InviteCodeModalProps {
  open: boolean
  inviteCode: string
  roomName: string
  onClose: () => void
  onCopied?: () => void
}

export function InviteCodeModal({
  open,
  inviteCode,
  roomName,
  onClose,
  onCopied,
}: InviteCodeModalProps) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      onCopied?.()
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="分享邀请码" maxWidth={420}>
      <div
        style={{
          background: 'var(--bg-overlay)',
          borderRadius: 'var(--radius-md)',
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          {roomName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          把下面的邀请码发给队友，对方输入后就能加入当前房间。
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label className="label">邀请码</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '4px',
              fontFamily: 'monospace',
              color: 'var(--accent-violet)',
              textAlign: 'center',
            }}
          >
            {inviteCode}
          </div>
          <button className="btn btn-secondary" onClick={copyCode} style={{ minWidth: 92 }}>
            {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          关闭
        </button>
      </div>
    </Modal>
  )
}
