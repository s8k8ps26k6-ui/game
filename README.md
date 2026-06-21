# 方块世界 Block World

一个手机端可玩的 Three.js 方块小游戏。  
已经改成 Vite + npm 版本，不依赖 CDN，适合部署到 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 进入仓库 `Settings -> Pages`。
2. `Source` 选择 `GitHub Actions`。
3. 回到 `Actions`，等待 `Deploy to GitHub Pages` 跑完。
4. 成功后会得到一个 `https://你的用户名.github.io/game/` 形式的网址。

## 操作

手机端：
- 拖动屏幕：环顾四周
- 左下摇杆：走动
- 右下按钮：挖掘 / 放置 / 跳跃
- 顶部色块：选择方块类型

电脑端：
- WASD：移动
- 鼠标拖动：视角
- 空格：跳跃
