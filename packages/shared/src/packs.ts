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
    description: '焦土与开拓者并存的边境地带，适合测试冲突、据点和资源争夺。',
    cards: [
      { id: 'ember-location-ashwatch', type: 'Location', title: '灰望烽台', content: '烧焦山脊上的旧烽火塔仍会在无风夜里自行点亮，提醒边境居民某种未被扑灭的战争。', style: '#22c55e' },
      { id: 'ember-location-coalrail', type: 'Location', title: '煤轨集镇', content: '一条运煤窄轨穿过集镇中心，列车每次停靠都会带来不同雇主的委托与威胁。', style: '#22c55e' },
      { id: 'ember-location-scorchfield', type: 'Location', title: '烬原试验场', content: '大地裂开规则的方格，像是有人在此反复演算战术与献祭公式。', style: '#22c55e' },
      { id: 'ember-location-redspring', type: 'Location', title: '赤泉避难所', content: '地下热泉供养着最后一批边民，也让每位访客都必须宣誓不向外泄露入口。', style: '#22c55e' },
      { id: 'ember-npc-cindermarshal', type: 'NPC', title: '烬纹镇务官', content: '他用烧伤覆盖旧军衔，坚称边境需要的是秩序，而不是来自王都的仁慈。', style: '#2563eb' },
      { id: 'ember-npc-railwidow', type: 'NPC', title: '铁轨寡妇', content: '掌握补给线路的寡妇经营着情报与黑市，她会记住每个欠她煤票的人。', style: '#2563eb' },
      { id: 'ember-npc-saltscout', type: 'NPC', title: '盐风侦骑', content: '这名侦骑总能先一步嗅到沙暴与伏兵，却拒绝解释他听命于谁。', style: '#2563eb' },
      { id: 'ember-feature-bloodcharter', type: 'Feature', title: '灰契征募令', content: '任何在边境立功的人都能换取新的身份，但他们过去的一切也会被官方一并烧毁。', style: '#a855f7' },
      { id: 'ember-feature-cinderstorm', type: 'Feature', title: '余烬风暴季', content: '每逢风暴来临，地图、脚印和谎言都会被重新书写一次。', style: '#a855f7' },
      { id: 'ember-feature-orepulse', type: 'Feature', title: '赤矿心跳', content: '地下矿脉会像心脏一样脉动，靠近的人会梦见同一座尚未建成的堡垒。', style: '#a855f7' },
    ],
  }),
  definePack({
    id: 'test-tide-ruins',
    format: 'dhpack',
    version: 1,
    pack_name: '潮汐遗城',
    description: '半沉没古城与海上盟约的组合，适合测试探索、势力关系和秘密交易。',
    cards: [
      { id: 'tide-location-shellgate', type: 'Location', title: '贝门遗址', content: '巨型白贝形成的城门在退潮时露出水面，门后铭文每次都会多一行陌生名字。', style: '#22c55e' },
      { id: 'tide-location-silkreef', type: 'Location', title: '缎潮礁市', content: '商贩把摊位系在礁柱与舟船之间，买卖往往在下一次涨潮前就必须成交。', style: '#22c55e' },
      { id: 'tide-location-bellvault', type: 'Location', title: '钟沉库', content: '沉在浅海下的金库被无数铜钟拴住，潜入者必须猜对正在鸣响的那一口。', style: '#22c55e' },
      { id: 'tide-location-lanterncanal', type: 'Location', title: '灯渠下层', content: '旧城区的运河下还有一层倒置街道，只在满月潮时允许行人通行。', style: '#22c55e' },
      { id: 'tide-npc-pearlnotary', type: 'NPC', title: '珍珠公证人', content: '她替海上各派保管口头盟约，若违约者不认账，珍珠就会在其喉间生长。', style: '#2563eb' },
      { id: 'tide-npc-mirecaptain', type: 'NPC', title: '淤港船长', content: '这位船长从不靠岸，只用系绳把货与消息送到指定窗口。', style: '#2563eb' },
      { id: 'tide-npc-brinesinger', type: 'NPC', title: '盐歌修女', content: '她通过歌声安抚海怪与失眠者，却越来越常在赞歌里夹带求救暗号。', style: '#2563eb' },
      { id: 'tide-feature-drownedthrone', type: 'Feature', title: '溺王遗诏', content: '古王留下一道只对潮汐承认的命令，谁能让城池重新浮起，谁就能继位。', style: '#a855f7' },
      { id: 'tide-feature-seadebt', type: 'Feature', title: '潮债市场', content: '债务可以被转卖给任何愿意承受诅咒的人，因此每笔欠款都可能变成阴谋。', style: '#a855f7' },
      { id: 'tide-feature-coralchoir', type: 'Feature', title: '珊瑚合唱', content: '夜里会有看不见的合唱团在水下排练，歌词总指向下一场背叛的位置。', style: '#a855f7' },
    ],
  }),
  definePack({
    id: 'test-sky-archipelago',
    format: 'dhpack',
    version: 1,
    pack_name: '天穹列岛',
    description: '漂浮群岛与飞空航线的舞台，适合测试旅行、联盟和高空灾变。',
    cards: [
      { id: 'sky-location-anchorport', type: 'Location', title: '锚云港', content: '无数空艇锚链垂入云海，港口规矩只有一条: 不要问最深处连着什么。', style: '#22c55e' },
      { id: 'sky-location-sunsteps', type: 'Location', title: '逐日阶岛', content: '整座岛是一串不断旋转的石阶，站得越高，越容易看见不该属于今天的日落。', style: '#22c55e' },
      { id: 'sky-location-featherforge', type: 'Location', title: '羽铁工坊', content: '工匠用巨鸟脱落的飞羽锻造金属，让盔甲与罪证一样都变得更轻。', style: '#22c55e' },
      { id: 'sky-location-hushgarden', type: 'Location', title: '静风花圃', content: '这里没有一片叶子会颤动，因此任何悄悄话都会显得格外响亮。', style: '#22c55e' },
      { id: 'sky-npc-galebroker', type: 'NPC', title: '风约经纪人', content: '他买卖航线许可与气流预报，据说还替某些人出售安全的坠落。', style: '#2563eb' },
      { id: 'sky-npc-choirpilot', type: 'NPC', title: '圣歌领航员', content: '这位领航员只在唱完整首古歌后才愿起飞，而歌词正逐节预告队伍命运。', style: '#2563eb' },
      { id: 'sky-npc-cloudshepherd', type: 'NPC', title: '牧云人', content: '她放牧可以凝成暴雨的云群，也偷偷替逃亡者藏匿身影。', style: '#2563eb' },
      { id: 'sky-feature-fallban', type: 'Feature', title: '禁坠律', content: '列岛议会明令禁止任何人追查坠岛事故，因为每次追查都会牵扯出更高层的名字。', style: '#a855f7' },
      { id: 'sky-feature-thunderseed', type: 'Feature', title: '雷种迁徙', content: '一种会在空中孵化雷暴的种子正沿航路扩散，谁掌握其源头就能控制天气。', style: '#a855f7' },
      { id: 'sky-feature-lastupdraft', type: 'Feature', title: '最后上升气流', content: '古老预言说某条气流只能再托起一座岛屿，因此所有派系都在争夺它的使用权。', style: '#a855f7' },
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
