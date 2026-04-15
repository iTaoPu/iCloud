/**
 * 全量通知代理配置
 */
const CONFIG = {
  TARGET_HOST: 'https://你.域名.后缀', // 你的目標域名
  FORCE_HTTPS: true,                // 建議強制開啟 HTTPS
  CORS_ENABLED: true,               // 允許跨域
  TG_TIMEOUT: 3000                  // 通知超時限制（毫秒）
};

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    let targetUrl = new URL(request.url);
    
    // 從環境變量獲取配置
    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;

    try {
      // 1. 設置目標 URL
      targetUrl.host = CONFIG.TARGET_HOST;
      if (CONFIG.FORCE_HTTPS) targetUrl.protocol = 'https:';

      // 2. 複製並過濾請求頭
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', CONFIG.TARGET_HOST);
      // 清除 Cloudflare 內部頭部，避免目標站拒絕訪問
      newHeaders.delete('cf-visitor');
      newHeaders.delete('cf-ray');
      newHeaders.delete('cf-connecting-ip');

      // 3. 發起遠端請求 (使用流式轉發以優化性能)
      const response = await fetch(targetUrl.href, {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'follow'
      });

      // 4. 準備回傳的響應
      const responseHeaders = new Headers(response.headers);
      if (CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
      }

      // 5. 【核心】觸發全量通知
      // 使用 ctx.waitUntil 確保通知在背景發送，不影響用戶獲取網頁的速度
      if (token && chatId) {
        ctx.waitUntil(this.sendFullNotify(request, response, targetUrl.href, startTime, env));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      // 錯誤捕獲通知
      if (token && chatId) {
        ctx.waitUntil(this.sendErrorNotify(request, err, targetUrl.href, env));
      }
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  },

  /**
   * 正常請求通知邏輯
   */
  async sendFullNotify(request, response, target, startTime, env) {
    const duration = Date.now() - startTime;
    const ip = request.headers.get('CF-Connecting-IP') || '未知';
    const country = request.headers.get('CF-IPCountry') || '未知';
    const method = request.method;
    const status = response.status;

    const message = `
<b>📡 代理請求報告</b>
━━━━━━━━━━━━━━━
<b>狀態:</b> ${status >= 400 ? '⚠️ ' : '✅ '}${status}
<b>路徑:</b> <code>${new URL(target).pathname}</code>
<b>方法:</b> ${method}
<b>來源:</b> ${ip} (${country})
<b>耗時:</b> ${duration}ms
<b>設備:</b> <code>${request.headers.get('User-Agent')?.slice(0, 50) || 'None'}...</code>
    `.trim();

    await this.postToTelegram(message, env);
  },

  /**
   * 系統錯誤通知
   */
  async sendErrorNotify(request, err, target, env) {
    const message = `
<b>🔥 代理系統錯誤</b>
━━━━━━━━━━━━━━━
<b>目標:</b> ${target}
<b>錯誤:</b> <code>${err.message}</code>
<b>來源IP:</b> ${request.headers.get('CF-Connecting-IP') || '未知'}
    `.trim();
    await this.postToTelegram(message, env);
  },

  /**
   * 通用 Telegram POST 方法
   */
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
    } catch (e) {
      console.error('TG通知發送失敗:', e.message);
    }
  }
};
