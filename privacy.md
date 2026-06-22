# MyTab — Privacy Policy

**Last updated:** 2026-06-22

MyTab ("the extension") replaces your browser's new tab page with a customizable dashboard. This policy explains what data the extension accesses, where it is stored, and which remote services it talks to. MyTab is built to be privacy-friendly: **there is no analytics, no tracking, and no advertising SDK inside the extension.** All of your data lives in your browser unless you explicitly connect a third-party service.

---

## 1. Summary (TL;DR)

- Your shortcuts, settings, and (optional) chat/API tokens are stored **locally in your browser** via `chrome.storage`.
- Your settings sync across your devices **through your browser account** (Chrome/Edge sync), not through our servers.
- The extension makes network requests to fetch **news, weather, and website icons (favicons)**.
- The AI chat and Matrix chat features are **optional** and only contact services that **you configure yourself**.
- We do **not** collect, sell, or share your personal data.

---

## 2. Data stored on your device

MyTab uses the browser's built-in extension storage. None of the following leaves your device through us:

| Data | Storage | Purpose |
|------|---------|---------|
| Your shortcut list (titles, URLs, groups, ordering) | `chrome.storage.local` | Display and manage your shortcuts |
| Your settings (theme, search engine, language, background, etc.) | `chrome.storage.sync` | Remember your preferences; synced via your browser account |
| Weather cache (current conditions) | `chrome.storage.local` | Avoid re-requesting weather too often (refreshed periodically) |
| Your custom RSS feed list & news ordering | `chrome.storage.local` | Power the news widget |
| Matrix access token / bot token | `chrome.storage.local` | Sign in to the Matrix chat **you configure** |
| AI API key | `chrome.storage.local` | Authenticate to the AI endpoint **you configure** |

> Tokens and API keys are kept only in local browser storage and are sent **only** to the services you have explicitly entered in Settings. They are never transmitted to us.

---

## 3. Network requests the extension makes

These requests happen as part of normal feature operation:

- **News feed.** The default news widget fetches an RSS feed from `https://momoyu.cc/`. If you add your own RSS feeds in Settings, the extension asks you — per feed — to grant access to that feed's origin. Only origins you explicitly approve are contacted, and the feed is fetched directly from its own server.
- **Weather.** When the weather widget is enabled, it requests current conditions from the Open-Meteo weather service. To do this it may use your **approximate location**, which your browser asks permission for at runtime via the standard geolocation prompt. Location is used only to fetch weather and is not permanently stored.
- **Website icons (favicons).** To show recognizable icons next to your shortcuts, the extension loads icons from the target website's own `/favicon.ico`, and falls back to Google's favicon service at `https://www.google.com/s2/favicons`. Using this fallback sends the shortcut's domain name to Google.
- **Optional AI chat.** If you enable AI chat and fill in an API endpoint and key, your prompts are sent **directly to the endpoint you configured**. We do not route, store, or see this traffic.
- **Optional Matrix chat.** If you configure Matrix chat, the extension connects (via the Matrix SDK running in the page) to the **homeserver URL you provided**, using the access token you entered.

---

## 4. Permissions and why each is required

- **`storage`** — save your shortcuts, settings, and (optional) chat credentials locally.
- **`tabs`** — read the current tab's URL and title so you can add it as a shortcut, and to look up website icons for your shortcuts.
- **`bookmarks`** — let you import your existing browser bookmarks as shortcuts.
- **Host permission for `https://momoyu.cc/`** — fetch the default news RSS feed used by the news widget.
- **Optional host permissions (`http://*/*`, `https://*/*`)** — requested one origin at a time, only when you add or enable a custom RSS feed, so the extension can read that feed. No origin is contacted unless you approve it in the browser's permission prompt.

MyTab does **not** request permission to read your browsing history, and does not monitor which sites you visit beyond the single tab you actively choose to add as a shortcut.

---

## 5. Third-party services

MyTab itself has no backend server. The only third parties that may receive data are the services listed in Section 3 (news feed, weather, favicon fallback, and any chat/AI services you connect yourself). Each is governed by its own privacy policy. We encourage you to review them if you use those features.

---

## 6. Data retention & deletion

- Data stored in `chrome.storage` persists until you uninstall the extension or clear it via the browser's extension data controls.
- You can remove individual shortcuts, RSS feeds, and chat credentials at any time from within Settings.
- Uninstalling the extension removes the locally stored data.

---

## 7. Children's privacy

MyTab is a general-purpose productivity tool and is not directed at children under 13. We do not knowingly collect personal information from anyone.

---

## 8. Changes to this policy

If the extension's data practices change, this document will be updated and the "Last updated" date revised.

---

## 9. Contact

Source code and issue tracking: https://github.com/Ruciazyt/BrowserMain/issues
<!-- TODO: optionally add a direct contact email here -->

---

# 隐私政策（简体中文）

**最后更新：** 2026-06-22

MyTab（"本扩展"）将浏览器的新标签页替换为一个可自定义的仪表盘。本政策说明本扩展会访问哪些数据、数据存储在哪里，以及会与哪些远程服务通信。MyTab 以隐私友好为设计原则：**扩展内不含任何分析、追踪或广告 SDK。** 除非你主动连接第三方服务，否则你的所有数据都只保存在你自己的浏览器中。

## 1. 概要

- 你的快捷方式、设置及（可选的）聊天/API 令牌都**存储在本地浏览器**中（通过 `chrome.storage`）。
- 你的设置通过**浏览器账号**（Chrome/Edge 同步）在设备间同步，而非经过我们的服务器。
- 扩展会发起网络请求以获取**新闻、天气和网站图标（favicon）**。
- AI 聊天与 Matrix 聊天为**可选功能**，只会连接**你自行配置**的服务。
- 我们**不收集、不售卖、不共享**你的个人数据。

## 2. 存储在本地的数据

| 数据 | 存储位置 | 用途 |
|------|---------|------|
| 快捷方式列表（标题、网址、分组、排序） | `chrome.storage.local` | 显示与管理快捷方式 |
| 设置（主题、搜索引擎、语言、背景等） | `chrome.storage.sync` | 记住偏好；经浏览器账号同步 |
| 天气缓存 | `chrome.storage.local` | 避免频繁重复请求天气 |
| 自定义 RSS 源列表与新闻排序 | `chrome.storage.local` | 支持新闻小组件 |
| Matrix 访问令牌 / 机器人令牌 | `chrome.storage.local` | 登录**你配置的** Matrix 服务 |
| AI API 密钥 | `chrome.storage.local` | 认证**你配置的** AI 端点 |

> 令牌与密钥仅保存在本地浏览器存储中，且**只**发送到你在设置中明确填写的服务，绝不会发送给我们。

## 3. 扩展发起的网络请求

- **新闻源**：新闻小组件默认从 `https://momoyu.cc/` 获取 RSS。你在设置中添加的自定义 RSS 源，扩展会**逐个源**向你请求访问该源域名的授权；只有你明确同意的域名才会被访问，且订阅内容直接从该源自身的服务器获取。
- **天气**：启用天气小组件时会向 Open-Meteo 服务请求天气。为获取天气，可能需要使用你的**大致位置**，浏览器会在运行时通过标准地理定位弹窗向你请求授权。位置仅用于获取天气，不会长期留存。
- **网站图标（favicon）**：为在快捷方式旁显示可识别图标，扩展会从目标网站自身的 `/favicon.ico` 加载，并回退到 Google 图标服务 `https://www.google.com/s2/favicons`。使用该回退会将快捷方式的域名发送给 Google。
- **可选 AI 聊天**：若你启用并填写了 API 端点与密钥，你的提问会**直接发送到你配置的端点**，我们不中转、不存储、也无法看到。
- **可选 Matrix 聊天**：若你配置了 Matrix，扩展会（通过在页面中运行的 Matrix SDK）连接**你填写的 homeserver**，使用你输入的访问令牌。

## 4. 权限说明

- **`storage`**：本地保存快捷方式、设置及（可选的）聊天凭证。
- **`tabs`**：读取当前标签页的网址与标题以便添加为快捷方式，并为快捷方式查找网站图标。
- **`bookmarks`**：将现有浏览器书签导入为快捷方式。
- **`https://momoyu.cc/` 主机权限**：获取新闻小组件使用的默认 RSS 源。
- **可选主机权限（`http://*/*`、`https://*/*`）**：仅在你添加或启用自定义 RSS 源时，**逐个域名**请求授权以便读取该源。未经你在浏览器授权弹窗中同意，不会访问任何域名。

本扩展**不**请求读取浏览历史的权限，也**不**监控你访问了哪些网站——仅在你要添加快捷方式时读取那一个当前标签页。

## 5. 第三方服务

MyTab 本身没有后端服务器。可能接收数据的第三方仅为第 3 节列出的服务（新闻源、天气、图标回退，以及你自行连接的聊天/AI 服务）。各服务受其各自的隐私政策约束。

## 6. 数据留存与删除

- `chrome.storage` 中的数据在你卸载扩展或通过浏览器清除扩展数据前一直保留。
- 你可随时在设置中删除单个快捷方式、RSS 源或聊天凭证。
- 卸载扩展即可移除本地存储的数据。

## 7. 儿童隐私

MyTab 是通用效率工具，不面向 13 岁以下儿童，也不会故意收集任何人的个人信息。

## 8. 政策变更

若扩展的数据实践发生变化，本文件将随之更新并修订"最后更新"日期。

## 9. 联系方式

源码与问题反馈：https://github.com/Ruciazyt/BrowserMain/issues
<!-- TODO：可在此添加直接联系邮箱 -->
