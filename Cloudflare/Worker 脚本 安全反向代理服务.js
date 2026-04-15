/**
 * 高性能纯净版反代 (变量兼容 + 性能安全优化版)
 * 特性：HTMLRewriter 流式处理、Location 深度拦截、变量解耦
 */

const DEFAULT_CONFIG = {
  TARGET_HOST: '目标域名', 
  FORCE_HTTPS: true,
  CORS_ENABLED: true
};

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
];

export default {
  async fetch(request, env, ctx) {
    try {
      const actualTargetHost = env.TARGET_HOSTNAME || DEFAULT_CONFIG.TARGET_HOST;
      const url = new URL(request.url);
      const proxyHost = url.host; 
      
      const targetUrl = new URL(url.pathname + url.search, `https://${actualTargetHost}`);
      if (!DEFAULT_CONFIG.FORCE_HTTPS) targetUrl.protocol = url.protocol;

      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', actualTargetHost);
      newHeaders.set('Referer', `https://${actualTargetHost}/`);
      
      // IP 锁定 UA 逻辑
      const visitorIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      let hash = 0;
      for (let i = 0; i < visitorIP.length; i++) {
        hash = ((hash << 5) - hash) + visitorIP.charCodeAt(i);
        hash |= 0; 
      }
      newHeaders.set('User-Agent', UA_POOL[Math.abs(hash) % UA_POOL.length]);

      // 清洗请求头
      const dropHeaders = ['cf-visitor', 'cf-ray', 'cf-connecting-ip', 'cf-ipcountry', 'x-real-ip', 'x-forwarded-for'];
      dropHeaders.forEach(h => newHeaders.delete(h));

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual'
      });

      let responseHeaders = new Headers(response.headers);
      
      // 1. 拦截重定向
      const location = responseHeaders.get('Location');
      if (location) {
        responseHeaders.set('Location', location.replace(new RegExp(actualTargetHost, 'gi'), proxyHost));
      }

      // 2. 改写 Cookie
      const setCookie = responseHeaders.get('Set-Cookie');
      if (setCookie) {
        responseHeaders.set('Set-Cookie', setCookie.replace(new RegExp(actualTargetHost.replace(/\./g, '\\.'), 'gi'), proxyHost));
      }

      // 3. 安全与私有化配置
      if (DEFAULT_CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
      }
      responseHeaders.set('X-Robots-Tag', 'noindex, nofollow'); // 禁止搜索引擎收录私用链接
      responseHeaders.delete('content-security-policy');
      responseHeaders.delete('x-frame-options');

      const contentType = responseHeaders.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        return new HTMLRewriter()
          // 注入防 JS 跳转补丁
          .on('head', {
            element(el) {
              el.append(`<script>
                // 劫持跳转，防止 JS 逻辑跳回原站
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                  originalReplace.call(window.location, url.replace('${actualTargetHost}', '${proxyHost}'));
                };
              </script>`, { html: true });
            }
          })
          // 覆盖更多的标签属性
          .on('a, link, img, script, form', {
            element(el) {
              const attr = el.tagName === 'link' || el.tagName === 'a' ? 'href' : (el.tagName === 'form' ? 'action' : 'src');
              const value = el.getAttribute(attr);
              if (value && value.includes(actualTargetHost)) {
                el.setAttribute(attr, value.replace(new RegExp(actualTargetHost, 'g'), proxyHost));
              }
            }
          })
          .transform(new Response(response.body, { status: response.status, headers: responseHeaders }));
      }

      return new Response(response.body, { status: response.status, headers: responseHeaders });

    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  }
};
