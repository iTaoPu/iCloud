# Cloudflare Workers 反向代理（带可选 Telegram 通知）

一个轻量级、高性能的 Cloudflare Worker，可将任何域名请求代理到您指定的目标服务器，同时支持可选的 Telegram 异常通知。  
适用于：API 聚合、跨域请求中转、隐藏源站 IP、自定义访问控制等场景。

## ✨ 功能特性

- 🔄 **透明代理**：保留原始请求路径、查询参数、请求方法及大部分请求头（包括 Cookie、Authorization）。
- 🛡️ **安全可控**：默认关闭 CORS 全开放，避免数据泄露；错误信息可自定义脱敏。
- 📡 **可选通知**：集成 Telegram Bot，支持请求状态监控（每次请求或仅错误时通知）。
- ⚡ **极速响应**：基于 Cloudflare 全球边缘网络，低延迟。
- 🧪 **测试端点**：通过 `?test_notify=1` 快速验证 Telegram 通知配置。

## 🚀 快速部署

### 1. 创建 Worker
- 登录 [Cloudflare 仪表板](https://dash.cloudflare.com/) → Workers 和 Pages → 创建应用 → 创建 Worker。
- 将 [worker.js](./worker.js) 中的代码复制到在线编辑器。

### 2. 配置环境变量（可选）
在 Worker 的 **设置 → 变量 → 环境变量** 中添加以下变量（如需通知）：

| 变量名                  | 说明                                                   |
| ----------------------- | ------------------------------------------------------ |
| `TELEGRAM_BOT_TOKEN`    | Telegram Bot Token（从 [@BotFather](https://t.me/BotFather) 获取） |
| `TELEGRAM_CHAT_ID`      | 接收通知的 Chat ID（可通过 [@userinfobot](https://t.me/userinfobot) 获取） |
| `TARGET_HOSTNAME`      | 你.域名.后缀（添加需要代码的目标域名） |

> 如果不需要通知，**不设置这两个变量即可**，Worker 仍会正常代理。

### 3. 修改目标域名
在代码顶部的配置区域修改 `TARGET_HOST` 为您的实际目标域名（**不含协议和路径**）

### 4. 保存并部署

## ⚙️ 配置说明

代码顶部提供了几个可调节的参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `TARGET_HOST` | string | `'zrf.ifanr.qzz.io'` | **必须修改**为目标域名（可带端口） |
| `REQUEST_TIMEOUT` | number | `5000` | Telegram 通知请求超时（毫秒） |
| `ENABLE_CORS` | boolean | `false` | 是否添加 `Access-Control-Allow-Origin: *` 头 |
| `NOTIFY_ALL_REQUESTS` | boolean | `true` | `true`=每次请求都通知，`false`=仅状态码≥400时通知 |

> 如果 `NOTIFY_ALL_REQUESTS = false` 且未配置 Telegram，则完全不会触发通知相关代码。

## 📡 使用示例

### 基础代理
假设您的 Worker 域名为 `myproxy.workers.dev`，目标域名为 `api.example.com`，则：

- 访问 `https://myproxy.workers.dev/users/123` → 实际请求 `https://api.example.com/users/123`
- 访问 `https://myproxy.workers.dev/login` (POST) → 转发到 `https://api.example.com/login`，携带原始 Body 和 Headers

### 测试 Telegram 通知
在浏览器中访问：`https://myproxy.workers.dev/?test_notify=1`  
如果配置正确，您会收到一条测试消息，同时页面返回 `{"success": true}`。

## ❓ 常见问题

### 代理后出现 502 错误？
- 检查 `TARGET_HOST` 是否正确（不要包含 `http://` 或 `https://`）。
- 确认目标服务器允许 Cloudflare 的 IP 范围访问。
- 尝试将请求协议强制为 `http:` 或 `https:`（修改 `targetUrl.protocol`）。

### 某些网站无法正常加载（样式丢失、重定向循环）？
- 目标网站可能校验 `Host` 头或 `Origin` 头。本 Worker 已正确设置 `Host`，如果仍有问题，请尝试添加：
  ```javascript
  forwardHeaders.set('Referer', targetUrl.origin);

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。建议先开启 `NOTIFY_ALL_REQUESTS` 并配置 Telegram 进行充分测试。

---

**Enjoy your private proxy on Cloudflare Workers! 🎉**
