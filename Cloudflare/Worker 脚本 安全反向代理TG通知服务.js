/**
 * 终极稳定版：高性能反代 + Telegram 状态监控 (环境变量解耦版)
 * 特性：环境变量修改域名、基于IP固定随机UA、Cookie重写、深度清洗、TG通知
 */

const DEFAULT_CONFIG = {
  // 默认目标域名（如果环境变量 TARGET_HOSTNAME 未设置，则使用此值）
  TARGET_HOST: '你的域名.后缀', 
  FORCE_HTTPS: true,
  CORS_ENABLED: true,
  TG_TIMEOUT: 3000 // Telegram 请求超时时间
};

// 预置高信誉度浏览器 UA 池
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
];

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const proxyHost = url.host;
    
    // 优先级：环境变量 env.TARGET_HOSTNAME > 代码内默认配置
    const actualTargetHost = env.TARGET_HOSTNAME || DEFAULT_CONFIG.TARGET_HOST;
    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;

    try {
      // 1. 构造目标 URL
      const targetUrl = new URL(url.pathname + url.search, `https://${actualTargetHost}`);
      if (!DEFAULT_CONFIG.FORCE_HTTPS) targetUrl.protocol = url.protocol;

      // 2. 准备请求头 & 深度清洗
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', actualTargetHost);
      newHeaders.set('Referer', `https://${actualTargetHost}/`);

      // 3. 基于 IP 锁定的随机 UA 逻辑
      const visitorIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      let hash = 0;
      for (let i = 0; i < visitorIP.length; i++) {
        hash = ((hash << 5) - hash) + visitorIP.charCodeAt(i);
        hash |= 0;
      }
      const uaIndex = Math.abs(hash) % UA_POOL.length;
      const usedUA = UA_POOL[uaIndex];
      newHeaders.set('User-Agent', usedUA);

      // 4. 清洗特征头
      const dropHeaders = ['cf-visitor', 'cf-ray', 'cf-connecting-ip', 'cf-ipcountry', 'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto'];
      dropHeaders.forEach(h => newHeaders.delete(h));

      // 5. 执行代理请求
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual' 
      });

      // 6. 处理响应头 & 改写 Cookie 域名
      let responseHeaders = new Headers(response.headers);
      const setCookie = responseHeaders.get('Set-Cookie');
      if (setCookie) {
        const updatedCookie = setCookie.replace(
          new RegExp(actualTargetHost.replace(/\./g, '\\.'), 'gi'),
          proxyHost
        );
        responseHeaders.set('Set-Cookie', updatedCookie);
      }

      // 7. CORS 与 安全策略清理
      if (DEFAULT_CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      }
      responseHeaders.delete('content-security-policy');
      responseHeaders.delete('content-security-policy-report-only');
      responseHeaders.delete('clear-site-data');

      // 8. 定制化通知逻辑
      if (token && chatId) {
        const isRootPath = url.pathname === '/' || url.pathname === '/index.html';
        const isSuccess = response.status === 200;
        const isServerError = response.status >= 500;

        if ((isRootPath && isSuccess) || isServerError) {
          ctx.waitUntil(this.sendFullNotify(request, response, targetUrl.href, startTime, env, usedUA));
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      // 9. 致命错误通知
      if (token && chatId) {
        ctx.waitUntil(this.sendErrorNotify(request, err, actualTargetHost, env));
      }
      return new Response(`Proxy Fatal Error: ${err.message}`, { status: 502 });
    }
  },

  async sendFullNotify(request, response, target, startTime, env, usedUA) {
    const duration = Date.now() - startTime;
    const ip = request.headers.get('CF-Connecting-IP') || '未知';
    const country = request.headers.get('CF-IPCountry') || '未知';
    const status = response.status;
    const path = new URL(target).pathname;

    const message = `
<b>${status >= 500 ? '🔥 服务端故障告警' : '🏠 成功访问主页'}</b>
━━━━━━━━━━━━━━━
<b>狀態:</b> ${status}
<b>路徑:</b> <code>${path}</code>
<b>來源:</b> ${ip} (${country})
<b>耗時:</b> ${duration}ms
<b>伪装UA:</b> <code>${usedUA.slice(0, 40)}...</code>
    `.trim();

    await this.postToTelegram(message, env);
  },

  async sendErrorNotify(request, err, target, env) {
    const message = `
<b>🚨 代理系统致命错误</b>
━━━━━━━━━━━━━━━
<b>目標:</b> ${target}
<b>错误:</b> <code>${err.message}</code>
<b>来源IP:</b> ${request.headers.get('CF-Connecting-IP') || '未知'}
    `.trim();
    await this.postToTelegram(message, env);
  },

  async postToTelegram(text, env) {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        }),
        signal: AbortSignal.timeout(DEFAULT_CONFIG.TG_TIMEOUT)
      });
    } catch (e) {}
  }
};
