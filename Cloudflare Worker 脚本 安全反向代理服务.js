// ========== 配置区域 ==========
const TARGET_HOST = '**********';   // 修改为实际目标域名
const REQUEST_TIMEOUT = 5000;             // Telegram 通知超时（毫秒）
const ENABLE_CORS = false;                // 是否添加 CORS 头（可能干扰原站，默认 false）
const NOTIFY_ALL_REQUESTS = true;         // true=每次请求都通知，false=仅错误时通知
// ==============================

export default {
  async fetch(request, env, ctx) {
    const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = env.TELEGRAM_CHAT_ID;
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     '未知IP';
    const userAgent = request.headers.get('User-Agent') || '未知UA';
    const url = new URL(request.url);
    const requestHostname = url.hostname;

    // 测试端点：?test_notify=1
    if (url.searchParams.has('test_notify')) {
      const testResult = await sendTelegramNotification(
        `🧪 测试通知 (${requestHostname})`,
        clientIP,
        `测试时间: ${new Date().toISOString()}`,
        BOT_TOKEN,
        CHAT_ID
      );
      return new Response(JSON.stringify({ success: testResult }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // OPTIONS 预检请求（如果不需要 CORS，可以忽略）
    if (ENABLE_CORS && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const startTime = Date.now();
    try {
      // 1. 构建目标 URL：保留原始请求的协议、路径、查询参数，仅替换域名
      const targetUrl = new URL(request.url);
      targetUrl.host = TARGET_HOST;
      // 不强制协议，保持原始请求的协议（http 或 https）
      // targetUrl.protocol 保持不变

      // 2. 准备请求头：复制所有原始头，仅修改 Host
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.set('Host', TARGET_HOST);
      // 不再删除 Cookie、Authorization 等任何头

      // 3. 构造请求参数
      const requestInit = {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'follow',     // 跟随重定向
        // 保留原始 body（用于 POST、PUT 等）
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      };

      // 4. 发起代理请求
      const response = await fetch(targetUrl, requestInit);

      // 5. 创建响应，默认透传所有响应头
      const responseHeaders = new Headers(response.headers);
      if (ENABLE_CORS) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.append('Vary', 'Origin');
      }

      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

      // 6. 决定是否发送通知
      const elapsed = Date.now() - startTime;
      const shouldNotify = NOTIFY_ALL_REQUESTS || response.status >= 400;
      
      if (shouldNotify) {
        const extraInfo = `UA: ${userAgent}\n目标URL: ${targetUrl.href}\n状态码: ${response.status} ${response.statusText}\n耗时: ${elapsed}ms`;
        ctx.waitUntil(sendTelegramNotification(
          `📡 代理请求 (${requestHostname})`,
          clientIP,
          extraInfo,
          BOT_TOKEN,
          CHAT_ID
        ));
      }

      return newResponse;

    } catch (error) {
      const elapsed = Date.now() - startTime;
      const extraInfo = `UA: ${userAgent}\n错误: ${error.message}\n堆栈: ${(error.stack || '').slice(0, 500)}\n耗时: ${elapsed}ms`;
      ctx.waitUntil(sendTelegramNotification(
        `🔥 代理致命错误 (${requestHostname})`,
        clientIP,
        extraInfo,
        BOT_TOKEN,
        CHAT_ID
      ));

      // 返回详细的错误信息（方便调试）
      return new Response(JSON.stringify({
        error: 'Proxy error',
        message: error.message,
        stack: error.stack,
        targetUrl: targetUrl?.href,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
};

/**
 * 发送 Telegram 通知
 */
async function sendTelegramNotification(type, ip, addData, botToken, chatId) {
  if (!botToken || !chatId) {
    console.error('[Telegram] 缺少 BotToken 或 ChatId');
    return false;
  }
  try {
    let locationInfo = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        locationInfo = `\n国家: ${data.country || '未知'}\n城市: ${data.city || '未知'}\n组织: ${data.org || '未知'}`;
      }
    } catch (e) {}

    const message = `${type}\nIP: ${ip}${locationInfo}\n<tg-spoiler>${addData}</tg-spoiler>`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=HTML&text=${encodeURIComponent(message)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('[Telegram] 通知发送成功');
      return true;
    } else {
      console.error(`[Telegram] 通知失败 HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`[Telegram] 通知异常: ${error.message}`);
    return false;
  }
}