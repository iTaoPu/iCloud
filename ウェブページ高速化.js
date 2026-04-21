// ==UserScript==
// @name            网页加速器 (Ultra Pro Max)
// @namespace       https://i叚娤.倖鍢.net.cn
// @version         3.6.0
// @author          言氏稗客
// @description     全平台、全环境极致兼容。支持 Chrome/Firefox (PC+移动) 与 AdGuard 零压调度，双端优化。
// @match           *://*/*
// @run-at          document-idle
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_registerMenuCommand
// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMEQyRkYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMzYTU4RkYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1NiIgZmlsbD0iIzI4MmMyNyIvPjxwYXRoIGQ9Ik00MDAgMjU2Yy0xLjIgMTAwLTExMiAxNzYtMTYwIDE3NlM4NCAzNTYgODQgMjU2IDIzNiA4MCAyODggODBzMTEyIDEwMCAxMTIgMTc2eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI2EpIiBzdHJva2Utd2lkdGg9IjIwIi8+PHBhdGggZD0iTTE2MCAyNTZoMjIwbS02MC02MGw2MCA2MC02MCA2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=
// ==/UserScript==

(function (window, document) {
    'use strict';

    // 1. 静态策略配置（自适应 PC 与 移动端）
    const UA = navigator.userAgent;
    const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);
    const IS_FIREFOX = /Firefox/i.test(UA);
    const POOL_LIMIT = IS_MOBILE ? 12 : 30; // 移动端 12 个并发，PC 端 30 个
    const TRIGGER_MS = IS_MOBILE ? 220 : 130; // 移动端防误触触发更保守
    const prefetched = new Set();
    let shutter = null;

    // 2. 极致性能保护
    const shouldAbort = () => {
        const link = document.createElement('link');
        if (!link.relList?.supports?.('prefetch')) return true;
        
        // 流量与省流量模式保护
        const n = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (n && (n.saveData || /2g|3g/.test(n.effectiveType))) return true;

        // 硬件保护：低核心 CPU 自动放弃
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) return true;
        
        return false;
    };

    // 3. 深度 URL 清洗与安全过滤
    const sanitize = (el) => {
        if (!el || el.tagName !== 'A' || el.hasAttribute('data-no-instant')) return null;
        try {
            const u = new URL(el.href, location.href);
            // 仅 HTTPS，过滤同页锚点、黑名单、大文件
            if (u.protocol !== 'https:' || u.href.split('#')[0] === location.href.split('#')[0]) return null;
            if (prefetched.has(u.href) || prefetched.size >= POOL_LIMIT) return null;
            if (!GM_getValue('ext', false) && u.origin !== location.origin) return null;
            if (/(logout|login|sign|pay|del|exit|reset|cart|order|api)/i.test(u.href)) return null;
            if (/\.(zip|rar|7z|pdf|exe|apk|dmg|jpg|png|gif|webp|mp4|mp3|iso|torrent)$/i.test(u.pathname)) return null;
            
            return u.href;
        } catch(e) { return null; }
    };

    // 4. 任务执行器（双重异步切片：Idle + Microtask）
    const dispatch = (url) => {
        const work = () => {
            if (prefetched.has(url)) return;
            
            const head = document.head;
            // DNS 预联
            const dns = document.createElement('link');
            dns.rel = 'dns-prefetch';
            dns.href = `//${new URL(url).hostname}`;
            
            // 核心预取
            const pre = document.createElement('link');
            pre.rel = 'prefetch';
            pre.href = url;
            pre.setAttribute('as', 'document');
            if (IS_FIREFOX) pre.crossOrigin = "anonymous"; 

            head.appendChild(dns);
            head.appendChild(pre);
            prefetched.add(url);

            // 统计次数（利用微任务异步处理，不占 UI 时间）
            queueMicrotask(() => {
                GM_setValue('s', (GM_getValue('s', 0) + 1));
            });
        };

        // 终极调度：利用浏览器空闲周期，不抢占主进程
        (window.requestIdleCallback || window.requestAnimationFrame || setTimeout)(work, { timeout: 2000 });
    };

    // 5. 事件闭环
    if (shouldAbort()) return;

    const handle = (e) => {
        const url = sanitize(e.target.closest('a'));
        if (url) {
            if (shutter) clearTimeout(shutter);
            shutter = setTimeout(() => dispatch(url), TRIGGER_MS);
        }
    };

    const kill = () => {
        if (shutter) { clearTimeout(shutter); shutter = null; }
    };

    // 被动监听，确保移动端滑动丝滑不掉帧
    const opt = { passive: true };
    document.addEventListener('mouseover', handle, opt);
    document.addEventListener('mouseout', kill, opt);
    document.addEventListener('touchstart', handle, opt);
    document.addEventListener('touchend', kill, opt);

    // 6. 管理菜单
    GM_registerMenuCommand(`🚀 加速次数: ${GM_getValue('s', 0)}`, () => {
        const ext = GM_getValue('ext', false);
        const mode = IS_MOBILE ? "手机模式" : "PC模式";
        if (confirm(`【加速实验室】\n当前环境: ${mode}\n已为您加速: ${GM_getValue('s', 0)} 次\n外链加速: ${ext ? "开启" : "关闭"}\n\n是否切换外链加速状态？`)) {
            GM_setValue('ext', !ext);
            location.reload();
        }
    });

})(window, document);
