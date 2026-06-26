# kys-web 项目交接说明

最后更新：2026-06-26
当前分支：`master`
最新功能提交：`a852299 feat: improve game rendering and interactions`

## 1. 项目目标与当前判断

用户的真实目标是：使用 `agent-browser` 自主调试 `kys-web`，直到所有可达功能、互动、显示都正常；视觉上要参考《金庸群侠传》实际画面，尤其本地 `D:\code\wuxia\kys-cpp` 的 README 截图。

重要：**当前还不能宣称目标完成**。本轮已经明显推进了资源化渲染、菜单/战斗/事件交互和浏览器验证，但完整原版数据链路仍缺失，尤其是：

- 原版 `SubMaps` / `SubMapEvents` 尚未从资源或数据库完整加载。
- 大地图入口仍主要依赖测试入口，而非完整原版入口表。
- 子场景出口、传送回大地图坐标、真实剧情事件还没有完整恢复。
- `warfld.grp` / `warfld.idx` / `war.sta` 战斗地图格式尚未完整解码接入。
- 角色战斗帧、头像、物品、地图贴图 ID 的映射仍需持续校验。

因此下一位负责人应把当前状态视为“朝真实游戏继续复刻和调试的中间态”，不要把现有 smoke test 结果当作完成证明。

## 2. 仓库与相关本地路径

- Web 项目：`D:\code\wuxia\kys-web`
- C++ 参考项目：`D:\code\wuxia\kys-cpp`
- C++ README：`D:\code\wuxia\kys-cpp\readme.md`
- 视觉参考截图：
  - `D:\code\wuxia\kys-cpp\pic\title.jpg`
  - `D:\code\wuxia\kys-cpp\pic\1.png`
  - `D:\code\wuxia\kys-cpp\pic\2.png`
  - `D:\code\wuxia\kys-cpp\pic\3.png`
  - `D:\code\wuxia\kys-cpp\pic\4.png`
- C++ 分析文档：
  - `D:\code\wuxia\kys-cpp\doc\web-migration\03-场景与UI分析.md`
  - `D:\code\wuxia\kys-cpp\doc\高清素材的方案.md`
  - `D:\code\wuxia\kys-cpp\doc\转换DOS版资源.md`

## 3. 当前资源状态

`public/game/resource/` 是关键资源目录，本地存在但被 `.gitignore` 忽略，不能假定远程仓库自带这些版权资源。当前代码会优先使用这些本地资源：

- 主地图层：`earth.002`、`surface.002`、`building.002`、`buildx.002`、`buildy.002`
- 大地图贴图：`mmap.zip`
- 子场景贴图：`smap.zip`
- 标题贴图：`title` 资源 ZIP/目录索引
- 头像：`head` 资源
- 物品：`item` 资源
- 战斗相关：`warfld.grp`、`warfld.idx`、`war.sta`、`fight/fightNNN.zip`
- 对话文本：`talkutf8.txt`

`public/game/game_data.json` 当前只包含 `role`、`item`、`magic`、`shop`，不含完整 `submap` / `submapevent` 数据。这是后续工作的核心瓶颈之一。

## 4. 最近一次提交包含的主要改动

提交：`a852299 feat: improve game rendering and interactions`

### 4.1 资源化渲染

新增：

- `src/data/ResourceTextureCache.ts`

作用：懒加载 ZIP/目录中的图片资源，避免一次性预载几千张 `mmap/smap` 贴图。

相关改动：

- `src/engine/AssetLoader.ts`
- `src/scenes/TitleScene.ts`
- `src/scenes/MainScene.ts`
- `src/scenes/SubScene.ts`
- `src/scenes/battle/BattleMap.ts`
- `src/scenes/battle/BattleScene.ts`
- `src/ui/UIItem.ts`
- `src/ui/UIStatus.ts`

当前效果：标题、大地图、子场景测试室内、战斗地形、物品图标、状态头像等已经从大面积几何占位推进为使用本地资源贴图。

### 4.2 大地图与系统菜单流程

相关文件：

- `src/main.ts`
- `src/scenes/MainScene.ts`

已修问题：大地图按 `Esc` 之前会退回标题。现在 `MainScene` 用返回值 `-12` 表示打开系统菜单，系统菜单关闭后回到大地图继续游戏。

### 4.3 按键配置生效

相关文件：

- `src/engine/InputManager.ts`
- `src/ui/UIKeyConfig.ts`

已修问题：按键配置此前只修改 UI 内部状态，退出即丢失，且不影响实际输入。现在：

- `InputManager` 持有 `DEFAULT_KEY_BINDINGS`。
- 键位配置写入 `localStorage` 的 `kys.keyBindings`。
- `InputManager.direction` 走 action 绑定。
- `UIKeyConfig` 可重绑，也可按 `R` 恢复默认。

注意：许多 UI 仍保留直接检查 `ArrowUp` / `KeyW` 等 fallback。后续若要完整可配置，应逐步改为统一 action 查询。

### 4.4 战斗交互修复

相关文件：

- `src/scenes/battle/BattleMenu.ts`
- `src/scenes/battle/BattleScene.ts`
- `src/scenes/battle/BattleCursor.ts`
- `src/scenes/battle/BattleMap.ts`

已修问题：

- 战斗菜单按 `Esc` 后菜单子节点不清理，父 `BattleScene` 可能卡在选择阶段。
- 胜利/失败日志之前几乎一闪而过，现在会停留一段时间再退出。
- 战斗显示已使用部分 `smap/fight` 本地资源，视觉比几何占位更接近原版。

仍需继续：

- 接入真实 `warfld` 战斗地图。
- 完整处理移动范围、攻击范围、武功范围、目标选择、胜负奖励、失败处理。
- 用 agent-browser 做更完整的多回合验证。

### 4.5 事件、对话、剧情战斗

相关文件：

- `src/script/EventContext.ts`
- `src/ui/Talk.ts`
- `src/scenes/SubScene.ts`
- `src/event/ka1002.ts`

已修问题：

- `talk` / `oldTalk` 不再只是 `console.log`，现在会显示 `Talk` UI。
- `showMenu()` 不再固定返回 0，会显示可交互菜单。
- `battle(id)` 不再直接返回 true，会打开真实 `BattleScene` 并等待结果。
- `SubScene.triggerEvent()` 不再默认把事件 `Active` 置 0，避免可重复对话、门、商店等事件触发一次后永久失效。
- 新增 `ka1002.ts` 作为调试事件，覆盖“对话 -> 战斗 -> 战后对话”链路。

注意：`ka1002.ts` 是为了当前调试链路服务的临时/演示事件，不等同于完整原版剧情接入。

## 5. 已执行验证

最近提交前已运行：

```bash
npx tsc --noEmit
npm run build
```

结果：两者均通过。

构建输出曾显示 Vite 成功产出 `dist/`，且无 TypeScript 编译错误。

浏览器验证：使用过 `agent-browser` 在 `http://127.0.0.1:3002/` 做多轮操作，覆盖过标题、大地图、子场景、战斗、系统菜单、物品、状态、存读档、设置、按键配置、商店等入口，并收集截图到 `dogfood-output/screenshots/`。该目录已加入 `.gitignore`，不会提交。

重要限制：这些浏览器验证仍属于阶段性验证，不能证明“所有功能完成”。特别是 canvas 游戏用 `agent-browser click "canvas"` 时，默认点在画布中心，容易误触标题菜单第一项“新游戏”，后续测试要使用更精确坐标或纯键盘流程。

## 6. 如何启动和验证

### 6.1 安装与启动

在 `D:\code\wuxia\kys-web`：

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3002
```

如果 3002 已被占用，可换端口，但要在 `agent-browser open` 时使用对应地址。

### 6.2 基本检查

```bash
npx tsc --noEmit
npm run build
```

### 6.3 agent-browser 基本流程

```bash
agent-browser skills get core
agent-browser open http://127.0.0.1:3002/
agent-browser wait --load networkidle
agent-browser screenshot dogfood-output/screenshots/current-title.png
agent-browser errors
agent-browser console
```

建议每个功能路径都截图并检查 errors/console：

- 标题菜单：新游戏、读取进度、子场景测试、战斗测试、系统菜单、退出。
- 大地图：移动、碰撞、Esc 打开系统菜单、返回大地图后状态保持。
- 子场景：移动、主动事件、经过事件、对话显示/关闭、剧情战斗入口。
- 战斗：菜单打开、Esc 取消后能重新选择、攻击/武功/物品/防御/等待、胜负日志可见。
- 系统菜单：物品、状态、武功/队伍、保存、读取、设置、按键配置、商店。
- 商店：买入、卖出、银两变化、库存变化、余额不足提示、取消返回。
- 存读档：保存后读取，至少验证银两、位置、队伍/物品等关键字段 round-trip。
- 设置/按键：音量/全屏变更，重绑后实际移动或确认键变化，恢复默认。

## 7. 下一步优先级建议

### P0：真实数据链路

1. 找出或恢复原版 `SubMaps`、`SubMapEvents` 数据来源。
   - 当前 `game_data.json` 没有这些字段。
   - 可检查 C++ 项目如何读取 `game.db` 或相关 `.idx/.grp/.ka` 文件。
   - 目标是让 `DBReader.createGameState()` 填充 `gameState.SubMaps` 和 `gameState.SubMapEvents`。

2. 大地图入口从真实 `SubMaps.MainMapX/MainMapY` 派生。
   - 当前 `MainScene.checkEntrance()` 仍保留测试入口。
   - 接入真实入口后应删除或隔离测试入口。

3. 子场景出口/传送逻辑。
   - `SubMapInfoSave` 中已有 `JumpX/JumpY/MainMapX/MainMapY` 等字段定义。
   - 主流程需要根据子场景返回值更新大地图位置，而不是只回到默认角色坐标。

### P1：战斗地图与战斗系统

1. 解码并接入：
   - `public/game/resource/warfld.grp`
   - `public/game/resource/warfld.idx`
   - `public/game/resource/war.sta`

2. 继续完善：
   - 战斗地图高度/障碍/装饰层。
   - 角色战斗帧映射。
   - 移动范围、攻击范围、武功范围。
   - 胜利奖励和失败处理。

### P1：完整剧情 UI

1. `Talk` UI 需要进一步接头像资源和分页逻辑。
2. `showMenu()` 需要和原版样式、脚本返回值完全对齐。
3. 剧情脚本转换/导入要覆盖真实 `ka*.lua`。

### P2：自动化可观测性

建议后续加入一个不改变玩法的只读调试状态接口，例如 `window.__KYS_DEBUG__.getState()`，返回当前场景名、菜单索引、角色坐标、战斗 phase、当前日志等。这样 agent-browser 可以更可靠验证 canvas 游戏状态。之前曾开始写 `src/debug/DebugState.ts`，但尚未完整接入，提交前已删除，避免半成品进入主干。

## 8. 当前已知风险和注意事项

- 不要下载或提交新的版权素材。只能使用本地已有资源，且资源目录已在 `.gitignore` 中。
- `dogfood-output/` 是本地测试截图/轨迹，已忽略，不应提交。
- `agent-browser click "canvas"` 会点画布中心，标题界面很容易直接触发“新游戏”。测试标题菜单时应避免这种聚焦方式。
- `EventContext.battle()` 现在会在 UI 层运行 `BattleScene`，要继续观察与父场景 ticker/input 的交互，避免嵌套 run 造成输入竞争。
- `UIKeyConfig` 的 action 绑定尚未完全替换所有 UI 的硬编码键位查询。
- `.gitignore` 注释已改为英文，避免 Windows shell 编码导致中文注释乱码。

## 9. 推荐接手顺序

1. 先拉最新 `master`，确认最新提交为 `a852299` 或包含后续 handoff 提交。
2. 确认本地资源目录 `public/game/resource/` 存在。
3. 跑：
   ```bash
   npx tsc --noEmit
   npm run build
   ```
4. 启动 dev server，用 agent-browser 做一轮标题/大地图/子场景/战斗/系统菜单 smoke。
5. 开始 P0：补 `SubMaps/SubMapEvents` 数据加载和真实入口。
6. 每修一批功能，都用 agent-browser 做端到端验证，并保存截图到 `dogfood-output/`。
7. 只有当所有显式功能路径都有当前强证据，且 errors/console/build 都干净时，才考虑宣称目标完成。
