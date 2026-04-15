/**
 * 高性能纯净版反代 (环境变量解耦版)
 * 特性：自定义域名优化、Cookie 域名改写、基于 IP 锁定的随机 UA、深度风控清洗
 */

const DEFAULT_CONFIG = {
  // 默认目标域名（如果环境变量未设置，则使用此值）
  TARGET_HOST: '你.域名.后缀', 
  FORCE_HTTPS: true,
  CORS_ENABLED: true
};

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
];

export default {
  async fetch(request, env, ctx) {
    try {
      /**
       * 优先级：环境变量 env.TARGET_HOSTNAME > 代码内默认配置
       * 你可以在 Cloudflare Workers 设置 -> 变量 -> 环境变量中添加 TARGET_HOSTNAME
       */
      const actualTargetHost = env.TARGET_HOSTNAME || DEFAULT_CONFIG.TARGET_HOST;
      
      const url = new URL(request.url);
      const proxyHost = url.host; 
      
      // 1. 构造目标 URL
      const targetUrl = new URL(url.pathname + url.search, `https://${actualTargetHost}`);
      if (!DEFAULT_CONFIG.FORCE_HTTPS) targetUrl.protocol = url.protocol;

      // 2. 准备请求头
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', actualTargetHost);
      newHeaders.set('Referer', `https://${actualTargetHost}/`);
      
      // 3. 基于 IP 锁定的随机 UA
      const visitorIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      let hash = 0;
      for (let i = 0; i < visitorIP.length; i++) {
        hash = ((hash << 5) - hash) + visitorIP.charCodeAt(i);
        hash |= 0; 
      }
      const uaIndex = Math.abs(hash) % UA_POOL.length;
      newHeaders.set('User-Agent', UA_POOL[uaIndex]);

      // 4. 深度清洗
      const dropHeaders = ['cf-visitor', 'cf-ray', 'cf-connecting-ip', 'cf-ipcountry', 'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto'];
      dropHeaders.forEach(h => newHeaders.delete(h));

      // 5. 执行代理请求
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual'
      });

      // 6. 处理响应头
      let responseHeaders = new Headers(response.headers);
      
      // 改写 Set-Cookie 中的域名
      const setCookie = responseHeaders.get('Set-Cookie');
      if (setCookie) {
        const updatedCookie = setCookie.replace(
          new RegExp(actualTargetHost.replace(/\./g, '\\.'), 'gi'), 
          proxyHost
        );
        responseHeaders.set('Set-Cookie', updatedCookie);
      }

      // 7. CORS 处理
      if (DEFAULT_CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
      }

      responseHeaders.delete('content-security-policy');
      responseHeaders.delete('content-security-policy-report-only');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
    }
  }
};