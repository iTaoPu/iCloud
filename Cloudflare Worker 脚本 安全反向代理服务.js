// 目标域名（仅域名，不含协议和路径，可包含端口）
const TARGET_HOST = '******';  // 请修改为实际域名

// 是否强制使用 HTTPS（设为 false 则保持原始请求协议，或自动跟随重定向）
const FORCE_HTTPS = true;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // 1. 构建目标 URL
    const url = new URL(request.url);
    url.host = TARGET_HOST;                 // 替换域名（保留端口）
    url.protocol = FORCE_HTTPS ? 'https:' : url.protocol;

    // 2. 过滤敏感头并准备新头部
    const safeHeaders = new Headers(request.headers);
    safeHeaders.delete('Cookie');
    safeHeaders.delete('Authorization');
    safeHeaders.set('Host', TARGET_HOST);   // 设置正确的 Host

    // 3. 构造请求参数（GET/HEAD 不带 body）
    const requestInit = {
      method: request.method,
      headers: safeHeaders,
      redirect: 'follow',                    // 自动跟随重定向
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      requestInit.body = request.body;
    }

    // 4. 发起代理请求
    const response = await fetch(url, requestInit);

    // 5. 创建新响应，添加 CORS 头
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    // 可选：添加 Vary 头，避免缓存问题
    newResponse.headers.append('Vary', 'Origin');

    return newResponse;

  } catch (error) {
    // 6. 返回详细的错误信息（仅用于调试，生产环境可精简）
    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message,
      stack: error.stack,
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

