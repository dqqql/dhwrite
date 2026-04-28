import type { CardType, DhPack } from './types'

const CARD_TYPES: CardType[] = ['Location', 'NPC', 'Feature']

export function isCardType(value: unknown): value is CardType {
  return typeof value === 'string' && CARD_TYPES.includes(value as CardType)
}

export function assertDhPack(value: unknown): DhPack {
  if (!value || typeof value !== 'object') {
    throw new Error('Pack must be an object')
  }

  const pack = value as Partial<DhPack>
  if (pack.format !== 'dhpack') throw new Error('Pack format must be "dhpack"')
  if (pack.version !== 1) throw new Error('Pack version must be 1')
  if (typeof pack.pack_name !== 'string' || !pack.pack_name.trim()) {
    throw new Error('Pack name is required')
  }
  if (!Array.isArray(pack.cards)) throw new Error('Pack cards must be an array')

  for (const [index, card] of pack.cards.entries()) {
    if (!card || typeof card !== 'object') throw new Error(`Card ${index} must be an object`)
    if (!isCardType(card.type)) throw new Error(`Card ${index} has invalid type`)
    if (typeof card.title !== 'string' || !card.title.trim()) throw new Error(`Card ${index} title is required`)
    if (typeof card.content !== 'string') throw new Error(`Card ${index} content is required`)
    if (typeof card.style !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(card.style)) {
      throw new Error(`Card ${index} style must be a hex color`)
    }
  }

  return pack as DhPack
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error('Invalid JSON')
  }
}
