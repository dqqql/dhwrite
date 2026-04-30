import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Modal } from './Modal'
import type { DeckCardType } from '@/types'

const TYPES: DeckCardType[] = ['Location', 'Feature', 'Hook']
const TYPE_LABELS: Record<DeckCardType, string> = {
  Location: '名称和地理特征',
  Feature: '特色和特殊效果',
  Hook: '故事引子',
}
const TYPE_COLORS: Record<DeckCardType, string> = {
  Location: '#22c55e',
  Feature: '#a855f7',
  Hook: '#3b82f6',
}

export function CreateCardModal() {
  const { isCreateCardModalOpen, closeCreateCardModal, createCustomCard } = useStore()
  const [type, setType] = useState<DeckCardType>('Hook')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createCustomCard({
      type, title: title.trim(), content: content.trim(),
      style: TYPE_COLORS[type], is_custom: true,
    })
    setTitle(''); setContent(''); setType('Hook')
  }

  return (
    <Modal open={isCreateCardModalOpen} onClose={closeCreateCardModal} title="自创卡牌" maxWidth={440}>
      <form onSubmit={handleSubmit}>
        {/* Type selector */}
        <div style={{ marginBottom: 16 }}>
          <label className="label">卡牌类型</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {TYPES.map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${type === t ? TYPE_COLORS[t] : 'var(--border-default)'}`,
                  background: type === t ? `${TYPE_COLORS[t]}18` : 'var(--bg-overlay)',
                  color: type === t ? TYPE_COLORS[t] : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label className="label">标题</label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="输入卡牌名称…"
            maxLength={30}
            required
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">描述</label>
          <textarea
            className="input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="输入描述文字…"
            rows={4}
          />
        </div>

        {/* Preview */}
        {title && (
          <div style={{
            marginBottom: 20, padding: 12,
            background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)',
            border: `1px solid ${TYPE_COLORS[type]}44`,
            borderTop: `3px solid ${TYPE_COLORS[type]}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: TYPE_COLORS[type], textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {TYPE_LABELS[type]} · 预览
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontFamily: '"Noto Sans SC", sans-serif' }}>
              {title}
            </div>
            {content && (
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.65, fontFamily: '"Noto Sans SC", sans-serif' }}>
                {content}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={closeCreateCardModal}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>创建并加入手牌</button>
        </div>
      </form>
    </Modal>
  )
}
