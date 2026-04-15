/**
 * 针对 Ugreen/NAS 优化的代理配置
 */
const CONFIG = {
  TARGET_HOST: '你.域名.后缀', // 你的目標域名
  FORCE_HTTPS: true,
  CORS_ENABLED: true,
  TG_TIMEOUT: 3000
};

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;

    try {
      // 1. 设置目标 URL
      let targetUrl = new URL(request.url);
      targetUrl.host = CONFIG.TARGET_HOST;
      if (CONFIG.FORCE_HTTPS) targetUrl.protocol = 'https:';

      // 2. 复制并过滤请求头
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', CONFIG.TARGET_HOST);
      newHeaders.delete('cf-visitor');
      newHeaders.delete('cf-ray');
      newHeaders.delete('cf-connecting-ip');

      // 3. 发起请求
      const response = await fetch(targetUrl.href, {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'follow'
      });

      // 4. 准备回传响应头
      const responseHeaders = new Headers(response.headers);
      if (CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
      }

      // 5. 【定制化通知逻辑】
      if (token && chatId) {
        const isRootPath = url.pathname === '/' || url.pathname === '/index.html';
        const isSuccess = response.status === 200;
        const isServerError = response.status >= 500;

        // 仅在以下两种情况发送通知：
        // 1. 成功打开了主域名（根路径）
        // 2. 后端服务器发生严重错误 (5xx)
        if ((isRootPath && isSuccess) || isServerError) {
          ctx.waitUntil(this.sendFullNotify(request, response, targetUrl.href, startTime, env));
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      // 6. 严重系统错误告警 (如网络彻底断开)
      if (token && chatId) {
        ctx.waitUntil(this.sendErrorNotify(request, err, CONFIG.TARGET_HOST, env));
      }
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  },

  async sendFullNotify(request, response, target, startTime, env) {
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
<b>設備:</b> <code>${request.headers.get('User-Agent')?.slice(0, 50) || 'None'}...</code>
    `.trim();

    await this.postToTelegram(message, env);
  },

  async sendErrorNotify(request, err, target, env) {
    const message = `
<b>🔥 代理系统致命错误</b>
━━━━━━━━━━━━━━━
<b>目標:</b> ${target}
<b>錯誤:</b> <code>${err.message}</code>
<b>來源IP:</b> ${request.headers.get('CF-Connecting-IP') || '未知'}
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
        signal: AbortSignal.timeout(CONFIG.TG_TIMEOUT)
      });
    } catch (e) {}
  }
};