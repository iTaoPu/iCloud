/**
 * 终极稳定监控版：高性能流式反代 + Telegram 异步通知
 * 特性：HTMLRewriter 流式处理、防跳转补丁、JS/Cookie 域名重写、TG 状态告警
 */

const DEFAULT_CONFIG = {
  TARGET_HOST: '目标域名', 
  FORCE_HTTPS: true,
  CORS_ENABLED: true,
  TG_TIMEOUT: 3000 // Telegram 请求超时时间
};

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
];

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const proxyHost = url.host;
    const actualTargetHost = env.TARGET_HOSTNAME || DEFAULT_CONFIG.TARGET_HOST;
    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;

    try {
      // 1. 构造目标 URL
      const targetUrl = new URL(url.pathname + url.search, `https://${actualTargetHost}`);
      if (!DEFAULT_CONFIG.FORCE_HTTPS) targetUrl.protocol = url.protocol;

      // 2. 准备请求头 & 基于 IP 锁定 UA
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', actualTargetHost);
      newHeaders.set('Referer', `https://${actualTargetHost}/`);

      const visitorIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      let hash = 0;
      for (let i = 0; i < visitorIP.length; i++) {
        hash = ((hash << 5) - hash) + visitorIP.charCodeAt(i);
        hash |= 0;
      }
      const usedUA = UA_POOL[Math.abs(hash) % UA_POOL.length];
      newHeaders.set('User-Agent', usedUA);

      // 深度清洗特征头
      ['cf-visitor', 'cf-ray', 'cf-connecting-ip', 'cf-ipcountry', 'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto']
        .forEach(h => newHeaders.delete(h));

      // 3. 执行代理请求
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual' 
      });

      // 4. 处理响应头 (防跳转 + Cookie 重写)
      let responseHeaders = new Headers(response.headers);
      
      const location = responseHeaders.get('Location');
      if (location) {
        responseHeaders.set('Location', location.replace(new RegExp(actualTargetHost, 'gi'), proxyHost));
      }

      const setCookie = responseHeaders.get('Set-Cookie');
      if (setCookie) {
        responseHeaders.set('Set-Cookie', setCookie.replace(new RegExp(actualTargetHost.replace(/\./g, '\\.'), 'gi'), proxyHost));
      }

      if (DEFAULT_CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      }

      // 清理安全策略以防拦截
      responseHeaders.delete('content-security-policy');
      responseHeaders.delete('x-frame-options');
      responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');

      // 5. 异步通知逻辑 (ctx.waitUntil 不阻塞页面加载)
      if (token && chatId) {
        const isRootPath = url.pathname === '/' || url.pathname === '/index.html';
        if (isRootPath || response.status >= 500) {
          ctx.waitUntil(this.sendFullNotify(request, response, targetUrl.href, startTime, env, usedUA));
        }
      }

      // 6. 高性能流式 HTML 改写 (核心：防跳转补丁)
      const contentType = responseHeaders.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return new HTMLRewriter()
          .on('head', {
            element(el) {
              el.append(`<script>
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                  originalReplace.call(window.location, url.replace('${actualTargetHost}', '${proxyHost}'));
                };
              </script>`, { html: true });
            }
          })
          .on('a, link, img, script, form', {
            element(el) {
              const attr = el.tagName === 'link' || el.tagName === 'a' ? 'href' : (el.tagName === 'form' ? 'action' : 'src');
              const value = el.getAttribute(attr);
              if (value && value.includes(actualTargetHost)) {
                el.setAttribute(attr, value.replace(new RegExp(actualTargetHost, 'g'), proxyHost));
              }
            }
          })
          .transform(new Response(response.body, {
            status: response.status,
            headers: responseHeaders
          }));
      }

      // 7. 非 HTML 内容直接流式返回
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });

    } catch (err) {
      if (token && chatId) {
        ctx.waitUntil(this.sendErrorNotify(request, err, actualTargetHost, env));
      }
      return new Response(`Proxy Fatal Error: ${err.message}`, { status: 502 });
    }
  },

  // Telegram 通知模板
  async sendFullNotify(request, response, target, startTime, env, usedUA) {
    const duration = Date.now() - startTime;
    const ip = request.headers.get('CF-Connecting-IP') || '未知';
    const country = request.headers.get('CF-IPCountry') || '未知';
    const status = response.status;
    const path = new URL(target).pathname;

    const message = `
<b>${status >= 500 ? '🔥 服务端故障告警' : '🏠 成功访问主页'}</b>
━━━━━━━━━━━━━━━
<b>状态:</b> ${status}
<b>路径:</b> <code>${path}</code>
<b>来源:</b> ${ip} (${country})
<b>耗时:</b> ${duration}ms
<b>伪装UA:</b> <code>${usedUA.slice(0, 30)}...</code>
    `.trim();

    await this.postToTelegram(message, env);
  },

  async sendErrorNotify(request, err, target, env) {
    const message = `
<b>🚨 代理系统致命错误</b>
━━━━━━━━━━━━━━━
<b>目标:</b> ${target}
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
    } catch (e) {
      // 这里的静默处理防止 TG 接口挂了影响代理本身
    }
  }
};
