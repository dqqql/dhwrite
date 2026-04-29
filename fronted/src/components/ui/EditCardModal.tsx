import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Modal } from './Modal'

const TYPE_LABELS = {
  Location: '地点',
  NPC: '人物',
  Feature: '特色',
} as const

export function EditCardModal() {
  const {
    room,
    currentPlayerId,
    isEditCardModalOpen,
    editingCardId,
    closeEditCardModal,
    editCard,
    lockCard,
    unlockCard,
  } = useStore()

  const card = useMemo(
    () => room?.map_cards.find((item) => item.id === editingCardId) ?? null,
    [editingCardId, room],
  )

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [style, setStyle] = useState('#2563eb')
  const lockedCardIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editingCardId || !isEditCardModalOpen) return

    const latestCard = useStore.getState().room?.map_cards.find((item) => item.id === editingCardId)
    if (!latestCard) return

    setTitle(latestCard.title)
    setContent(latestCard.content)
    setStyle(latestCard.style)
  }, [editingCardId, isEditCardModalOpen])

  useEffect(() => {
    if (!editingCardId || !isEditCardModalOpen) return

    lockedCardIdRef.current = editingCardId

    const latestCard = useStore.getState().room?.map_cards.find((item) => item.id === editingCardId)
    if (latestCard?.locked_by_player_id !== currentPlayerId) {
      lockCard(editingCardId)
    }

    return () => {
      const lockedCardId = lockedCardIdRef.current
      if (!lockedCardId) return

      const currentCard = useStore.getState().room?.map_cards.find((item) => item.id === lockedCardId)
      if (currentCard?.locked_by_player_id === currentPlayerId) {
        unlockCard(lockedCardId)
      }

      lockedCardIdRef.current = null
    }
  }, [currentPlayerId, editingCardId, isEditCardModalOpen, lockCard, unlockCard])

  if (!card) return null
  const activeCard = card

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    editCard(activeCard.id, {
      title: title.trim(),
      content: content.trim(),
      style,
    })
  }

  return (
    <Modal
      open={isEditCardModalOpen}
      onClose={closeEditCardModal}
      title={`编辑${TYPE_LABELS[activeCard.type]}卡`}
      maxWidth={520}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label className="label">标题</label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="输入卡牌标题"
            maxLength={30}
            required
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">描述</label>
          <textarea
            className="input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="输入描述内容"
            rows={5}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">展示色</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="color"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              style={{
                width: 42,
                height: 42,
                border: '1px solid var(--border-default)',
                background: 'transparent',
                padding: 2,
                cursor: 'pointer',
              }}
            />
            <input
              className="input"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              placeholder="#2563eb"
              maxLength={7}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: 14,
            border: `1px solid ${style}55`,
            borderLeft: `4px solid ${style}`,
            background: 'var(--bg-overlay)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            预览
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {title || '未命名卡牌'}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {content || '暂无描述'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={closeEditCardModal}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
            保存修改
          </button>
        </div>
      </form>
    </Modal>
  )
}
