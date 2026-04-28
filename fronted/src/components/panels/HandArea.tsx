import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { CARD_TYPE_CONFIG } from '@/utils/cardTypeConfig'
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
            display: 'flex',
            gap: 10,
            padding: '12px 14px',
            overflowX: 'auto',
            minHeight: 170,
            alignItems: 'flex-end',
          }}>
            {hand.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, margin: 'auto', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🃏</div>
                <div>手牌为空</div>
                {isMyTurn && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>点击「抽牌」获取新手牌</div>}
              </div>
            ) : (
              hand.map((card, idx) => (
                <HandCard
                  key={card.id}
                  card={card}
                  index={idx}
                  canPlay={isMyTurn}
                />
              ))
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
  const cfg = CARD_TYPE_CONFIG[card.type]
  const [isDragging, setIsDragging] = useState(false)
  const onPlay = () => {}

  return (
    <div
      className={`hand-card ${isDragging ? 'hand-card--dragging' : ''}`}
      style={{
        borderTop: `3px solid ${cfg.color}`,
        opacity: canPlay ? 1 : 0.65,
        animationDelay: `${index * 40}ms`,
      }}
      draggable={canPlay}
      onDragStart={e => {
        if (!canPlay) return
        setIsDragging(true)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/dh-card-id', card.id)
        e.dataTransfer.setData('text/plain', card.title)
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={() => { if (canPlay) onPlay() }}
      title={canPlay ? '点击打出此卡' : '非你的回合，无法打牌'}
    >
      {/* Custom badge */}
      {card.is_custom && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          fontSize: 9, fontWeight: 700, color: 'var(--accent-amber)',
          background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: 3,
        }}>
          自创
        </div>
      )}

      {/* Type badge */}
      <div style={{ marginBottom: 6 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 6px', borderRadius: 99, fontSize: 9,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
          <cfg.Icon size={9} /> {cfg.label}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
        color: 'var(--text-primary)',
        fontFamily: '"Noto Sans SC", sans-serif',
        marginBottom: 5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {card.title}
      </div>

      {/* Content preview */}
      <div style={{
        fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5,
        fontFamily: '"Noto Sans SC", sans-serif',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {card.content}
      </div>

      {/* Play hint */}
      {canPlay && (
        <div style={{
          marginTop: 8, fontSize: 10, color: cfg.color, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          ▶ 点击打出
        </div>
      )}
    </div>
  )
}
