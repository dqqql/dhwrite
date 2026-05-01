import emberFrontier from './ember-frontier.dhpack.json'
import skyArchipelago from './sky-archipelago.dhpack.json'
import tideRuins from './tide-ruins.dhpack.json'
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
  defineBuiltInPack(emberFrontier, {
    id: 'test-ember-frontier',
    description: '焦土边境上的据点、规则与委托，适合从角色启程开始铺开冲突。',
  }),
  defineBuiltInPack(tideRuins, {
    id: 'test-tide-ruins',
    description: '沉没古城、海上市集与突发事件并存，适合探索、追索和交易线索。',
  }),
  defineBuiltInPack(skyArchipelago, {
    id: 'test-sky-archipelago',
    description: '漂浮群岛、航路秩序与高空异变交织，适合塑造旅程、相遇和灾变前兆。',
  }),
]
