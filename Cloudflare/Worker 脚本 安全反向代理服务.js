/**
 * 高性能纯净版反代 - 终极稳定版
 * 特性：自定义域名优化、Cookie 域名改写、基于 IP 锁定的随机 UA、深度风控清洗
 */

const CONFIG = {
  TARGET_HOST: 'third-person-mc.vercel.app', // 目标源站域名
  FORCE_HTTPS: true,                         // 强制使用 HTTPS
  CORS_ENABLED: true                         // 开启跨域支持
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
    try {
      const url = new URL(request.url);
      const proxyHost = url.host; // 你的自定义域名
      
      // 1. 构造目标 URL
      const targetUrl = new URL(url.pathname + url.search, `https://${CONFIG.TARGET_HOST}`);
      if (!CONFIG.FORCE_HTTPS) targetUrl.protocol = url.protocol;

      // 2. 准备请求头
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', CONFIG.TARGET_HOST);
      newHeaders.set('Referer', `https://${CONFIG.TARGET_HOST}/`);
      
      // 3. 基于 IP 锁定的随机 UA 逻辑
      // 确保同一个人（同 IP）访问时 UA 保持一致，避免登录态失效
      const visitorIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      let hash = 0;
      for (let i = 0; i < visitorIP.length; i++) {
        hash = ((hash << 5) - hash) + visitorIP.charCodeAt(i);
        hash |= 0; 
      }
      const uaIndex = Math.abs(hash) % UA_POOL.length;
      newHeaders.set('User-Agent', UA_POOL[uaIndex]);

      // 4. 深度清洗：移除 Cloudflare 特征头，防止源站识别反代
      const dropHeaders = [
        'cf-visitor', 
        'cf-ray', 
        'cf-connecting-ip', 
        'cf-ipcountry', 
        'x-real-ip', 
        'x-forwarded-for',
        'x-forwarded-proto'
      ];
      dropHeaders.forEach(h => newHeaders.delete(h));

      // 5. 执行代理请求
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual' // 手动处理重定向，对登录态更友好
      });

      // 6. 处理响应头
      let responseHeaders = new Headers(response.headers);
      
      // 关键：改写 Set-Cookie 中的域名，确保浏览器能正确存储登录状态
      const setCookie = responseHeaders.get('Set-Cookie');
      if (setCookie) {
        // 将源站域名全局替换为你的自定义域名
        const updatedCookie = setCookie.replace(
          new RegExp(CONFIG.TARGET_HOST.replace(/\./g, '\\.'), 'gi'), 
          proxyHost
        );
        responseHeaders.set('Set-Cookie', updatedCookie);
      }

      // 7. 开启跨域及安全性清理
      if (CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
      }

      // 移除可能导致反代页面资源加载失败的安全策略
      responseHeaders.delete('content-security-policy');
      responseHeaders.delete('content-security-policy-report-only');
      responseHeaders.delete('clear-site-data');

      // 8. 返回结果
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      // 错误捕获
      return new Response(`Proxy Fatal Error: ${err.message}`, { 
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};