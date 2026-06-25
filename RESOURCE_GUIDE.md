# 资源准备指南

## 概述

`kys-web` 支持两种运行模式：

| 模式 | 说明 | 启动方式 |
|------|------|---------|
| **Demo 模式** | 自动生成演示数据（无需任何资源） | 直接 `npm run dev` |
| **完整模式** | 使用原始游戏资源（1:1 还原） | 放入资源后 `npm run dev` |

---

## Demo 模式（开箱即用）

无需任何额外操作。运行 `npm run dev` 即可看到：
- 标题画面（纯色背景 + 文字）
- 基础的 480×480 可走地图
- 示例角色数据

---

## 完整模式（1:1 还原）

### 1. 获取原始游戏资源

从 [kys-cpp 发布页](https://github.com/scarsty/kys-cpp) 或百度网盘下载 `kys-cpp-4in1` 资源包。

### 2. 放入资源目录

```
public/game/
├── resource/
│   ├── head/          头像 (head_0.png, head_1.png, ... + index.ka)
│   ├── fight/         战斗贴图 (0.png, 1.png, ... + fightframe.txt + index.ka)
│   ├── scene/         场景瓦片 (smap_0.png, smap_1.png, ... + index.ka)
│   ├── mmap/          大地图瓦片 (mmap_0.png, mmap_1.png, ... + index.ka)
│   ├── item/          物品图标
│   ├── weapon/        武器图标
│   ├── magic/         武功图标
│   ├── title/         标题画面
│   └── ...
├── game.db            游戏数据库（SQLite）
├── config/
│   ├── kys.ini        游戏配置
│   └── battle.yaml    战斗配置
├── script/
│   └── *.lua          剧情脚本（Lua 格式）
├── list/
│   ├── levelup.txt    升级经验表
│   └── leave.txt      离队列表
└── talkutf8.txt       对话文本
```

### 3. 转换 Lua 脚本为 TypeScript

```bash
npm run convert-scripts -- ./game/script/ ./src/event/ ./game/talkutf8.txt
```

### 4. 运行

```bash
npm run dev
```

---

## 资源格式参考

### index.ka（二进制偏移文件）

- 格式：连续 int16 对（小端序）
- 每对 = (x偏移, y偏移)
- 从索引 0 开始顺序存放
- (0, 0) 表示无偏移

### index.txt（文本偏移文件，优先使用）

```
0: 10, -5
1: 8, -3
2: 12, -6
```

### fightframe.txt（战斗帧配置）

```
# 动作索引(0~4) 下帧数 左帧数 上帧数 右帧数
0 4 4 4 4
1 3 3 3 3
```

### mmap.col（主地图二进制文件）

- 格式：480×480×3 层的 uint16 数组
- 层序：earth → surface → building
- 大小：480×480×3×2 = 1,382,400 字节

### game.db（SQLite 数据库）

表结构（参考）：
- `role` — 角色数据
- `item` — 物品数据
- `magic` — 武功数据
- `submap` — 场景数据
- `submapevent` — 场景事件
- `shop` — 商店数据

---

## 资源格式转换工具

原项目 `tools/` 目录下的 C++ 工具用于转换 DOS 版资源：

| 工具 | 功能 |
|------|------|
| `xia` | .grp/.idx → PNG 图片 |
| `trans50` | KDEF 指令 → Lua 脚本 |
| `abc` | 存档转换、index.ka → index.txt |

这些工具需要在 C++ 环境中编译运行。转换后的资源可直接用于 Web 版。
