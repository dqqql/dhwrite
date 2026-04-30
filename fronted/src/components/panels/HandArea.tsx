import React, { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { getCardVisualConfig } from '@/utils/cardTypeConfig'
import { getCardGridSize } from '@/utils/grid'
import { getCardBodyLines } from '@/utils/cardText'
import type { DeckCardType, DhCard } from '@/types'
import { Plus, Shuffle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const CATEGORY_ORDER: DeckCardType[] = ['Location', 'Feature', 'Hook']

export function HandArea() {
  const {
    room, currentPlayerId, isHandPanelOpen, toggleHandPanel,
    drawCards, openCreateCardModal,
  } = useStore()

  if (!room) return null

  const isCoCreation = room.mode === 'co-creation'
  const isMyTurn = room.current_turn_player_id === currentPlayerId
  const hand: DhCard[] = room.hands[currentPlayerId] ?? []

  const roleCard = hand.find((card) => card.type === 'Role') ?? null
  const groupedCards = useMemo(
    () => Object.fromEntries(
      CATEGORY_ORDER.map((type) => [type, hand.filter((card) => card.type === type)]),
    ) as Record<DeckCardType, DhCard[]>,
    [hand],
  )
  const roleCardAlreadyOnMap = room.map_cards.some(
    (card) => card.type === 'Role' && card.placed_by_player_id === currentPlayerId,
  )

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
              padding: '2px 10px', borderRadius: 99,
              background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)',
              fontSize: 11, fontWeight: 600, border: '1px solid rgba(16,185,129,0.2)',
            }}>
              你的回合
            </div>
          )}

          <div style={{ flex: 1 }} />

          {isMyTurn && (
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={drawCards}
                title="从三类卡牌中各揭示一张，再三选一加入手牌"
              >
                <Shuffle size={13} /> 抽牌
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={openCreateCardModal}
                title="创建一张自定义卡牌"
              >
                <Plus size={13} /> 自创
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => useStore.getState().endTurn()}
              >
                结束回合
              </button>
            </div>
          )}

          {isHandPanelOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
        </div>

        {isHandPanelOpen && (
          <div style={{ padding: '12px 14px', overflowX: 'auto' }}>
            <div className="hand-layout-grid">
              <div className="hand-column hand-column--role">
                <div className="hand-column__header hand-column__header--role">
                  <span>角色卡</span>
                  <span className="hand-column__count">{roleCard ? 1 : 0}</span>
                </div>
                <div className="hand-column__body hand-column__body--role">
                  {roleCard ? (
                    <HandCard card={roleCard} index={0} canPlay={isMyTurn} isRoleSpecial />
                  ) : (
                    <div className="hand-empty-card hand-empty-card--role">
                      <div className="hand-empty-card__icon"><Sparkles size={16} /></div>
                      <div>{roleCardAlreadyOnMap ? '角色卡已上场' : '本轮暂无角色卡'}</div>
                      <div className="hand-empty-card__hint">
                        {roleCardAlreadyOnMap ? '你的角色已经进入地图，可继续围绕它连线和补充信息。' : '开始新一轮共创时会自动补发。'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {CATEGORY_ORDER.map((type) => (
                <div key={type} className="hand-column">
                  <CategoryColumn
                    type={type}
                    cards={groupedCards[type]}
                    canPlay={isMyTurn}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryColumn({ type, cards, canPlay }: { type: DeckCardType; cards: DhCard[]; canPlay: boolean }) {
  const cfg = getCardVisualConfig(type)

  return (
    <>
      <div className="hand-column__header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <cfg.Icon size={12} />
          {cfg.label}
        </span>
        <span className="hand-column__count">{cards.length}</span>
      </div>
      <div className="hand-column__body">
        {cards.length === 0 ? (
          <div className="hand-empty-card">
            <div>当前没有这类手牌</div>
            <div className="hand-empty-card__hint">抽牌时会从三类中各展示一张，你可以继续补充这一栏。</div>
          </div>
        ) : (
          <div className="hand-column__cards">
            {cards.map((card, index) => (
              <HandCard
                key={card.id}
                card={card}
                index={index}
                canPlay={canPlay}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function HandCard({ card, index, canPlay, isRoleSpecial = false }: {
  card: DhCard
  index: number
  canPlay: boolean
  isRoleSpecial?: boolean
}) {
  const cfg = getCardVisualConfig(card.type, card.style)
  const [isDragging, setIsDragging] = useState(false)
  const { beginHandCardDrag, clearHandCardDrag } = useStore()
  const bodyLines = getCardBodyLines(card)

  return (
    <div
      className="hand-card-shell"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className={`hand-card ${isDragging ? 'hand-card--dragging' : ''} ${isRoleSpecial ? 'hand-card--role' : ''}`}
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
        title={canPlay ? '拖拽到地图以打出这张卡牌' : '非你的回合，暂时不能打牌'}
      >
        {card.is_custom && (
          <div className="hand-card__custom-badge">
            自创
          </div>
        )}

        {isRoleSpecial && (
          <div className="hand-card__special-badge">
            特殊
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
          {isRoleSpecial && <span className="hand-card__hover-custom">特殊角色卡</span>}
          <div className="hand-card__hover-content">
            {bodyLines.length ? bodyLines.map((line, lineIndex) => <div key={`${lineIndex}-${line}`}>{line}</div>) : '暂无描述'}
          </div>
        </div>
      </div>
    </div>
  )
}
