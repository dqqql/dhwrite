import fiveFlagsToFlame from './five-flags-to-flame.dhpack.json'
import oneHundredAdventureReasons from './one-hundred-adventure-reasons.dhpack.json'
import oneHundredStrangeSettings from './one-hundred-strange-settings.dhpack.json'
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
  defineBuiltInPack(oneHundredAdventureReasons, {
    id: 'adventure-reasons-100',
    description: '一百个冒险理由，可作为剧情钩子、任务起点或角色背景灵感。',
  }),
  defineBuiltInPack(oneHundredStrangeSettings, {
    id: 'strange-settings-100',
    description: '100条可直接用于奇幻世界观创作的地点、生态、气候、社会与禁忌设定。',
  }),
]
