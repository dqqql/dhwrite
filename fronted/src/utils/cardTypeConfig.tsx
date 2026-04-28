import React from 'react'
import type { CardType } from '@/types'
import { MapPin, Users, Sparkles } from 'lucide-react'

export const CARD_TYPE_CONFIG: Record<CardType, {
  label: string
  color: string
  bg: string
  border: string
  Icon: React.FC<{ size?: number }>
}> = {
  Location: {
    label: '地点',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.28)',
    Icon: ({ size = 12 }) => <MapPin size={size} />,
  },
  NPC: {
    label: '人物',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.28)',
    Icon: ({ size = 12 }) => <Users size={size} />,
  },
  Feature: {
    label: '特色',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.28)',
    Icon: ({ size = 12 }) => <Sparkles size={size} />,
  },
}

export function getCardTypeClass(type: CardType): string {
  return `dh-card--${type.toLowerCase()}`
}
