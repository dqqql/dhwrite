import React, { useRef, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { DhCardNode } from './CardNode'
import { CardContextMenu } from './CardContextMenu'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { GRID_SIZE, snapToGrid } from '@/utils/grid'

export function MapCanvas() {
  const { room, setContextMenu, playCard } = useStore()

  // Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const isPanning = useRef(false)
  const [isPanningActive, setIsPanningActive] = useState(false)
  const panStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Panning
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 0) return
    // Only pan on middle-button or when holding space / on background
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).dataset.canvas === 'true')) {
      isPanning.current = true
      setIsPanningActive(true)
      panStart.current = { mx: e.clientX, my: e.clientY, tx: transform.x, ty: transform.y }
      e.preventDefault()
    }
  }, [transform])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.mx
    const dy = e.clientY - panStart.current.my
    setTransform(t => ({ ...t, x: panStart.current.tx + dx, y: panStart.current.ty + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    isPanning.current = false
    setIsPanningActive(false)
  }, [])

  // Zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(t => {
      const newScale = Math.min(3, Math.max(0.2, t.scale * factor))
      // Zoom towards cursor
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { ...t, scale: newScale }
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      return {
        scale: newScale,
        x: cx - (cx - t.x) * (newScale / t.scale),
        y: cy - (cy - t.y) * (newScale / t.scale),
      }
    })
  }, [])

  // Zoom controls
  const zoomIn  = () => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.25) }))
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * 0.8) }))
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 })

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/dh-card-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    const cardId = e.dataTransfer.getData('application/dh-card-id')
    if (!cardId || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const worldX = (e.clientX - rect.left - transform.x) / transform.scale
    const worldY = (e.clientY - rect.top - transform.y) / transform.scale
    playCard(cardId, snapToGrid(worldX), snapToGrid(worldY))
  }, [playCard, transform])

  const bgPos = `${transform.x % (GRID_SIZE * transform.scale)}px ${transform.y % (GRID_SIZE * transform.scale)}px`
  const bgSize = `${GRID_SIZE * transform.scale}px ${GRID_SIZE * transform.scale}px`

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
        backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: bgSize,
        backgroundPosition: bgPos,
        cursor: isPanningActive ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={e => { e.preventDefault(); setContextMenu(null) }}
    >
      {/* Canvas world */}
      <div
        data-canvas="true"
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: 4000,
          height: 3000,
        }}
      >
        {/* Annotations */}
        {room?.annotations.map(ann => (
          <div
            key={ann.id}
            style={{
              position: 'absolute',
              left: ann.x,
              top: ann.y,
              fontSize: ann.font_size,
              color: 'var(--text-secondary)',
              fontWeight: 500,
              pointerEvents: 'none',
              letterSpacing: '0.02em',
              fontFamily: '"Noto Sans SC", sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            {ann.text}
          </div>
        ))}

        {/* SVG connections */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <marker id="arrow-red"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--conn-conflict)" />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--conn-ally)" />
            </marker>
            <marker id="arrow-gray"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--conn-unknown)" />
            </marker>
          </defs>

          {room?.connections.map(conn => {
            const from = room.map_cards.find(c => c.id === conn.from_card_id)
            const to   = room.map_cards.find(c => c.id === conn.to_card_id)
            if (!from || !to) return null

            const x1 = from.x + from.width / 2
            const y1 = from.y + from.height / 2
            const x2 = to.x + to.width / 2
            const y2 = to.y + to.height / 2

            const strokeColor = conn.color === 'red' ? 'var(--conn-conflict)'
              : conn.color === 'green' ? 'var(--conn-ally)' : 'var(--conn-unknown)'
            const markerId = `arrow-${conn.color}`

            // Cubic bezier midpoint
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2

            return (
              <g key={conn.id}>
                <path
                  d={`M ${x1} ${y1} Q ${mx} ${my - 40} ${x2} ${y2}`}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeOpacity="0.7"
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
                {conn.label && (
                  <text
                    x={mx} y={my - 48}
                    textAnchor="middle"
                    fontSize="10"
                    fill={strokeColor}
                    fontFamily="'Noto Sans SC', sans-serif"
                    fontWeight="600"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Cards */}
        {room?.map_cards.map(card => (
          <DhCardNode
            key={card.id}
            card={card}
            canvasScale={transform.scale}
            isCurrentPlayer={card.placed_by === room.players.find(p => p.id === room.current_turn_player_id)?.nickname}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { Icon: ZoomIn,   action: zoomIn,   title: '放大' },
          { Icon: ZoomOut,  action: zoomOut,  title: '缩小' },
          { Icon: Maximize2, action: resetView, title: '重置视图' },
        ].map(({ Icon, action, title }) => (
          <button
            key={title}
            title={title}
            className="btn btn-secondary btn-icon"
            style={{ background: 'var(--bg-elevated)' }}
            onClick={action}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Scale indicator */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-elevated)',
        padding: '3px 10px', borderRadius: 2, fontSize: 11,
        color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
      }}>
        {Math.round(transform.scale * 100)}% · 中键拖拽平移 · 滚轮缩放
      </div>

      {/* Context menu */}
      <CardContextMenu />
    </div>
  )
}
