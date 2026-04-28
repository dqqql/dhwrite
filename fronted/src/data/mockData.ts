import { nanoid } from 'nanoid'
import type { DhCard, MapCard, Player, RoomState } from '@/types'
import { getCardGridSize } from '@/utils/grid'

// ── PLAYER COLORS ─────────────────────────────────────────────────
export const PLAYER_COLORS = [
  '#f43f5e', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#06b6d4'
]

// ── MOCK PLAYERS ──────────────────────────────────────────────────
export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', nickname: '幽影GM', color: '#f43f5e', is_host: true,  is_online: true  },
  { id: 'p2', nickname: '剑舞者',  color: '#3b82f6', is_host: false, is_online: true  },
  { id: 'p3', nickname: '星织师',  color: '#f59e0b', is_host: false, is_online: true  },
  { id: 'p4', nickname: '暗刃',    color: '#10b981', is_host: false, is_online: false },
]

// ── MOCK DECK CARDS ───────────────────────────────────────────────
const DECK_CARDS: Omit<DhCard, 'id' | 'is_custom'>[] = [
  // Locations
  { type: 'Location', title: '碎镜城', content: '曾经繁荣的魔法大城，如今因"镜裂事件"而荒废。城中到处是破碎的魔法水晶，折射出奇异的光景。传说深夜仍可听到水晶碎裂的回声。', style: '#22c55e' },
  { type: 'Location', title: '幽暗森林', content: '覆盖半个大陆的古老森林，树冠遮天蔽日，内部永远昏暗。居住着各种神秘生物，以及流亡的精灵部落。', style: '#22c55e' },
  { type: 'Location', title: '铁血要塞', content: '扼守北方山口的军事要塞，已有三百年历史。多次易手，现由"钢爪佣兵团"驻守。城墙上刻满历代守将的名字。', style: '#22c55e' },
  { type: 'Location', title: '深渊港', content: '建于悬崖之上的秘密港口，走私商人和亡命之徒的天堂。港口下方是无底的黑色海洋，据说是连接冥界的入口。', style: '#22c55e' },
  { type: 'Location', title: '遗忘圣殿', content: '被沙漠掩埋的古代神殿，最近被考古队发现。内部的祭坛仍在燃烧，但已无人知晓其供奉的神明。', style: '#22c55e' },
  // NPCs
  { type: 'NPC', title: '影瞳女皇', content: '统治帝国五十年的神秘女皇，据说从不露面，通过无数替身处理政务。真正的她究竟在哪里，无人知晓。', style: '#3b82f6' },
  { type: 'NPC', title: '断剑骑士', content: '背负失败之名的前圣骑士，剑断于最后一场战役。现以雇佣兵身份游荡，内心深处仍渴望救赎。', style: '#3b82f6' },
  { type: 'NPC', title: '织梦巫婆', content: '能进入他人梦境的神秘老妇，在集市角落售卖梦境。她所知道的秘密足以颠覆三个王国。', style: '#3b82f6' },
  { type: 'NPC', title: '红面商人', content: '脸上总戴着红色面具的神秘商人，声称能买卖任何东西——包括记忆、寿命和灵魂。', style: '#3b82f6' },
  { type: 'NPC', title: '铁面审判官', content: '帝国秘密审判庭的首席法官，以铁面无私著称。但据说他的判决背后隐藏着不为人知的私人恩怨。', style: '#3b82f6' },
  // Features
  { type: 'Feature', title: '裂痕之歌', content: '一首能打开维度裂缝的古老乐曲，残缺的乐谱分散于世界各地。据说完整演奏会召唤远古邪神。', style: '#a855f7' },
  { type: 'Feature', title: '黑市拍卖', content: '每月月圆之夜在秘密地点举行，拍卖的物品从禁术书籍到被封印的神器不等。入场需要特殊邀请函。', style: '#a855f7' },
  { type: 'Feature', title: '血契盟约', content: '一种古老的魔法契约，签订者的命运将永远相连。违约者会遭受与伤害对方同等的反噬。', style: '#a855f7' },
  { type: 'Feature', title: '星坠预言', content: '三百年前的预言家留下的神秘预言，预言一颗星辰坠落将引发世界的重组。最近夜空中出现了异常的流星。', style: '#a855f7' },
  { type: 'Feature', title: '遗落技艺', content: '失传已久的古代铸造工艺，能制造出不受魔法影响的武器。只有一位老匠人还记得部分秘诀。', style: '#a855f7' },
]

function makeCard(base: Omit<DhCard, 'id' | 'is_custom'>): DhCard {
  return { ...base, id: nanoid(), is_custom: false }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── MOCK MAP CARDS ────────────────────────────────────────────────
const MOCK_MAP_CARDS: MapCard[] = [
  {
    id: 'mc1', type: 'Location', title: '碎镜城', content: '曾经繁荣的魔法大城，如今因"镜裂事件"而荒废。城中到处是破碎的魔法水晶。',
    style: '#22c55e', is_custom: false, x: 120, y: 72, ...getCardGridSize('Location'),
    placed_by: '幽影GM', player_color: '#f43f5e', is_expanded: false,
    territory: { x: 48, y: 24, width: 336, height: 240 }
  },
  {
    id: 'mc2', type: 'NPC', title: '影瞳女皇', content: '统治帝国五十年的神秘女皇，据说从不露面，通过无数替身处理政务。',
    style: '#3b82f6', is_custom: false, x: 432, y: 72, ...getCardGridSize('NPC'),
    placed_by: '剑舞者', player_color: '#3b82f6', is_expanded: false,
  },
  {
    id: 'mc3', type: 'Feature', title: '裂痕之歌', content: '一首能打开维度裂缝的古老乐曲，残缺的乐谱分散于世界各地。',
    style: '#a855f7', is_custom: false, x: 288, y: 288, ...getCardGridSize('Feature'),
    placed_by: '星织师', player_color: '#f59e0b', is_expanded: false,
  },
  {
    id: 'mc4', type: 'NPC', title: '断剑骑士', content: '背负失败之名的前圣骑士，剑断于最后一场战役。现以雇佣兵身份游荡。',
    style: '#3b82f6', is_custom: false, x: 624, y: 216, ...getCardGridSize('NPC'),
    placed_by: '幽影GM', player_color: '#f43f5e', is_expanded: false,
  },
]

// ── INITIAL ROOM STATE ────────────────────────────────────────────
export function createMockRoomState(currentPlayerId = 'p1'): RoomState {
  const deck = shuffle(DECK_CARDS.map(makeCard))
  // deal 5 cards to each online player
  const hands: Record<string, DhCard[]> = {}
  let deckIdx = 0
  for (const p of MOCK_PLAYERS) {
    if (p.is_online) {
      hands[p.id] = deck.slice(deckIdx, deckIdx + 5)
      deckIdx += 5
    } else {
      hands[p.id] = []
    }
  }
  const remaining = deck.slice(deckIdx)

  return {
    room_id: 'room-mock-01',
    room_name: '德利安之墓 · 团前共创',
    invite_code: 'DAGR7F',
    expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    mode: 'co-creation',
    host_player_id: 'p1',
    current_turn_player_id: currentPlayerId,
    turn_order: ['p1', 'p2', 'p3', 'p4'],
    players: MOCK_PLAYERS,
    hands,
    map_cards: MOCK_MAP_CARDS,
    connections: [
      { id: 'conn1', from_card_id: 'mc1', to_card_id: 'mc2', color: 'red',   label: '敌对' },
      { id: 'conn2', from_card_id: 'mc2', to_card_id: 'mc4', color: 'green', label: '效忠' },
      { id: 'conn3', from_card_id: 'mc3', to_card_id: 'mc1', color: 'gray',  label: '传闻' },
    ],
    annotations: [
      { id: 'ann1', text: '战役核心冲突', x: 300, y: 30, font_size: 14 },
    ],
    deck_remaining: remaining.length,
  }
}

export { shuffle, makeCard, DECK_CARDS }
