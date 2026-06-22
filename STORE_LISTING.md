# MyTab — Store Listing Copy

可直接复制粘贴到 Chrome Web Store 与 Edge Add-ons 后台的字段。两家商店字段基本一致，同一份文案通用。

- **类别 / Category**: Productivity
- **可见性 / Visibility**: Public
- **语言 / Languages**: English + Chinese (Simplified) 简体中文 （在后台分别勾选，并粘贴对应语言文案）

> 提交前请先在 Chrome Web Store 搜索 "MyTab"，确认无显著冲突（同名不强制唯一，但避免与知名扩展混淆）。manifest 的 `name` 已设为 `MyTab`，商店 listing 名称也用 `MyTab`。

---

## A. Short summary / 简短描述（≤132 字符）

**EN**:
```
A beautiful, customizable new tab dashboard: search, shortcuts, news, weather, AI chat and a pixel pet.
```
（约 100 字符）

**ZH**:
```
美观可定制的新标签页仪表盘：搜索、快捷方式、新闻、天气、AI 聊天与像素宠物。
```

---

## B. Detailed description / 详细描述

### English

```
MyTab turns every new tab into a clean, productive dashboard you actually want to look at.

SEARCH, FASTER
A focused search bar with one-tap switching between Google, Bing, Baidu and DuckDuckGo. Type a URL and go. Ctrl/⌘+K jumps straight to the search box.

SHORTCUTS THAT STAY ORGANIZED
Pin your favorite sites to a drag-to-reorder grid. Group them into sections, edit with a right-click, and navigate entirely from the keyboard. Import your existing browser bookmarks, or move shortcuts between devices with JSON import/export.

NEWS & WEATHER AT A GLANCE
A multi-source news feed keeps headlines fresh, while a compact weather widget shows current conditions for your location. Reorder news sources to match what you care about.

AN ASSISTANT, IF YOU WANT ONE
Bring your own AI endpoint (any OpenAI-compatible API) for quick chats and answers right from the new tab. Prefer decentralized chat? Connect a Matrix homeserver and keep up with your rooms without leaving the tab.

MAKE IT YOURS
Choose from preset backgrounds or your own image, fine-tune the glass effect (blur, opacity, saturation, tint), pick your language (English or 简体中文), and adopt a pixel pet companion that lives in the corner of your screen.

PRIVATE BY DESIGN
MyTab has no backend of its own and contains no analytics, ads, or tracking. Your shortcuts and settings are stored locally in your browser. Chat and AI features only contact the services you configure yourself.

FEATURES
• Multi-engine search (Google, Bing, Baidu, DuckDuckGo)
• Drag-to-reorder shortcuts with groups and keyboard control
• Bookmark import + JSON import/export
• Live weather and multi-source RSS news
• Optional AI chat (OpenAI-compatible)
• Optional Matrix chat
• Interactive pixel pet
• Customizable glass-morphism theme and backgrounds
• English & Simplified Chinese
• 100% local data, no tracking

Keyboard shortcuts: Ctrl/⌘+Shift+B to add the current page, Ctrl/⌘+Shift+U to open the add dialog, Alt/⌘+Shift+A for quick add.
```

### 简体中文

```
MyTab 把每一个新标签页变成一个干净、高效、让你愿意多看一眼的仪表盘。

更快的搜索
专注的搜索栏，一键切换 Google / Bing / 百度 / DuckDuckGo。输入网址直达。Ctrl/⌘+K 立刻聚焦搜索框。

井井有条的快捷方式
把常用网站固定到可拖拽排序的网格中，分组管理、右键编辑，完全可用键盘操作。一键导入浏览器书签，或用 JSON 导入导出在设备间迁移。

一眼掌握的新闻与天气
多源新闻流持续刷新头条，紧凑的天气小组件显示你所在地的实时天气。新闻来源可自由排序。

按需开启的助手
接入你自己的 AI 端点（任意 OpenAI 兼容接口），在新标签页直接问答。偏好去中心化？连接 Matrix homeserver，不离开标签页也能跟进你的聊天室。

完全可定制
从预设壁纸或自定义图片中选择，精细调节玻璃拟态效果（模糊、不透明度、饱和度、色调），选择语言（英文 / 简体中文），并领养一只住在屏幕角落的像素宠物。

隐私优先
MyTab 没有自己的后端，不含任何分析、广告或追踪。快捷方式与设置都保存在你的浏览器本地。聊天与 AI 功能只连接你自行配置的服务。

功能
• 多引擎搜索（Google、Bing、百度、DuckDuckGo）
• 可拖拽排序、支持分组与键盘操作的快捷方式
• 书签导入 + JSON 导入导出
• 实时天气与多源 RSS 新闻
• 可选 AI 聊天（OpenAI 兼容）
• 可选 Matrix 聊天
• 互动像素宠物
• 可定制玻璃拟态主题与壁纸
• 中英双语
• 数据完全本地，无追踪

快捷键：Ctrl/⌘+Shift+B 添加当前页，Ctrl/⌘+Shift+U 打开添加对话框，Alt/⌘+Shift+A 快速添加。
```

---

## C. Single purpose statement（CWS 必填，一句话）

**EN**: MyTab replaces the browser's default new tab page with a customizable dashboard that combines search, shortcuts, news, weather, and optional chat tools.

**ZH**: MyTab 将浏览器默认新标签页替换为一个可自定义的仪表盘，集成搜索、快捷方式、新闻、天气及可选的聊天工具。

---

## D. Permission justifications（CWS 必填，逐权限）

| Permission | Justification (EN) |
|-----------|--------------------|
| `storage` | Save the user's shortcuts, settings, and (optional) chat/API credentials locally in the browser. |
| `tabs` | Read the active tab's URL and title so the user can add it as a shortcut, and to look up website icons for shortcuts. The extension does not read browsing history. |
| `bookmarks` | Let the user import their existing browser bookmarks as shortcuts. |
| Host `https://momoyu.cc/` | Fetch the default RSS news feed shown in the news widget. |
| `optional_host_permissions` (`http://*/*`, `https://*/*`) | Requested per feed — only when the user adds or enables a custom RSS source — so the extension can read that feed. No origin is accessed without the user's approval in the browser's permission prompt. |

**ZH 版本（如后台需要中文说明）**

| 权限 | 用途说明 |
|------|---------|
| `storage` | 在浏览器本地保存用户的快捷方式、设置及（可选的）聊天/API 凭证。 |
| `tabs` | 读取当前标签页的网址与标题以便添加为快捷方式，并为快捷方式查找网站图标。本扩展不读取浏览历史。 |
| `bookmarks` | 将用户现有的浏览器书签导入为快捷方式。 |
| 主机 `https://momoyu.cc/` | 获取新闻小组件显示的默认 RSS 新闻源。 |
| 可选主机权限 `optional_host_permissions`（`http://*/*`、`https://*/*`） | 仅在用户添加或启用自定义 RSS 源时逐个域名请求授权，以便读取该源。未经用户在浏览器授权弹窗中同意，不会访问任何域名。 |

---

## E. 图形资源规格与截图清单

**图标**：已由 manifest 提供 `icons/icon128.png`（128×128），商店会自动取用。无需额外上传。

**截图（必填，至少 1 张，最多 5 张）**
- 尺寸：1280×800（推荐）或 640×400，PNG/JPG
- 建议 5 张，每张聚焦一个卖点：

| # | 内容 | 建议取景 |
|---|------|---------|
| 1 | 主仪表盘全貌 | 默认背景，同时呈现 时钟 / 问候语 / 搜索栏 / 快捷方式网格 / 新闻 / 天气 / 像素宠物 |
| 2 | 快捷方式网格编辑态 | 展示拖拽排序 + 分组，体现可组织性 |
| 3 | 设置面板 | 玻璃拟态调节滑杆、搜索引擎切换、语言、背景选择 |
| 4 | 新闻 RSS + 天气特写 | 多列新闻卡片 + 天气小组件 |
| 5 | AI 聊天 或 像素宠物互动 | 选视觉上最吸引人的一项 |

截图方法：`pnpm build` 后在 Chrome `chrome://extensions/` 加载 `dist/`，打开新标签页，用系统截图工具按 1280×800 截取（可把浏览器窗口精确调到该尺寸）。

**促销图（可选，非强制）**
- Small promo: 440×280
- (旧版) Marquee: 920×680 — 若有精力可做一张主视觉海报
- CWS 现已不强制要求促销图；有则上传，提升商店展示效果。

---

## F. 提交检查清单（提交前对照）

- [ ] `mytab.zip` 已构建，解开后 `manifest.json` 在根，`name=MyTab`、`version=1.0.0`
- [ ] 隐私政策 URL 已填（GitHub Pages：`https://ruciazyt.github.io/BrowserMain/privacy`）
- [ ] 权限说明已逐项粘贴
- [ ] Single purpose 已填
- [ ] 截图至少 1 张已上传（建议 5 张）
- [ ] 英文 + 简体中文两套 listing 文案已分别填写
- [ ] 在 CWS 搜索 "MyTab" 确认无明显冲突
- [ ] 图形资源：128 图标由 manifest 提供，无需另传
