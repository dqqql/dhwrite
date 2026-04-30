import type { DhCard, DhPack, RoomPackLibraryItem } from './types'

export interface BuiltInPack extends DhPack {
  id: string
  description: string
}

function definePack(pack: BuiltInPack): BuiltInPack {
  return pack
}

export const BUILT_IN_PACKS: BuiltInPack[] = [
  definePack({
    id: 'test-ember-frontier',
    format: 'dhpack',
    version: 1,
    pack_name: '余烬边境',
    description: '焦土边境上的据点、特殊规训与行动契机，适合从角色启程开始铺开冲突。',
    cards: [
      { id: 'ember-location-ashwatch', type: 'Location', title: '灰望烽台', content: '一座旧烽火塔仍会在无风夜里自行点亮，像是在催促谁尽快出发。', style: '#22c55e' },
      { id: 'ember-location-coalrail', type: 'Location', title: '煤轨集镇', content: '穿镇而过的窄轨每次停靠都带来新的委托、威胁和流言。', style: '#22c55e' },
      { id: 'ember-location-scorchfield', type: 'Location', title: '烬原试验场', content: '大地被规则方格切开，像是某场失败战术还在反复演算。', style: '#22c55e' },
      { id: 'ember-location-redspring', type: 'Location', title: '赤泉避难所', content: '地下热泉供养着边民，入口却只在少数誓言守住时才安全。', style: '#22c55e' },
      { id: 'ember-feature-bloodcharter', type: 'Feature', title: '灰契征募令', content: '立功者可以换取新身份，但旧名字会被官方一并烧毁。', style: '#a855f7' },
      { id: 'ember-feature-cinderstorm', type: 'Feature', title: '余烬风暴季', content: '每逢风暴来临，地图、脚印和谎言都会被重新书写一次。', style: '#a855f7' },
      { id: 'ember-feature-orepulse', type: 'Feature', title: '赤矿心跳', content: '地下矿脉会像心脏一样脉动，靠近的人会梦见同一座尚未建成的堡垒。', style: '#a855f7' },
      { id: 'ember-feature-blackout-curfew', type: 'Feature', title: '熄灯宵禁', content: '边境夜里不允许明火停留太久，因为某种东西会循光而至。', style: '#a855f7' },
      { id: 'ember-hook-lost-supply', type: 'Hook', title: '失落军需列车', content: '最后一列军需车在风暴夜消失，各方都想先找到那批物资。', style: '#2563eb' },
      { id: 'ember-hook-deserter-oath', type: 'Hook', title: '誓约逃兵求援', content: '一名带着灰契烙印的逃兵请求角色护送他去见某位不能公开出现的人。', style: '#2563eb' },
      { id: 'ember-hook-scorch-expedition', type: 'Hook', title: '烬原远征招募', content: '有人悬赏队伍深入试验场中心，取回一份尚未熄灭的旧战报。', style: '#2563eb' },
      { id: 'ember-hook-leaking-shelter', type: 'Hook', title: '避难所入口泄露', content: '赤泉避难所的秘密入口似乎已被外敌知晓，必须先一步找出泄密者。', style: '#2563eb' },
    ],
  }),
  definePack({
    id: 'test-tide-ruins',
    format: 'dhpack',
    version: 1,
    pack_name: '潮汐遗城',
    description: '沉没古城、海上秩序与突发事件并存，适合生成探索、追索和交易线索。',
    cards: [
      { id: 'tide-location-shellgate', type: 'Location', title: '贝门遗址', content: '巨型白贝形成的城门在退潮时露出水面，门后铭文每次都会多一行陌生名字。', style: '#22c55e' },
      { id: 'tide-location-silkreef', type: 'Location', title: '缎潮礁市', content: '摊位系在礁柱与舟船之间，交易往往必须在下一次涨潮前做完。', style: '#22c55e' },
      { id: 'tide-location-bellvault', type: 'Location', title: '钟沉库', content: '沉在浅海下的金库被无数铜钟拴住，潜入者必须猜对正在鸣响的那一口。', style: '#22c55e' },
      { id: 'tide-location-lanterncanal', type: 'Location', title: '灯渠下层', content: '旧城区的运河下还有一层倒置街道，只在满月潮时允许行人通行。', style: '#22c55e' },
      { id: 'tide-feature-drownedthrone', type: 'Feature', title: '溺王遗诏', content: '古王留下只对潮汐承认的命令，谁能让城池重新浮起，谁就能继位。', style: '#a855f7' },
      { id: 'tide-feature-seadebt', type: 'Feature', title: '潮债市场', content: '债务可以被转卖给任何愿意承受诅咒的人，因此每笔欠款都可能变成阴谋。', style: '#a855f7' },
      { id: 'tide-feature-coralchoir', type: 'Feature', title: '珊瑚合唱', content: '夜里会有看不见的合唱团在水下排练，歌词总指向下一场背叛的位置。', style: '#a855f7' },
      { id: 'tide-feature-reverse-bridge', type: 'Feature', title: '逆潮断桥', content: '一座本该坍塌的桥只在潮水倒流时出现，且每次通往不同地点。', style: '#a855f7' },
      { id: 'tide-hook-bell-key', type: 'Hook', title: '寻找沉钟钥匙', content: '有人出高价悬赏一把能打开钟沉库的古钥匙，却不肯说明用途。', style: '#2563eb' },
      { id: 'tide-hook-debt-ledger', type: 'Hook', title: '护送潮债账本', content: '一本记录海上债务的账本即将易主，多方都想在交接前拦下它。', style: '#2563eb' },
      { id: 'tide-hook-lowtide-missing', type: 'Hook', title: '退潮失踪案', content: '每逢大退潮都会少一名熟悉遗城路的人，最后一位失踪者留下了求救标记。', style: '#2563eb' },
      { id: 'tide-hook-named-by-sea', type: 'Hook', title: '被海雾点名的人', content: '清晨海雾反复呼唤某位角色的名字，老水手坚持那意味着必须立刻出海。', style: '#2563eb' },
    ],
  }),
  definePack({
    id: 'test-sky-archipelago',
    format: 'dhpack',
    version: 1,
    pack_name: '天穹列岛',
    description: '漂浮群岛、航路秩序与高空异变，适合塑造旅程、相遇和灾变前兆。',
    cards: [
      { id: 'sky-location-anchorport', type: 'Location', title: '锚云港', content: '无数空艇锚链垂入云海，港口规矩只有一条：不要问最深处连着什么。', style: '#22c55e' },
      { id: 'sky-location-sunsteps', type: 'Location', title: '逐日阶岛', content: '整座岛是一串不断旋转的石阶，站得越高，越容易看见不该属于今天的日落。', style: '#22c55e' },
      { id: 'sky-location-featherforge', type: 'Location', title: '羽铁工坊', content: '工匠用巨鸟脱落的飞羽锻造金属，让盔甲与罪证一样都变得更轻。', style: '#22c55e' },
      { id: 'sky-location-hushgarden', type: 'Location', title: '静风花圃', content: '这里没有一片叶子会颤动，因此任何悄悄话都会显得格外响亮。', style: '#22c55e' },
      { id: 'sky-feature-fallban', type: 'Feature', title: '禁坠律', content: '议会明令禁止任何人追查坠岛事故，因为每次追查都会牵扯出更高层的名字。', style: '#a855f7' },
      { id: 'sky-feature-thunderseed', type: 'Feature', title: '雷种迁徙', content: '会在空中孵化雷暴的种子正沿航路扩散，谁掌握源头就能左右天气。', style: '#a855f7' },
      { id: 'sky-feature-lastupdraft', type: 'Feature', title: '最后上升气流', content: '古老预言说某条气流只能再托起一座岛屿，因此所有派系都在争夺它。', style: '#a855f7' },
      { id: 'sky-feature-cloud-quarantine', type: 'Feature', title: '云海检疫令', content: '所有靠港空艇都必须接受异常孢子检查，这让走私和躲藏变得更加危险。', style: '#a855f7' },
      { id: 'sky-hook-blackbox-fall', type: 'Hook', title: '追查坠岛黑匣', content: '一艘空艇坠落前抛下了记录核心，多个势力正沿不同航线追赶它。', style: '#2563eb' },
      { id: 'sky-hook-silent-passenger', type: 'Hook', title: '沉默乘客委托', content: '一位拒绝说明身份的乘客只提出一个要求：把他送到地图上没有的岛。', style: '#2563eb' },
      { id: 'sky-hook-storm-escort', type: 'Hook', title: '护送风暴标本', content: '学者希望角色护送一枚封存雷暴的晶囊穿过最危险的航道。', style: '#2563eb' },
      { id: 'sky-hook-meeting-bell', type: 'Hook', title: '相聚钟声提前敲响', content: '锚云港的集合钟在无人触碰时提早鸣响，像是在催促几位角色立刻汇合。', style: '#2563eb' },
    ],
  }),
]

const BUILT_IN_PACK_ID_SET = new Set(BUILT_IN_PACKS.map((pack) => pack.id))

export const DEFAULT_BUILT_IN_PACK_IDS = BUILT_IN_PACKS.map((pack) => pack.id)

export function isBuiltInPackId(packId: string): boolean {
  return BUILT_IN_PACK_ID_SET.has(packId)
}

export function getBuiltInPackById(packId: string): BuiltInPack | undefined {
  return BUILT_IN_PACKS.find((pack) => pack.id === packId)
}

export function getBuiltInPacksById(packIds: string[]): BuiltInPack[] {
  return packIds
    .map((packId) => getBuiltInPackById(packId))
    .filter((pack): pack is BuiltInPack => Boolean(pack))
}

export function normalizeBuiltInPackSelection(packIds: string[] | undefined, fallbackToAll = true): string[] {
  const normalized = Array.from(new Set((packIds ?? []).filter(isBuiltInPackId)))
  if (normalized.length > 0) return normalized
  return fallbackToAll ? [...DEFAULT_BUILT_IN_PACK_IDS] : []
}

export function createDeckFromBuiltInPackIds(packIds: string[]): DhCard[] {
  return getBuiltInPacksById(packIds).flatMap((pack) => (
    pack.cards.map((card) => ({
      id: card.id ?? `${pack.id}-${card.title}`,
      type: card.type,
      title: card.title,
      content: card.content,
      style: card.style,
      is_custom: false,
      pack_id: pack.id,
    }))
  ))
}

export function builtInPackToLibraryItem(pack: BuiltInPack): RoomPackLibraryItem {
  return {
    id: pack.id,
    pack_name: pack.pack_name,
    description: pack.description,
    source: 'built-in',
    cards: pack.cards.map((card) => ({
      id: card.id ?? `${pack.id}-${card.title}`,
      type: card.type,
      title: card.title,
      content: card.content,
      style: card.style,
    })),
  }
}

export function createBuiltInPackLibrary(): RoomPackLibraryItem[] {
  return BUILT_IN_PACKS.map((pack) => builtInPackToLibraryItem(pack))
}
