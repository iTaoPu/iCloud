// ==UserScript==
// @name         网页加速器 (Ultimate Pure Fusion)
// @namespace    https://i叚娤.倖鍢.net.cn
// @version      3.6.0
// @author       言氏稗客
// @description  人的白嫖，就如同高山滚石一般，一旦开始，就再也停不下了 —— 纯原生无依赖，兼顾全功能镜像加速与极致轻量防护
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @icon         https://cdn.jsdelivr.net/gh/iTaoPu/iCloud@Grey/JavaScript/网页加速器.ico
// ==/UserScript==

(function (window, document) {
    'use strict';

    // 1. 默认配置管理
    const DEFAULT_CONFIG = {
        success_times: 0,
        allow_external: false,      // 默认关闭外链加速（保护流量）
        allow_query: true,          // 允许带参数的链接
        enable_store: true,         // 开启应用商店镜像加速
        delay: 130,                 // 悬停触发延迟 (ms)
        exclude_words: "login\nlogout\nregister\nsignin\nsignup\nsignout\npay\ncreate\nedit\ndownload\ndel\nreset\nsubmit\ndoubleclick\ngoogleads\nexit"
    };

    const getConfig = (key) => GM_getValue(key, DEFAULT_CONFIG[key]);
    const setConfig = (key, val) => GM_setValue(key, val);

    // 2. 环境、硬件与流量省电保护
    const UA = navigator.userAgent;
    const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);
    const IS_FIREFOX = /Firefox/i.test(UA);

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

    if (shouldAbort()) return;

    // 3. 应用商店镜像重定向规则 (油小猴精髓)
    const STORE_REGEXES = {
        chrome: /^https?:\/\/chrome\.google\.com\/webstore\/.+?\/([a-z]{32})(?=[\/#?]|$)/,
        chromeNew: /^https?:\/\/chromewebstore\.google\.com\/.+?\/([a-z]{32})(?=[\/#?]|$)/,
        edge: /^https?:\/\/microsoftedge\.microsoft\.com\/addons\/.+?\/([a-z]{32})(?=[\/#?]|$)/,
        firefox: /^https?:\/\/(reviewers\.)?(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\/.*?(?:addon|review)\/([^/<>"'?#]+)/,
        microsoft: /^https?:\/\/(?:apps|www)\.microsoft\.com\/(?:store|p)\/.+?\/([a-zA-Z\d]{10,})(?=[\/#?]|$)/
    };

    const transformStoreUrl = (url) => {
        if (!getConfig('enable_store')) return url;
        if (STORE_REGEXES.chrome.test(url)) return url.replace("chrome.google.com", "chrome.crxsoso.com");
        if (STORE_REGEXES.chromeNew.test(url)) return url.replace("chromewebstore.google.com", "chrome.crxsoso.com/webstore");
        if (STORE_REGEXES.edge.test(url)) return url.replace("microsoftedge.microsoft.com", "microsoftedge.crxsoso.com");
        if (STORE_REGEXES.firefox.test(url)) return url.replace("addons.mozilla.org", "addons.crxsoso.com");
        if (STORE_REGEXES.microsoft.test(url)) return url.replace(/(www|apps)\.microsoft\.com/, "apps.crxsoso.com");
        return url;
    };

    // 4. 深度 URL 清洗与安全过滤
    const prefetched = new Set();

    const sanitize = (el) => {
        if (!el || el.tagName !== 'A' || !el.href) return null;
        if (el.hasAttribute('data-no-instant')) return null;

        try {
            let href = el.href;

            // 百度跳转链接 HTTPS 兼容修正
            if (href.startsWith('http://www.baidu.com/link?url')) {
                href = href.replace('http', 'https');
            }

            const u = new URL(href, location.href);

            // 协议过滤
            if (!['http:', 'https:'].includes(u.protocol)) return null;
            if (u.protocol === 'http:' && location.protocol === 'https:') return null;

            // 同页锚点过滤
            if (u.protocol + u.host + u.pathname + u.search === location.protocol + location.host + location.pathname + location.search && u.hash) {
                return null;
            }

            // 关键词黑名单过滤
            const excludeKeywords = getConfig('exclude_words').split('\n').filter(Boolean);
            const fullUrlStr = u.href.toLowerCase();
            for (const kw of excludeKeywords) {
                if (kw && fullUrlStr.includes(kw.toLowerCase())) {
                    const isStore = Object.values(STORE_REGEXES).some(reg => reg.test(u.href));
                    if (!isStore) return null;
                }
            }

            // 外部链接策略
            if (!getConfig('allow_external') && u.origin !== location.origin && !('instant' in el.dataset)) {
                return null;
            }

            // 参数链接策略
            if (!getConfig('allow_query') && u.search && !('instant' in el.dataset)) {
                return null;
            }

            // 大文件或非网页后缀过滤
            if (/\.(zip|rar|7z|pdf|exe|apk|dmg|iso|torrent)$/i.test(u.pathname)) return null;

            const finalUrl = transformStoreUrl(u.href);
            if (prefetched.has(finalUrl)) return null;

            return finalUrl;
        } catch (e) {
            return null;
        }
    };

    // 5. 核心任务执行器（双重切片：Idle + Microtask）
    const dispatch = (url, linkElement) => {
        if (prefetched.has(url)) return;

        const work = () => {
            if (prefetched.has(url)) return;

            if (linkElement && linkElement.href !== url) {
                linkElement.href = url;
            }

            const head = document.head;
            const dns = document.createElement('link');
            dns.rel = 'dns-prefetch';
            dns.href = `//${new URL(url).hostname}`;

            const pre = document.createElement('link');
            pre.rel = 'prefetch';
            pre.href = url;
            pre.setAttribute('as', 'document');
            if (IS_FIREFOX) pre.crossOrigin = "anonymous";

            head.appendChild(dns);
            head.appendChild(pre);
            prefetched.add(url);

            // 异步无感知累加计数
            queueMicrotask(() => {
                setConfig('success_times', getConfig('success_times') + 1);
            });
        };

        (window.requestIdleCallback || window.requestAnimationFrame || setTimeout)(work, { timeout: 2000 });
    };

    // 6. 事件闭环绑定（兼容防误触）
    let shutter = null;
    let lastTouchTime = 0;
    const TRIGGER_MS = IS_MOBILE ? 200 : getConfig('delay');

    const handleTouchStart = (e) => {
        lastTouchTime = performance.now();
        const link = e.target.closest('a');
        const url = sanitize(link);
        if (url) dispatch(url, link);
    };

    const handleMouseOver = (e) => {
        if (performance.now() - lastTouchTime < 800) return;

        const link = e.target.closest('a');
        const url = sanitize(link);
        if (url) {
            if (shutter) clearTimeout(shutter);
            shutter = setTimeout(() => dispatch(url, link), TRIGGER_MS);
        }
    };

    const handleMouseOut = () => {
        if (shutter) {
            clearTimeout(shutter);
            shutter = null;
        }
    };

    const opt = { passive: true };
    document.addEventListener('touchstart', handleTouchStart, opt);
    document.addEventListener('mouseover', handleMouseOver, opt);
    document.addEventListener('mouseout', handleMouseOut, opt);

    // 7. 纯原生轻量配置弹窗（无需 CDN，精致美观）
    GM_addStyle(`
        #fusion-setting-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
        #fusion-setting-box { background: #fff; width: 420px; max-width: 90vw; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 20px; box-sizing: border-box; }
        #fusion-setting-box h3 { margin: 0 0 15px; font-size: 16px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .fusion-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #444; }
        .fusion-col { margin-bottom: 12px; font-size: 14px; color: #444; display: flex; flex-direction: column; }
        .fusion-col textarea { width: 100%; height: 65px; margin-top: 5px; resize: vertical; border: 1px solid #ccc; border-radius: 4px; padding: 6px; box-sizing: border-box; font-size: 12px; }
        .fusion-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
        .fusion-buttons button { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
        #fusion-save { background: #007bff; color: #fff; }
        #fusion-cancel { background: #f1f1f1; color: #333; }
    `);

    const openSettingsModal = () => {
        if (document.getElementById('fusion-setting-mask')) return;

        const mask = document.createElement('div');
        mask.id = 'fusion-setting-mask';
        mask.innerHTML = `
            <div id="fusion-setting-box">
                <h3>🚀 网页加速器配置 (Ultra Pure Fusion)</h3>
                <div class="fusion-row">
                    <label>加速外部链接</label>
                    <input type="checkbox" id="f-ext" ${getConfig('allow_external') ? 'checked' : ''}>
                </div>
                <div class="fusion-row">
                    <label>加速带参数链接 (?)方案</label>
                    <input type="checkbox" id="f-query" ${getConfig('allow_query') ? 'checked' : ''}>
                </div>
                <div class="fusion-row">
                    <label>应用商店镜像加速 (crxsoso)</label>
                    <input type="checkbox" id="f-store" ${getConfig('enable_store') ? 'checked' : ''}>
                </div>
                <div class="fusion-col">
                    <label>排除关键词 (一行一个)</label>
                    <textarea id="f-words">${getConfig('exclude_words')}</textarea>
                </div>
                <div class="fusion-buttons">
                    <button id="fusion-cancel">取消</button>
                    <button id="fusion-save">保存生效</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);

        document.getElementById('fusion-cancel').onclick = () => mask.remove();
        mask.onclick = (e) => { if (e.target === mask) mask.remove(); };

        document.getElementById('fusion-save').onclick = () => {
            setConfig('allow_external', document.getElementById('f-ext').checked);
            setConfig('allow_query', document.getElementById('f-query').checked);
            setConfig('enable_store', document.getElementById('f-store').checked);
            setConfig('exclude_words', document.getElementById('f-words').value);
            mask.remove();
            location.reload();
        };
    };

    // 8. 油猴菜单注册
    GM_registerMenuCommand(`🚀 已加速: ${getConfig('success_times')} 次 (点击清零)`, () => {
        if (confirm("确定要重置加速统计次数吗？")) {
            setConfig('success_times', 0);
            location.reload();
        }
    });
    GM_registerMenuCommand("⚙️ 打开加速器设置面板", openSettingsModal);

})(window, document);
