# 方块世界 Block World

手机端优先的 Three.js 方块世界小游戏。当前版本已经升级成 Vite + npm 项目，不依赖 CDN，适合部署到 GitHub Pages。

## 2.0 功能

- 无限感随机地图：按区块生成，玩家移动时自动加载附近区块。
- 更像 Minecraft 的体素渲染：只生成可见面，性能比每个方块一个 Mesh 更稳。
- 随机地形：森林、沙地、海滩、湖、水、树、煤矿、金矿。
- 可交互方块：挖掘、放置、快捷栏选方块。
- 手机交互：左下摇杆、右下挖掘 / 放置 / 跳跃按钮，长按可连续操作。
- 随机刷新：顶部 🎲 生成新世界。
- 保存世界：顶部 💾 保存 seed、玩家位置和改动过的方块。
- 光照效果：昼夜变化、太阳/月光、云层。
- 电脑端控制：WASD、Shift 加速、空格跳跃、数字键切换方块、左键挖、右键放。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 部署到 GitHub Pages

1. 进入仓库 `Settings -> Pages`。
2. `Source` 选择 `GitHub Actions`。
3. 确认 `Settings -> Actions -> General -> Workflow permissions` 为 `Read and write permissions`。
4. 回到 `Actions`，运行 `Deploy to GitHub Pages`。
5. 成功后打开：`https://s8k8ps26k6-ui.github.io/game/`

## 操作

手机端：
- 拖动屏幕：环顾四周
- 左下摇杆：走动
- 右下按钮：挖掘 / 放置 / 跳跃
- 底部快捷栏：选择方块类型
- 顶部 🎲：随机刷新世界
- 顶部 💾：保存当前世界
- 顶部 🏠：回到出生点

电脑端：
- WASD：移动
- Shift：加速
- 鼠标拖动：视角
- 双击画面：尝试进入鼠标锁定
- 数字键 1-9：切换方块
- 左键：挖掘
- 右键：放置
- 空格：跳跃
- R：随机刷新世界
- F：回到出生点
