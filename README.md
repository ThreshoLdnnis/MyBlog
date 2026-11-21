<h1 align="center">📔 Mofarigano · Personal Journal</h1>

<p align="center"><strong>朱飞阳的个人博客、交互作品集与生活收藏。</strong></p>

<p align="center">
  <a href="https://blog.lingozm.cn/"><img alt="访问网站" src="https://img.shields.io/badge/%E7%BD%91%E7%AB%99-blog.lingozm.cn-2f4665?style=flat-square"></a>
  <a href="#-源码分工"><img alt="静态站点" src="https://img.shields.io/badge/%E7%AB%99%E7%82%B9-HTML%20%2F%20CSS%20%2F%20JS-b74750?style=flat-square"></a>
  <a href="#-本地运行"><img alt="Node.js 本地预览" src="https://img.shields.io/badge/%E9%A2%84%E8%A7%88-Node.js-3c7357?style=flat-square"></a>
</p>

<p align="center">
  <a href="#-为什么">为什么</a> ·
  <a href="#-可以在这里做什么">站点功能</a> ·
  <a href="#-本地运行">本地运行</a> ·
  <a href="#-编辑保存与备份">内容备份</a> ·
  <a href="#-常见问题">常见问题</a> ·
  <a href="#-源码分工">源码分工</a> ·
  <a href="#-原模块与素材出处">素材出处</a>
</p>

---

## 💡 为什么

Mofarigano（朱飞阳 / Timofey ）的个人博客与生活收藏空间。把 Fashion Web 系列的巨型排版、纸张质感、立体陈列和人物造型切换，融入一本可翻页的生活手册。已有旅行地图、音乐墙与读书角作为独立页面接入。

本仓库包含静态网站源码与运行素材。欢迎页、旅行地图、音乐墙、读书角和作品预览与主站一同提供。

---

## 🎨 可以在这里做什么

顶部导航直接切换「我、奇点、生活、手记、足迹、音乐、阅读、收藏抽屉、荣誉墙」，右上角目录另提供「手办收藏、关于我、技术栈」的独立入口。每次显示一个栏目，切换时有纸张透视翻页过渡。系统开启「减少动态效果」时立即切换。

每页拥有独立站内地址（例如 `#/works`、`#/music`），可刷新、收藏链接及前进后退。原有 `#works` 等旧链接仍可访问。音乐、地图与书架在打开时加载，离页时卸载。手机顶部采用两行导航，九项主栏目全部可见。也可从右上角目录选择任意页面。

| 模块 | 使用方式 |
| --- | --- |
| 开场与个人信息 | MovingSpider 互动欢迎页，点击 Welcome 下方「进入网站」后进入，不设倒数或自动跳过。页脚可重播。姓名大字支持鼠标或手指划过时粒子消散、离开后回聚。首屏显示本人照片，鼠标划过会沿轨迹撕开粉色骑手造型，约 1.1 秒后收拢。触屏支持滑动。可在目录中编辑个人资料。 |
| 生活时间轴 | 时间线随滚动从 2004 延伸至 2026。用「记下一段」添加记录，再按生活、学习、工作或创业筛选。 |
| 奇点 | 按产品设计、视觉交互、策略模型筛选。点封面打开互动作品，关闭后回到原筛选位置。CookIdea 支持站内操作，Lingo资源聚合平台直达官网。 |
| 旅行足迹 | 进入「猪的世界足迹」，探索世界地图、地点及代表性风景。未填写的日期和个人游记保留为空。 |
| 音乐墙 | 旋转与切换 3D 唱片、阅读歌词、编辑歌曲资料，并为歌曲添加自己的播放来源。 |
| 读书角 | 从立体书架抽取书籍，查看介绍、筛选分类、修改书单和阅读状态。初始书架为 51 本书、42 本已读。 |
| 手办展柜 | 拖动浏览、打开详情、上传自己的照片并添加收藏。支持单独备份。 |
| 收藏夹 | 收录工具、探店、地点、物品、语录与说说等内容，按类别筛选及标记喜欢。 |
| 技术栈与荣誉墙 | 展示技术方向。荣誉区从空白开始，可添加真实证书、奖项和记录。 |
| 博客手记 | 拖动封面检视，打开后拖动页角或用按钮翻页。收录八幅插画，另有两篇可编辑的开场手记，也可以写新的一页。 |

手办展柜以 POP MART 产品图作为**灵感样例**，用图片透视、层次和倾斜呈现立体效果。可以用实拍添加个人收藏。图片来源见展柜详情与[素材出处](./cabinet/assets/sources.json)。

欢迎页复用 [MovingSpider](https://github.com/ThreshoLdnnis/MovingSpider) 的蓝色织物、收藏物件、跳蛛与蛛丝场景，并保留三主题切换。欢迎页独立运行，进入后卸载其动画。每次刷新仍需手动点击进入，站内切换页面不会重复出现。入口支持键盘操作，减少动态效果模式也保留进入按钮。来源与素材说明见[欢迎页文档](./welcome/README.md)。

<details>
<summary>看一眼欢迎页和照片球</summary>

| 成为蛛蛛 | 照片球 |
| --- | --- |
| ![蓝色织物主题的 MovingSpider 欢迎页](./assets/projects/spider.webp) | ![粉色闪粉背景的三维照片球](./assets/projects/orbit-cover.webp) |

</details>

---

## 🚀 本地运行

安装 Node.js 后，可在 Windows 双击 [启动网站.cmd](./启动网站.cmd)，也可在仓库根目录运行以下命令。

```powershell
npm run dev
```

浏览器打开 [http://127.0.0.1:4177/](http://127.0.0.1:4177/)，点击「进入网站」。本地预览只需 Node.js，下载源码即可启动。按 `Ctrl+C` 停止服务。

主站的 ES modules 通过本地 HTTP 服务加载。音乐光盘的 Three.js 和 GSAP 随站点提供，3D 唱片需要浏览器支持 WebGL，外部音源需要联网。

请固定使用同一个浏览器、地址与端口。`localhost`、`127.0.0.1`、不同端口及未来部署域名的浏览器存储互不相通。

---

## 💾 编辑、保存与备份

页脚的「内容管理」用于编辑当前浏览器中的内容。主站使用 `localStorage`，导出文件只包含主站数据。地图、音乐、读书角和手办各自使用独立的数据结构与维护方式。

| 内容 | 保存与迁移方式 |
| --- | --- |
| 主站个人资料、时间轴、文章、收藏、荣誉 | 在「内容管理」使用「导出内容备份 / 导入内容备份」。数据键为 `feiyang-journal-v1`。导入会替换当前主站内容，并自动下载导入前内容的独立备份。迁移前仍建议先导出一份。 |
| 收藏夹的喜欢标记 | 单独保存在 `feiyang-journal-v1-saved`，不包含在主站内容导出中。 |
| 已移除的主站记录 | 进入回收记录，可在内容管理中「恢复上次移除的内容」。 |
| 读书角 | 在「编辑书架」中使用「导出书单 / 导入书单」，数据键为 `laozhu-reading-corner-v1`。 |
| 手办展柜 | 使用「导出收藏 / 导入收藏」，数据键为 `feiyang-cabinet-v1`。只导出个人收藏。导入合并记录并跳过相同 ID，原收藏保留。 |
| 音乐墙 | 歌曲资料、封面与音频保存在 `personal-music-corner` IndexedDB 中。支持导入歌词与音频文件，当前没有整库导出 / 导入入口，请保留原始封面、歌词和音频。 |
| 旅行地图 | 足迹维护在原项目 `work/travel/places.json`。运行原项目的 `assemble.cjs` 后，用生成的 HTML 更新本站的 `modules/map.html`。 |

清除站点数据、换浏览器或换设备前，可分别备份主站、书架和手办。音乐收藏请一并保留原始媒体。

---

## ❓ 常见问题

**怎样更新访客看到的内容？**

本站是静态网站。编辑会保存在你正在使用的浏览器里。要更新所有访客看到的默认内容，请修改 [content.js](./content.js) 或对应模块的数据，再重新部署。浏览器已保存的个人内容优先于源码默认值。

**唱片如何播放？**

音乐墙预置封面与歌曲资料，音频由你在「收藏一首」或「编辑收藏」中上传，也可以填写可直接播放的音源链接。带分享链接的条目会打开音乐平台。

---

## 🧩 源码分工

默认文案与作品列表位于 [content.js](./content.js)。

<details>
<summary>展开文件分工</summary>

| 文件 | 职责 |
| --- | --- |
| `index.html` | 各独立页面、目录、导航与对话框结构。 |
| `styles.css` | 纸张配色、巨型排版、响应式布局与动效。 |
| `app.js` | 页面交互、筛选、文章详情、内容编辑、本地保存及模块入口。 |
| `page-navigation.js` | 站内路由、浏览历史、纸张翻页切换、模块按需加载与离页清理。 |
| `page-navigation.css` | 常驻导航、独立页面布局、桌面与手机翻页动效。 |
| `navigation-polish.css` | 九项双层主导航、响应式品牌排版。 |
| `typography.css` / `room-typography.css` | 主站排版层次，以及音乐、阅读中文标题的轻量字体适配。 |
| `name-particles.js` / `name-particles.css` | 姓名大字的局部粒子消散与回聚。保留可访问文字、触摸和减少动态效果适配。 |
| `portrait-reveal.js` | Fashion Web5 的 Canvas 轨迹蒙版与渐缩恢复，支持鼠标和触摸。 |
| `hero-stickers.js` / `hero-stickers.css` | 首页贴纸排布与轻微跟随动效。 |
| `journal-book.js` / `journal-book-interaction.css` | 封面检视、翻页交互与手记内容。 |
| `life-timeline.js` | 随滚动绘制的生活时间轴。 |
| `content.js` | 个人资料、时间轴、收藏、文章、荣誉及作品的初始内容。 |
| `server.mjs` | 本地静态文件服务器，默认监听 `127.0.0.1:4177`。 |
| `cabinet/` | 独立手办展柜、样例图片、出处与使用说明。 |
| `modules/map.html` | 已有旅行地图的集成副本。 |
| `modules/music.html` | Music of Love 音乐墙的集成副本。 |
| `modules/books.html` | ReadingCorner 读书角的集成副本。 |
| `modules/` | 作品预览的静态入口与运行资源。 |
| `welcome/` | MovingSpider 欢迎页与「成为蛛蛛」的共用场景。 |
| `assets/` | 本人照片、作品封面、字体与预览图。`sources.json` 记录素材来源。 |
| `assets/fonts/` | 自托管字库、Unicode 分片、来源与 SIL Open Font License。 |

</details>

运行 `npm run check` 可检查主站 JavaScript 文件的语法。

---

## 📚 原模块与素材出处

- 音乐墙源自工作区 `Music-of-Love/index.html`。源码与说明见 [Music-of-Love](https://github.com/ThreshoLdnnis/Music-of-Love)。
- 读书角的原文件与初始书单见 [ReadingCorner](https://github.com/ThreshoLdnnis/ReadingCorner)，本站使用 `modules/books.html`。
- 旅行地图的原作与维护源码见 [WebDesign3-LifeMap](https://github.com/ThreshoLdnnis/WebDesign3-LifeMap)，本站使用 `modules/map.html`。
- 首屏本人抠图及粉色骑手均取自 Fashion Web5 的原图。
- 项目封面主要取自原项目与实际运行截图。Lingo资源聚合平台使用提供的官网截图。
- 参考风景保留原作者及许可信息。京都图为 Ray in Manila，里斯本图为 Miguel Vieira，均为 CC BY 2.0。详见[素材来源](./assets/sources.json)。

---

## ✒ 字体与导航设计

导航以中文栏目名称为主，并配有第二行索引。「奇点」的第二行写作「作品」，荣誉墙在桌面和手机顶部均直接可见。姓名大字保留 Anton。正文和控件使用 Instrument Sans 配合系统中文无衬线。中文标题与文章使用 Noto Serif SC 的本地派生字库。英文斜体使用 Instrument Serif。签名和少量题注使用 Caveat，首页介绍使用小赖字体的本地子集。详见[字体来源与许可](./assets/fonts/README.md)。

中文分为当前内容核心片和常用汉字补充片，按需加载。少见字保留系统字体回退。音乐与阅读保留原有英文字体、封面和排版尺寸，进入站内页面时仅轻量适配中文标题。地图保留原有霞鹜文楷。字体加载后会触发模块布局更新。
