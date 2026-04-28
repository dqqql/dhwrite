# 匕首之心团前共创工具进度

更新时间：2026-04-28

## 当前阶段

项目已从纯 PRD/方案阶段推进到可运行的前端原型和可本地联调的实时后端骨架。

当前重点不再是静态界面，而是进入前后端协议联调阶段：前端需要从 mock store 逐步切换到 HTTP API + WebSocket 房间状态同步。

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

已验证：

```powershell
cd d:\Dql\Desktop\dhgc\fronted
npm run build
npm run lint
```

已知问题：

- 部分中文文案仍存在编码乱码，需要后续统一修复。
- 前端仍主要使用本地 Zustand mock 状态，尚未接入真实后端。
- 视觉仍需根据最终 Figma 稿继续细修。
- 当前画布实现是自建 DOM 网格，不是技术方案中提到的 React Flow，后续是否迁移需要再评估。

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
- 尚未接前端。
- 缺少自动化测试脚本，当前主要依靠 smoke test 和 typecheck。
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

1. 前端新增 API/WebSocket client。
2. 创建/加入房间改为调用后端 HTTP API。
3. 房间页初始化改为等待 `room.snapshot`。
4. Zustand action 改为发送 WebSocket 消息，并用 `room.updated` 替换本地状态。
5. 完成抽牌、打牌、移动、缩放、结束回合的第一轮前后端联调。

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
