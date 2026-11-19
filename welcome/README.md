# Mofarigano 欢迎页

来源为同工作区 **MovingSpider** 的已核对版本，Git commit：

`4adc2796401530794e5e1223fb34c3a4c303bd0d`

本目录从该版本的 `src/page.html` 渲染得到 `index.html`，包含完整的 18 件物品、蓝色织物／银色／粉黑三主题、蜘蛛、蛛丝、苍蝇光标、收藏抽屉与本地搜索。第三方说明与字体许可保存在本目录，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 与原作的差异

- 模板资源指向本目录下的相对 URL，脚本拆为本地文件。无 CDN、包安装、后端或构建步骤；运行不依赖 MovingSpider 的原目录。
- 在 `Welcome！` 下方加入「进入网站 ↗」胶囊按钮。保留原字标位置和全部场景交互。
- 按钮位于 DOM 中第一个可聚焦位置，不使用 autofocus；ID 为 `enter-journal`，在场景结构解析后即可进入；有 `data-no-spider`，不触发扑跳，绘制层级高于物件及蛛丝。
- 主站从 HTML 并行请求欢迎页。外层入口和场景共用 `texture-previews.css` 中的三套原图预览，记住上次选择的主题。蜘蛛优先绘制，随后加载当前主题原图并渐变切换，其余主题按需请求。
- 只在按钮 click 时操作：嵌入 iframe 时发送 `parent.postMessage({type:'mofarigano:enter'}, location.origin)`；独立打开时按钮显示「进入主站」，在当前标签跳转 `../`。没有倒数或自动进入。
- 页面语言、标题和描述调整为个人站欢迎页。原作的减少动态效果逻辑保持不变，入口按钮始终可用。

主站收到同源消息并检查 `event.source` 后移除此 iframe，即会终止欢迎页的浏览上下文与动画。没有在欢迎页里另设隐藏后继续运行的循环。

## 打开

从个人站目录的静态 HTTP 服务访问 `welcome/`。该目录可整体复制部署。默认主题为蓝色织物；保留原作 `?theme=...` 参数与 `movingspider-theme` 本地偏好规则。

入口在桌面按原字标底边向下 20px 定位，手机按字标底边向下 15px 定位；按钮独立层级为 5，原画布层级为 2。
