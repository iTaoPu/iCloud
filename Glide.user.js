// ==UserScript==
// @name            网页加速器 (Pro)
// @namespace       https://i叚娤.倖鍢.net.cn
// @version         2.1.2
// @author          言氏稗客
// @description     极致稳定的网页预读加速器。支持 DNS 预解析、智能连接池管理及 URL 规范化过滤。
// @match           *://*/*
// @noframes
// @run-at          document-idle
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_registerMenuCommand
// @grant           GM_getResourceText
// @require         https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.min.js
// @resource        swalStyle https://unpkg.com/sweetalert2@10.16.6/dist/sweetalert2.min.css
// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMEQyRkYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMzYTU4RkYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1NiIgZmlsbD0iIzI4MmMyNyIvPjxwYXRoIGQ9Ik00MDAgMjU2Yy0xLjIgMTAwLTExMiAxNzYtMTYwIDE3NlM4NCAzNTYgODQgMjU2IDIzNiA4MCAyODggODBzMTEyIDEwMCAxMTIgMTc2eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI2EpIiBzdHJva2Utd2lkdGg9IjIwIi8+PHBhdGggZD0iTTE2MCAyNTZoMjIwbS02MC02MGw2MCA2MC02MCA2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        get: (k) => GM_getValue(k),
        set: (k, v) => GM_setValue(k, v),
        defaults: {
            stats: 0,
            ext_link: true,
            dns: true,
            store: true,
            delay: 65,
            keywords: 'login\nlogout\nregister\nsignin\nsignup\npay\nedit\ndownload'
        }
    };

    const Logger = {
        stats: () => CONFIG.get('stats') || 0,
        add: () => CONFIG.set('stats', Logger.stats() + 1)
    };

    const Accelerator = {
        prefetched: new Set(),
        dnsCache: new Set(),
        timer: null,

        isSupported() {
            const link = document.createElement('link');
            return link.relList && link.relList.supports && link.relList.supports('prefetch');
        },

        normalizeUrl(url) {
            try {
                const u = new URL(url);
                u.hash = ''; // 忽略锚点，避免重复预读同一页面
                return u.href;
            } catch (e) { return null; }
        },

        shouldPreload(a) {
            if (!a || !a.href || a.hasAttribute('data-no-instant')) return false;
            if (!['http:', 'https:'].includes(a.protocol)) return false;
            
            const url = this.normalizeUrl(a.href);
            if (!url || this.prefetched.has(url)) return false;

            // 过滤静态资源
            if (/\.(zip|rar|7z|pdf|exe|apk|dmg|jpg|png|mp4|mp3)$/i.test(url)) return false;

            // 过滤关键词
            const keys = (CONFIG.get('keywords') || CONFIG.defaults.keywords).split('\n');
            if (keys.some(k => k.trim() && url.toLowerCase().includes(k.trim().toLowerCase()))) return false;

            // 外部链接限制
            if (!CONFIG.get('ext_link') && a.origin !== location.origin) return false;

            return true;
        },

        preload(a) {
            const url = this.normalizeUrl(a.href);
            
            // 1. DNS 预解析
            if (CONFIG.get('dns')) {
                const domain = new URL(url).hostname;
                if (!this.dnsCache.has(domain)) {
                    const dns = document.createElement('link');
                    dns.rel = 'dns-prefetch';
                    dns.href = `//${domain}`;
                    document.head.appendChild(dns);
                    this.dnsCache.add(domain);
                }
            }

            // 2. 商店转换（可选增强）
            if (CONFIG.get('store')) {
                if (url.includes('chrome.google.com/webstore')) a.href = url.replace('chrome.google.com', 'chrome.crxsoso.com');
                else if (url.includes('chromewebstore.google.com')) a.href = url.replace('chromewebstore.google.com', 'chrome.crxsoso.com/webstore');
            }

            // 3. 预读资源
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);

            this.prefetched.add(url);
            Logger.add();
        },

        initEvents() {
            // 鼠标悬停逻辑
            document.addEventListener('mouseover', (e) => {
                const a = e.target.closest('a');
                if (!this.shouldPreload(a)) return;

                this.timer = setTimeout(() => this.preload(a), CONFIG.get('delay') || CONFIG.defaults.delay);
            }, { passive: true });

            document.addEventListener('mouseout', () => {
                if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            }, { passive: true });

            // 触摸屏逻辑
            document.addEventListener('touchstart', (e) => {
                const a = e.target.closest('a');
                if (this.shouldPreload(a)) this.preload(a);
            }, { passive: true });
        }
    };

    const UI = {
        injectStyle() {
            const css = `
                .acc-item { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee; align-items:center; }
                .acc-label { font-weight: bold; font-size: 14px; }
            `;
            const style = document.createElement('style');
            style.innerHTML = css;
            document.head.appendChild(style);
            
            const swalCss = GM_getResourceText('swalStyle');
            if (swalCss) {
                const s = document.createElement('style');
                s.innerHTML = swalCss;
                document.head.appendChild(s);
            }
        },

        setupMenu() {
            GM_registerMenuCommand(`🚀 已加速：${Logger.stats()} 次`, () => {
                Swal.fire({
                    title: '重置计数？',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '确定'
                }).then(r => { if(r.isConfirmed) { CONFIG.set('stats', 0); location.reload(); }});
            });

            GM_registerMenuCommand('⚙️ 配置加速器', () => {
                Swal.fire({
                    title: '加速器设置',
                    html: `
                        <div style="text-align:left">
                            <div class="acc-item"><span class="acc-label">加速站外链接</span><input type="checkbox" id="c-ext" ${CONFIG.get('ext_link')?'checked':''}></div>
                            <div class="acc-item"><span class="acc-label">DNS 预解析</span><input type="checkbox" id="c-dns" ${CONFIG.get('dns')?'checked':''}></div>
                            <div class="acc-item"><span class="acc-label">悬停触发延时 (ms)</span><input type="number" id="c-delay" style="width:60px" value="${CONFIG.get('delay')}"></div>
                            <div style="margin-top:10px" class="acc-label">排除关键词 (每行一个):</div>
                            <textarea id="c-keys" style="width:100%;height:60px;margin-top:5px">${CONFIG.get('keywords')}</textarea>
                        </div>
                    `,
                    preConfirm: () => {
                        CONFIG.set('ext_link', document.getElementById('c-ext').checked);
                        CONFIG.set('dns', document.getElementById('c-dns').checked);
                        CONFIG.set('delay', parseInt(document.getElementById('c-delay').value));
                        CONFIG.set('keywords', document.getElementById('c-keys').value);
                    }
                }).then(r => { if(r.isConfirmed) location.reload(); });
            });
        }
    };

    // 初始化运行
    (function bootstrap() {
        // 初始化配置默认值
        Object.keys(CONFIG.defaults).forEach(key => {
            if (CONFIG.get(key) === undefined) CONFIG.set(key, CONFIG.defaults[key]);
        });

        if (!Accelerator.isSupported()) return;

        UI.injectStyle();
        UI.setupMenu();
        Accelerator.initEvents();
    })();

})();
