import type { CardType } from './types'

export const GRID_SIZE = 24

export const CARD_GRID_SIZE: Record<CardType, { cols: number; rows: number }> = {
  Location: { cols: 9, rows: 6 },
  NPC: { cols: 7, rows: 5 },
  Feature: { cols: 8, rows: 5 },
}

export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function getCardGridSize(type: CardType, scale = 1) {
  const base = CARD_GRID_SIZE[type]
  const gridScale = Math.max(1, Math.round(scale))

  return {
    grid_cols: base.cols,
    grid_rows: base.rows,
    grid_scale: gridScale,
    width: base.cols * gridScale * GRID_SIZE,
    height: base.rows * gridScale * GRID_SIZE,
  }
}
