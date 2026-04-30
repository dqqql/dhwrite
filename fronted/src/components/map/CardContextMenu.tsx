import React, { useEffect, useRef } from 'react'
import { Edit3, Link2, Maximize2, RotateCcw, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { getCardTypeLabel } from '@/utils/cardTypeConfig'

export function CardContextMenu() {
  const {
    contextMenu,
    setContextMenu,
    room,
    currentPlayerId,
    deleteCard,
    recycleCard,
    triggerRecycleAnimation,
    openEditCardModal,
    startConnection,
    markCardTerritory,
    addToast,
  } = useStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu, setContextMenu])

  if (!contextMenu || !room) return null

  const card = room.map_cards.find((item) => item.id === contextMenu.cardId)
  if (!card) return null

  const isCoCreation = room.mode === 'co-creation'
  const typeLabel = getCardTypeLabel(card.type)
  const isLockedByOther = Boolean(card.locked_by_player_id && card.locked_by_player_id !== currentPlayerId)

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <div style={{ padding: '4px 10px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {typeLabel}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
          {card.title}
        </div>
      </div>

      <div
        className="context-menu__item"
        onClick={() => {
          if (isLockedByOther) {
            addToast(`“${card.title}”正在由 ${card.locked_by} 编辑`, 'warning')
            setContextMenu(null)
            return
          }

          openEditCardModal(card.id)
        }}
      >
        <Edit3 size={13} /> 编辑内容
      </div>

      <div className="context-menu__item" onClick={() => startConnection(card.id)}>
        <Link2 size={13} /> 发起连线
      </div>

      {card.type === 'Location' && (
        <div
          className="context-menu__item"
          onClick={() => {
            if (isLockedByOther) {
              addToast(`“${card.title}”正在由 ${card.locked_by} 编辑`, 'warning')
              setContextMenu(null)
              return
            }

            markCardTerritory(card.id)
          }}
        >
          <Maximize2 size={13} /> 标记范围
        </div>
      )}

      <div className="context-menu__divider" />

      {isCoCreation ? (
        <div
          className="context-menu__item"
          onClick={() => {
            const mapCardElement = document.querySelector<HTMLElement>(`[data-map-card-id="${card.id}"]`)
            const handTargetElement = document.querySelector<HTMLElement>('[data-hand-drop-target="true"]')

            if (mapCardElement && handTargetElement) {
              const fromRect = mapCardElement.getBoundingClientRect()
              const panelRect = handTargetElement.getBoundingClientRect()
              const targetHeight = Math.max(28, Math.min(144, panelRect.height - 12))
              const targetWidth = Math.max(40, Math.min(180, targetHeight * (180 / 144)))
              const toRect = {
                left: panelRect.left + (panelRect.width - targetWidth) / 2,
                top: panelRect.top + (panelRect.height - targetHeight) / 2,
                width: targetWidth,
                height: targetHeight,
              }

              triggerRecycleAnimation(card, {
                left: fromRect.left,
                top: fromRect.top,
                width: fromRect.width,
                height: fromRect.height,
              }, toRect, card.player_color)
            }

            recycleCard(card.id)
          }}
        >
          <RotateCcw size={13} /> 回收至手牌
        </div>
      ) : (
        <div className="context-menu__item context-menu__item--danger" onClick={() => deleteCard(card.id)}>
          <Trash2 size={13} /> 删除卡牌
        </div>
      )}
    </div>
  )
}
