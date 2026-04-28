# 匕首之心团前共创工具进度

更新时间：2026-04-28

## 当前阶段

项目已从纯 PRD/方案阶段推进到“可运行前端 + 可联调实时后端 + 首轮真实房间同步打通”的阶段。

当前重点已从“接后端入口”推进到“补齐联调细节与多人稳定性”：前端已经不再依赖创建/加入房间的 mock 流程，下一步更偏向多人 smoke test、断线恢复与剩余交互收口。

## 前端状态

目录：`fronted`

已完成：

- React + TypeScript + Vite 前端工程已可运行。
- 有创建/加入房间入口、房间页、顶部栏、玩家面板、手牌区、抽牌弹窗、自定义卡弹窗、导入/导出弹窗。
- 地图支持平移、缩放、网格背景、卡片移动、卡片展开、连接线展示、标注展示。
- 视觉方向已从深色玻璃态调整为亮色 Figma 白板风格。
- 地图卡片已改为基于网格尺寸：不同卡牌类型有默认网格宽高。
- 手牌支持拖拽到地图，落点吸附网格。
- 地图卡片支持右下角按网格等比例缩放。
- 已新增前端 realtime client，默认通过 `VITE_REALTIME_API_BASE`（未配置时回落到 `http://127.0.0.1:8787`）连接后端。
- 创建房间 / 加入房间已改为调用后端 HTTP API，不再走本地 mock 初始化。
- 进入房间后已改为等待 WebSocket `room.snapshot`，后续通过 `room.updated` 覆盖房间状态。
- 已完成首轮核心动作联调：开始/结束共创、结束回合、强制跳过、抽牌三选一、确认抽牌、创建自定义卡、打牌、移动卡牌、缩放卡牌、导入卡包。
- `.dhroom.json` 房间备份导出已切到后端接口。

已验证：

```powershell
cd d:\Dql\Desktop\dhgc\fronted
npm run build
npm run lint
```

端到端 smoke test 已通过（31/31）：

```powershell
cd d:\Dql\Desktop\dhgc
node smoke-test.mjs
```

覆盖链路：创建房间 → 加入房间 → WebSocket 双端连接 → 开始共创（发牌 5 张） → 抽牌三选一 → 打牌到地图 → 锁定+移动卡牌 → 缩放卡牌 → 结束回合 → 强制跳过 → 创建自定义卡 → 导出 .dhroom.json → 结束共创（回收手牌） → 重连

已知问题：

- 部分中文文案仍存在编码乱码，需要后续统一修复。
- 视觉仍需根据最终 Figma 稿继续细修。
- 当前画布实现是自建 DOM 网格，不是技术方案中提到的 React Flow，后续是否迁移需要再评估。
- ~~连接层目前还没有自动重连、断线恢复提示细化和 session 持久化。~~ 已完成：自动重连（指数退避，max 30s，最多 15 次）、TopBar 连接状态指示器（重连中/已断开+手动重连按钮）、RoomPage 重连横幅、online/offline 事件监听、beforeunload 清理。
- 卡片拖拽/缩放现在采用“前端本地预览 + WebSocket commit”的方式，仍需做多人实测验证同步手感。
- 连接线、标注、编辑等功能虽然已有协议与 store action，但还缺少完整的端到端交互验证。

## 后端状态

目录：`apps/realtime`

已完成：

- 新增 Cloudflare Worker + Durable Object 后端工程。
- 新增 `packages/shared`，集中维护共享类型、WebSocket 协议、网格工具和基础 JSON 校验。
- Worker API 已包含：
  - `GET /api/health`
  - `POST /api/rooms`
  - `POST /api/rooms/join`
  - `GET /api/rooms/:inviteCode/export/dhroom`
  - `GET /api/rooms/:inviteCode/ws?token=...`
- Durable Object 已维护单房间实时状态。
- 已支持房间创建、加入、短期 session token、WebSocket snapshot、玩家在线/离线、房主自动转移。
- 已支持开始共创、结束共创、回合推进、强制跳过、抽牌三选一、确认抽牌、打牌、移动卡牌、缩放卡牌、软锁、解锁、编辑、删除、回收。
- 已支持连接线、标注、导入 `.dhpack.json`、导出 `.dhroom.json`。
- 新增 `schema.sql`，记录后续 D1 持久化表结构。

已验证：

```powershell
cd d:\Dql\Desktop\dhgc
npm install
npm run realtime:typecheck
```

本地 Wrangler smoke test 已跑通：

- 健康检查成功。
- 创建房间成功。
- 第二名玩家加入成功。
- `.dhroom.json` 导出成功。
- WebSocket 首包 `room.snapshot` 成功。
- WebSocket `ping` / `pong` 成功。
- `room.startCoCreation` / `card.draw` / `card.draw.confirm` 共创链路成功。

已知问题：

- D1 目前只有 schema，实际持久化暂时使用 Durable Object storage 快照。
- session secret 仍是开发默认值，部署前必须替换。
- ~~尚未接前端。~~ 已通过 smoke test 验证前后端联调全部核心链路（31/31 通过）。
- 缺少自动化测试脚本（CI 级别），当前主要依靠 smoke test 和 typecheck。
- WebSocket 协议已有 TypeScript 类型，但还没有运行时完整 schema 校验。

## 当前联调入口

启动后端：

```powershell
cd d:\Dql\Desktop\dhgc
npm run realtime:dev
```

启动前端：

```powershell
cd d:\Dql\Desktop\dhgc\fronted
npm run dev
```

推荐下一步：

1. 跑一次真实双端 / 多标签页 smoke test，验证创建、加入、抽牌、打牌、拖拽、缩放、结束回合的联动链路。
2. 为 WebSocket 增加断线提示、自动重连或手动重连入口。
3. 补齐连接线、标注、卡片编辑等剩余交互的多人联调验证。
4. 增加前端环境变量说明与最小联调文档，方便他人本地启动。
5. 视联调结果补自动化测试，至少覆盖 HTTP 创建/加入和核心 WebSocket 消息流程。

## 提交范围说明

本次提交应包含：

- `fronted` 当前前端原型与近期交互/视觉调整。
- `apps/realtime` 后端工程。
- `packages/shared` 共享协议包。
- 根目录 npm workspace 配置与 lockfile。
- 本进度文档。

不应包含：

- 本地 `node_modules`。
- Wrangler 本地状态 `.wrangler`。
- smoke test 日志文件。
- 与本轮开发无关的既有文档重命名/未跟踪文件。
