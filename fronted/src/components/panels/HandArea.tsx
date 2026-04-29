import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { getCardVisualConfig } from '@/utils/cardTypeConfig'
import { getCardGridSize } from '@/utils/grid'
import type { DhCard } from '@/types'
import { Plus, Shuffle, ChevronDown, ChevronUp } from 'lucide-react'

export function HandArea() {
  const {
    room, currentPlayerId, isHandPanelOpen, toggleHandPanel,
    drawCards, openCreateCardModal,
  } = useStore()

  if (!room) return null

  const isCoCreation = room.mode === 'co-creation'
  const isMyTurn = room.current_turn_player_id === currentPlayerId
  const hand: DhCard[] = room.hands[currentPlayerId] ?? []

  if (!isCoCreation) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      pointerEvents: 'none',
    }}>
      {/* Hand panel */}
      <div
        className="glass-panel"
        data-hand-drop-target="true"
        style={{
          margin: '0 12px 12px',
          padding: 0,
          overflow: 'hidden',
          pointerEvents: 'all',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          transform: isHandPanelOpen ? 'none' : 'translateY(calc(100% - 44px))',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderBottom: isHandPanelOpen ? '1px solid var(--border-subtle)' : 'none',
            cursor: 'pointer',
          }}
          onClick={toggleHandPanel}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            手牌区
          </span>
          <div style={{
            background: 'rgba(124,111,222,0.15)', color: 'var(--accent-violet)',
            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            border: '1px solid rgba(124,111,222,0.25)',
          }}>
            {hand.length}
          </div>

          {isMyTurn && (
            <div style={{
              marginLeft: 0,
              padding: '2px 10px', borderRadius: 99,
              background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)',
              fontSize: 11, fontWeight: 600, border: '1px solid rgba(16,185,129,0.2)',
            }}>
              ✦ 你的回合
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Actions */}
          {isMyTurn && (
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={drawCards}
                title="抽牌（3选1）"
              >
                <Shuffle size={13} /> 抽牌
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={openCreateCardModal}
                title="自创卡牌"
              >
                <Plus size={13} /> 自创
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => useStore.getState().endTurn()}
              >
                结束回合 →
              </button>
            </div>
          )}

          {isHandPanelOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
        </div>

        {/* Cards */}
        {isHandPanelOpen && (
          <div style={{
            padding: '12px 14px',
            overflowX: 'auto',
            minHeight: 170,
          }}>
            {hand.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, margin: 'auto', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🃏</div>
                <div>手牌为空</div>
                {isMyTurn && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>点击「抽牌」获取新手牌</div>}
              </div>
            ) : (
              <div className="hand-card-row">
                {hand.map((card, idx) => (
                  <HandCard
                    key={card.id}
                    card={card}
                    index={idx}
                    canPlay={isMyTurn}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function HandCard({ card, index, canPlay }: {
  card: DhCard; index: number; canPlay: boolean
}) {
  const cfg = getCardVisualConfig(card.type, card.style)
  const [isDragging, setIsDragging] = useState(false)
  const { beginHandCardDrag, clearHandCardDrag } = useStore()

  return (
    <div
      className="hand-card-shell"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className={`hand-card ${isDragging ? 'hand-card--dragging' : ''}`}
        style={{
          borderTop: `3px solid ${cfg.color}`,
          opacity: canPlay ? 1 : 0.65,
        }}
        draggable={canPlay}
        onDragStart={e => {
          if (!canPlay) return
          setIsDragging(true)
          const rect = e.currentTarget.getBoundingClientRect()
          beginHandCardDrag(card, {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('application/dh-card-id', card.id)
          e.dataTransfer.setData('application/dh-card-type', card.type)
          e.dataTransfer.setData('text/plain', card.title)

          const { width, height } = getCardGridSize(card.type)
          e.dataTransfer.setDragImage(e.currentTarget, width / 2, Math.min(height / 2, e.currentTarget.clientHeight / 2))
        }}
        onDragEnd={() => {
          setIsDragging(false)
          clearHandCardDrag(card.id)
        }}
        title={canPlay ? '拖拽到地图以打出此卡' : '非你的回合，无法打牌'}
      >
        {card.is_custom && (
          <div className="hand-card__custom-badge">
            自创
          </div>
        )}

        <div className="hand-card__body">
          <div className="hand-card__strip" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
            <cfg.Icon size={12} />
            <span>{cfg.label}</span>
          </div>

          <div className="hand-card__title">
            {card.title}
          </div>
        </div>

        <div className="hand-card__hover-detail">
          <div className="hand-card__hover-head">
            <div className="hand-card__hover-title-row">
              <div className="hand-card__hover-title">{card.title}</div>
            </div>
            <span className="hand-card__hover-type" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
              <cfg.Icon size={12} />
              {cfg.label}
            </span>
          </div>
          {card.is_custom && <span className="hand-card__hover-custom">自创</span>}
          <div className="hand-card__hover-content">{card.content || '暂无描述'}</div>
        </div>
      </div>
    </div>
  )
}
