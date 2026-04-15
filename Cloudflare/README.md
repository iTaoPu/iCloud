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
| `TARGET_HOSTNAME`      | 目标域名（添加需要代码的目标域名） |
| `FORCE_HTTPS` | `true` | 是否强制目标站使用 HTTPS |
| `CORS_ENABLED` | `true` | 是否允许跨域请求 |

> 如果不需要通知，**不设置这两个变量即可**，Worker 仍会正常代理。

### 3. 修改目标域名
在代码顶部的配置区域修改 `TARGET_HOST` 为您的实际目标域名（**不含协议和路径**）

### 4. 保存并部署

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。建议先开启 `NOTIFY_ALL_REQUESTS` 并配置 Telegram 进行充分测试。

---

**Enjoy your private proxy on Cloudflare Workers! 🎉**
