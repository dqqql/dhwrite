import fiveFlagsToFlame from './five-flags-to-flame.dhpack.json'
import { assertDhPack } from '../validators'
import type { DhPack } from '../types'

export interface BuiltInPack extends DhPack {
  id: string
  description?: string
}

function defineBuiltInPack(
  value: unknown,
  fallback: { id: string; description?: string },
): BuiltInPack {
  const pack = assertDhPack(value)
  const id = typeof pack.id === 'string' && pack.id.trim() ? pack.id.trim() : fallback.id
  const description = typeof pack.description === 'string' && pack.description.trim()
    ? pack.description.trim()
    : fallback.description

  return {
    ...pack,
    id,
    ...(description ? { description } : {}),
  }
}

export const BUILT_IN_PACKS: BuiltInPack[] = [
  defineBuiltInPack(fiveFlagsToFlame, {
    id: 'campaign-five-flags-to-flame',
    description: '官方战役框架提取版，聚焦边境停战、五国角力、神权断层与魔导革命。',
  }),
]
