/**
 * 高性能纯净版反代配置
 */
const CONFIG = {
  TARGET_HOST: '你.域名.后缀', // 你的目標源站域名
  FORCE_HTTPS: true,                     // 强制目标请求使用 HTTPS
  CORS_ENABLED: true                     // 开启通用跨域支持
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // 1. 构造目标 URL
      let targetUrl = new URL(request.url);
      targetUrl.host = CONFIG.TARGET_HOST;
      if (CONFIG.FORCE_HTTPS) targetUrl.protocol = 'https:';

      // 2. 复制并清洗请求头
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', CONFIG.TARGET_HOST);
      
      // 移除所有 CF 特有头，使 Worker 像一个纯粹的浏览器客户端
      newHeaders.delete('cf-visitor');
      newHeaders.delete('cf-ray');
      newHeaders.delete('cf-connecting-ip');
      newHeaders.delete('x-real-ip');

      // 3. 执行流式代理请求
      const response = await fetch(targetUrl.href, {
        method: request.method,
        headers: newHeaders,
        // 只有非 GET/HEAD 请求才传递 Body（处理 POST, PUT 等）
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'follow'
      });

      // 4. 准备响应头
      const responseHeaders = new Headers(response.headers);
      if (CONFIG.CORS_ENABLED) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
      }

      // 5. 直接返回响应流
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (err) {
      // 致命错误捕获（如源站无法连接）
      return new Response(`Proxy Fatal Error: ${err.message}`, { 
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};