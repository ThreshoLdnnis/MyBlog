# 字体来源与许可

本站使用已有 Daydream / 超级喵Star 资源包中的本地字体文件：

| 本地文件 | 字体 | 项目来源 | 许可文件 |
| --- | --- | --- | --- |
| `anton.woff2` | Anton | https://github.com/googlefonts/AntonFont | `Anton-OFL.txt` |
| `instrument.woff2` | Instrument Sans | https://github.com/Instrument/instrument-sans | `InstrumentSans-OFL.txt` |

两种字体均采用 **SIL Open Font License 1.1**。字体版权属于对应项目作者；原许可全文附在本目录。

本地复制来源：`work/meowstar-resource-pack/02-可编辑模板/assets/fonts/`。许可复制来源：`work/meowstar-resource-pack/licenses/`。仅复制既有 WOFF2 与许可文件，未修改字体。

## Editorial 字体系统

新增字体来自 [Google Fonts 官方仓库](https://github.com/google/fonts)，已核对各目录的 `METADATA.pb` 与 OFL。下载使用固定仓库提交，准确 URL、SHA-256、字重轴、Unicode 覆盖范围及文件体积见 `editorial-fonts-sources.json`。原始 Anton / Instrument Sans 及其许可保持不变。

| CSS 家族 | 原字体与用途 | 本地文件 | 体积 | 字重 / 样式 |
| --- | --- | --- | --- | --- |
| `Journal Song` | [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)，中文宋体标题 | `journal-song-core.woff2` | 538,932 bytes | 400–700 可变字重，正体 |
| `Journal Song` | 同一字体的常用汉字补充片 | `journal-song-common.woff2` | 2,026,776 bytes | 400–700 可变字重，正体 |
| `Journal Editorial` | [Instrument Serif](https://github.com/google/fonts/tree/main/ofl/instrumentserif)，英文编辑式强调 | `journal-editorial-italic.woff2` | 24,656 bytes | 400，真正斜体 |
| `Journal Hand` | [Caveat](https://github.com/google/fonts/tree/main/ofl/caveat)，少量英文手写标记 | `journal-hand.woff2` | 52,640 bytes | 400，正体 |

全部新增字体合计 **2,643,004 bytes（约 2.52 MiB）**。`editorial-fonts.css` 定义四条 `@font-face`，中文两片的 `unicode-range` 不重叠：当前页面只需 core；用户输入 core 以外的常用汉字时，浏览器才请求 common。无需连接在线字体服务。

core 收录构建时 `index.html`、`app.js`、`content.js`、`cabinet/cabinet.js`、三个 `modules/*.html` 中的全部 **1,238 种汉字**，以及原字体支持的现有字符、Latin、U+3000–303F 和 U+FF00–FFEF 标点。common 补齐其余 GB2312 汉字，两片合计覆盖 GB2312 的 **6,763 个汉字**及站内额外汉字。未包含的罕见字、新输入字符、韩文、emoji 和其他符号使用系统回退；不宣称这些语言已被中文字体覆盖。

建议引入 `editorial-fonts.css` 后使用以下字体栈；这个文件仅定义字体，不改页面布局或文字：

```css
/* 中文：400–700，缺字逐字回退到本机宋体。 */
font-family: 'Journal Song', 'Noto Serif SC', 'Songti SC', STSong, SimSun, serif;

/* 英文强调：需要显式设置 italic 与 400。 */
font-family: 'Journal Editorial', Georgia, 'Times New Roman', serif;
font-style: italic;
font-weight: 400;

/* 手写：适合少量英文短句，中文应继续使用上面的中文字体栈。 */
font-family: 'Journal Hand', 'Segoe Print', 'Bradley Hand', cursive;
font-weight: 400;
```

三个源字体都采用 SIL Open Font License 1.1，许可原文分别为 `NotoSerifSC-OFL.txt`、`InstrumentSerif-OFL.txt`、`Caveat-OFL.txt`。派生文件经过 fontTools 子集化、WOFF2 压缩；中文变量轴收窄到 400–700，Caveat 固定为 400。派生字体的内部 family / full / PostScript 名称已改为 Journal 系列，保留原作者、版权、商标与许可记录。

`build-editorial-fonts.py` 可从已锁定的官方提交重建字体。需要 Python、fontTools 与 Brotli；脚本只写本目录，原始大型 TTF 留在内存，不随站点部署。新增大量原来未收录的文字后可以重建，以纳入 core；普通 GB2312 汉字也会由补充片直接显示。

## 首页自我介绍

`journal-intro-hand.woff2` 由 [小赖字体 v3.126 的 Xiaolai-Regular.ttf](https://github.com/lxgw/kose-font/releases/tag/v3.126) 派生，CSS 家族名为 `Journal Intro Hand`。使用 fontTools 保留首页介绍四处文案所需的 37 个字符，重命名内部字体家族后转为 WOFF2（8,288 字节），其余字符通过页面字体栈回退。源 TTF 的 SHA-256 为 `e2f68daf0e72777a8cf58bc83de1b98634b251e537ddbfca24b0ae50d1802da2`。

原始许可见 [Xiaolai-OFL.txt](./Xiaolai-OFL.txt)。派生字体同样采用 SIL Open Font License 1.1。

## 关于我

`journal-about-hand.woff2` 使用同一份小赖字体源文件和许可。使用 fontTools 保留个人介绍页标题所需的 23 个字符，内部家族名改为 `Journal About Hand`，压缩后为 6,096 字节。
