import React, { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { Trash2, RotateCcw, Edit3 } from 'lucide-react'

export function CardContextMenu() {
  const { contextMenu, setContextMenu, room, deleteCard, recycleCard, addToast } = useStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu, setContextMenu])

  if (!contextMenu || !room) return null

  const card = room.map_cards.find(c => c.id === contextMenu.cardId)
  if (!card) return null

  const isCoCreation = room.mode === 'co-creation'

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {/* Card title header */}
      <div style={{ padding: '4px 10px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {card.type === 'Location' ? '地点' : card.type === 'NPC' ? '人物' : '特色'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
          {card.title}
        </div>
      </div>

      <div className="context-menu__item" onClick={() => { addToast('编辑功能开发中', 'info'); setContextMenu(null) }}>
        <Edit3 size={13} /> 编辑内容
      </div>

      <div className="context-menu__divider" />

      {isCoCreation ? (
        <div className="context-menu__item" onClick={() => recycleCard(card.id)}>
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
