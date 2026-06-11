# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

胡臻烨的个人主页 — 纯静态网站（HTML + CSS + JS），面向亲友展示个人思考、作品和生活记录。设计调性：**温润材质 × 锐利工艺**（暖色调纸质感底色 + 精准动效）。

## 开发命令

```bash
# 本地预览
python -m http.server 8080     # 访问 http://localhost:8080/

# 部署到 GitHub Pages
# Settings → Pages → Source: "Deploy from a branch" → 选 master 分支 → Save
# 等待几分钟后访问 https://qaq82625.github.io/-v2.0/
```

## 技术栈

- **HTML**：纯静态页面结构，六个 `<section>` 区域
- **CSS**：纯 CSS，无预处理/框架，CSS 自定义属性（`--bg`, `--accent` 等）定义在 `:root`
- **JS**：依赖 GSAP 3.12.5 + ScrollTrigger 插件（CDN 引入），无打包/构建工具
- **字体**：Google Fonts — Noto Serif SC（衬线标题）、Noto Sans SC（正文无衬线）、ZCOOL XiaoWei（手写装饰）
- **托管**：GitHub Pages（免费）

## 文件结构

```
├── index.html        # 页面结构，六大区域
├── style.css         # 全局样式、布局、响应式断点
├── script.js         # 所有交互逻辑，GSAP + ScrollTrigger 驱动
├── 设计文档.md        # 完整设计文档（色彩/字体/动效规格/动线走查）
└── assets/
    ├── 头像/            # 关于区头像
    ├── 文章封面/        # 思考区6篇文章封面图
    ├── 手记区/          # 按分类子文件夹：生活/游戏/学习/素材
    └── 音乐素材/        # 页脚隐藏歌单 mp3
```

## 页面区域架构（index.html）

六个 `<section>` 自上而下排列，每个有独立 `id`：

| 区域 | id | 核心机制 |
|------|----|----------|
| 首屏 | `#hero` | 名字+一句话缓入动画，背景光晕跟随鼠标 |
| 关于 | `#about` | 头像+自我介绍，兴趣标签点击展开数据面板 |
| 思考 ⭐ | `#thoughts` | **横向翻阅**：ScrollTrigger pin + scrub 将垂直滚动转为水平位移 |
| 手记 | `#notes` | 瀑布流（CSS columns）+ 分类筛选条，筛选有 GSAP 过渡动画 |
| 联系 | `#contact` | 社交图标悬停浮现提示词 |
| 页脚 | `#footer` | 三重彩蛋：时间问候、隐藏歌单（HTML5 Audio）、隐藏一句话 |

另有两个全局导航元素：顶部固定导航栏 `#nav` 和右侧圆点指示器 `#sideDots`。

## JS 交互架构（script.js）

所有代码在 `DOMContentLoaded` 回调中，分 9 个独立模块，每个用注释分隔：

1. **导航栏** — ScrollTrigger 检测首屏离开/进入，切换 `nav.visible` 类
2. **侧边导航点** — `scroll` 事件监听，根据视口中心判断当前区域，亮起对应圆点
3. **首屏** — GSAP timeline 入场动画 + `requestAnimationFrame` 光晕跟随鼠标（带阻尼缓动）
4. **关于区** — `interestData` 对象存储四个兴趣标签的数据；点击标签展开 `.data-panel`，点击外部关闭
5. **思考区（招牌）** — `ScrollTrigger.create` 将 `#thoughts` pin 住，timeline scrub 驱动 `#thoughtsTrack` 横向 translateX；箭头/圆点点击通过 `scrollToCard()` 控制 ScrollTrigger progress
6. **手记区** — 筛选按钮切换时，先 GSAP fadeOut + scaleDown 隐藏不匹配卡片，再 fadeIn 显示匹配卡片
7. **联系区** — 纯 CSS 处理悬停，无需 JS
8. **页脚彩蛋** — (a) `updateTimeGreeting()` 根据 `new Date().getHours()` 切换问候语 (b) 隐藏歌单：`#musicToggle` 展开/收起，HTML5 `<audio>` 控制播放/切歌 (c) 隐藏一句话：`mouseenter` 1.5s 后用 GSAP opacity 过渡替换版权文字 (d) 回到顶部 `scrollTo`
9. **全局视差** — 手记卡片和思考卡片的封面图有 scrollTrigger scrub 微视差

## CSS 架构（style.css）

- CSS 变量集中在 `:root`（颜色、字体栈、圆角、缓动函数）
- 布局用 flexbox/grid，无 CSS 框架
- 响应式：2 个断点 `@media (max-width: 900px)` 和 `(max-width: 640px)`
  - 900px：手记区瀑布流 3→2 列
  - 640px：手记区瀑布流 2→1 列，隐藏侧边导航点，隐藏思考区箭头，缩小字体和间距
- 动画用 GSAP 而非 CSS animation（除滚动箭头 `scrollBounce` 外）
- 卡片悬浮效果：`translateY(-4px)` + 阴影加深 + 封面图 `scale(1.03~1.04)`

## 重要约定

- 思考区横向翻阅在手机上 **降级为竖直排列**（640px 以下卡片的 flex-shrink 和单列布局自然降级——实际尚未完美处理 ScrollTrigger pin 在移动端的体验，如需改进应在 JS 的 `createThoughtScroll()` 中检测 `window.innerWidth < 640` 并跳过 pin/scrub）
- 所有素材路径使用中文文件夹名（文章封面、手记区、头像、音乐素材），不要重命名
- Google Fonts 通过 CDN 加载，离线环境需替换为本地字体或删除 `@import`
- mp3 文件较大（~12MB 两首），首次加载不会阻塞页面渲染（`preload="none"`）
