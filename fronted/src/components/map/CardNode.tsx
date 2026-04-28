import React, { useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import type { MapCard } from '@/types'
import { CARD_TYPE_CONFIG } from '@/utils/cardTypeConfig'
import { ChevronDown, ChevronUp, Lock, Maximize2 } from 'lucide-react'
import { GRID_SIZE } from '@/utils/grid'

interface CardNodeProps {
  card: MapCard
  isCurrentPlayer: boolean
  canvasScale: number
}

export function DhCardNode({ card, canvasScale }: CardNodeProps) {
  const {
    room, currentPlayerId, toggleExpandCard, resizeCard,
    lockCard, unlockCard, moveCard, setContextMenu,
  } = useStore()
  const cfg = CARD_TYPE_CONFIG[card.type]
  const currentPlayerName = room?.players.find(p => p.id === currentPlayerId)?.nickname
  const isLocked = !!card.locked_by && card.locked_by !== currentPlayerName

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const resizeStart = useRef<{ mx: number; my: number; scale: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLocked) return
    e.stopPropagation()
    lockCard(card.id)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: card.x, oy: card.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      const dx = (ev.clientX - dragStart.current.mx) / canvasScale
      const dy = (ev.clientY - dragStart.current.my) / canvasScale
      moveCard(card.id, dragStart.current.ox + dx, dragStart.current.oy + dy)
    }
    const onUp = () => {
      unlockCard(card.id)
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [card.id, card.x, card.y, canvasScale, isLocked, lockCard, unlockCard, moveCard])

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLocked) return
    e.stopPropagation()
    lockCard(card.id)
    resizeStart.current = { mx: e.clientX, my: e.clientY, scale: card.grid_scale ?? 1 }

    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return
      const dx = (ev.clientX - resizeStart.current.mx) / canvasScale
      const dy = (ev.clientY - resizeStart.current.my) / canvasScale
      const gridDelta = Math.max(dx / (card.grid_cols * GRID_SIZE), dy / (card.grid_rows * GRID_SIZE))
      const nextScale = Math.max(1, Math.min(4, Math.round(resizeStart.current.scale + gridDelta)))
      resizeCard(card.id, nextScale)
    }

    const onUp = () => {
      unlockCard(card.id)
      resizeStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [
    card.id, card.grid_cols, card.grid_rows, card.grid_scale,
    canvasScale, isLocked, lockCard, resizeCard, unlockCard,
  ])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, cardId: card.id })
  }, [card.id, setContextMenu])

  return (
    <>
      {/* Territory area (Location cards only) */}
      {card.type === 'Location' && card.territory && (
        <div
          style={{
            position: 'absolute',
            left: card.territory.x,
            top: card.territory.y,
            width: card.territory.width,
            height: card.territory.height,
            background: cfg.color,
            opacity: 0.1,
            borderRadius: 0,
            border: `1px dashed ${cfg.color}99`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Card */}
      <div
        className={`dh-card dh-card--${card.type.toLowerCase()} ${isLocked ? 'dh-card--locked' : ''}`}
        style={{
          position: 'absolute',
          left: card.x,
          top: card.y,
          width: card.width,
          height: card.height,
          borderLeft: `4px solid ${cfg.color}`,
          boxShadow: `0 1px 2px rgba(15,23,42,0.12), 0 0 0 2px ${card.player_color}22`,
        }}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
      >
        {/* Player color indicator */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: 0,
          background: card.player_color,
          boxShadow: `0 0 0 1px ${card.player_color}`,
        }} />

        <div style={{ padding: '8px 10px 24px' }}>
          {/* Type badge */}
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 1, fontSize: 9,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>
              <cfg.Icon size={9} /> {cfg.label}
            </span>
          </div>

          {/* Title */}
          <div className="dh-card__title" style={{ paddingRight: 12 }}>
            {card.title}
          </div>

          {/* Content (expanded only) */}
          {card.is_expanded && card.content && (
            <div className="dh-card__content" style={{ marginTop: 6 }}>
              {card.content}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          style={{
            position: 'absolute', bottom: 4, left: 4,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 2,
            display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onClick={e => { e.stopPropagation(); toggleExpandCard(card.id) }}
        >
          {card.is_expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <button
          title={`Grid ${card.grid_cols}x${card.grid_rows} / ${card.grid_scale}x`}
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            cursor: 'nwse-resize',
            color: 'var(--text-secondary)',
            padding: 2,
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={onResizeMouseDown}
          onClick={e => e.stopPropagation()}
        >
          <Maximize2 size={10} />
        </button>

        {/* Locked indicator */}
        {isLocked && (
          <div style={{
            position: 'absolute', top: 4, left: 4,
            background: 'rgba(245,158,11,0.16)', borderRadius: 0, padding: '1px 5px',
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 9, color: 'var(--accent-amber)',
          }}>
            <Lock size={8} /> {card.locked_by}
          </div>
        )}
      </div>
    </>
  )
}
