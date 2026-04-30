import React from 'react'
import type { CardType } from '@/types'
import { BookOpen, MapPin, Sparkles, User } from 'lucide-react'

type CardTypeBaseConfig = {
  label: string
  defaultColor: string
  Icon: React.FC<{ size?: number }>
}

export type CardVisualConfig = {
  label: string
  color: string
  bg: string
  border: string
  Icon: React.FC<{ size?: number }>
}

export const CARD_TYPE_CONFIG: Record<CardType, CardTypeBaseConfig> = {
  Location: {
    label: '地点',
    defaultColor: '#22c55e',
    Icon: ({ size = 12 }) => <MapPin size={size} />,
  },
  Feature: {
    label: '特色',
    defaultColor: '#a855f7',
    Icon: ({ size = 12 }) => <Sparkles size={size} />,
  },
  Hook: {
    label: '故事',
    defaultColor: '#3b82f6',
    Icon: ({ size = 12 }) => <BookOpen size={size} />,
  },
  Role: {
    label: '角色卡',
    defaultColor: '#f59e0b',
    Icon: ({ size = 12 }) => <User size={size} />,
  },
}

function hexToRgb(hex: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) return null

  return {
    r: Number.parseInt(match[1].slice(0, 2), 16),
    g: Number.parseInt(match[1].slice(2, 4), 16),
    b: Number.parseInt(match[1].slice(4, 6), 16),
  }
}

function withAlpha(hex: string, alpha: number, fallback: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return fallback
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function getCardTypeLabel(type: CardType): string {
  return CARD_TYPE_CONFIG[type].label
}

export function getCardVisualConfig(type: CardType, accentColor?: string): CardVisualConfig {
  const base = CARD_TYPE_CONFIG[type]
  const color = accentColor ?? base.defaultColor

  return {
    label: base.label,
    color,
    bg: withAlpha(color, 0.12, withAlpha(base.defaultColor, 0.12, 'rgba(15, 23, 42, 0.08)')),
    border: withAlpha(color, 0.28, withAlpha(base.defaultColor, 0.28, 'rgba(15, 23, 42, 0.16)')),
    Icon: base.Icon,
  }
}

export function getCardTypeClass(type: CardType): string {
  return `dh-card--${type.toLowerCase()}`
}
