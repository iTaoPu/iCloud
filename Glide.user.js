// ==UserScript==
// @name            网页加速器 (Pro)
// @namespace       https://i叚娤.倖鍢.net.cn
// @version         2.1.1
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
// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cGF0aCBkPSJNMCA3OWMwLTM1LjQgMjguNS02NCA2My45LTY0LjFzNjQuMSAyOC42IDY0LjEgNjRjMCA5LjQtMi4xIDE4LjQtNS43IDI2LjUtMSAyLjMtMi4zIDQuNi0zLjYgNi43LS40LjYtMSAxLTEuNyAxSDExYy0uNyAwLTEuMy0uNC0xLjctMS0xLjMtMi4yLTIuNS00LjQtMy42LTYuN0MyLjEgOTcuNCAwIDg4LjQgMCA3OXptMjQuNC0zOS43Yy01LjIgNS4xLTkuMiAxMS4xLTEyIDE3LjgtMyA2LjktNC41IDE0LjItNC41IDIxLjhhNTUuODYgNTUuODYgMCAwIDAgNC40IDIxLjhjLjcgMS42IDEuNCAzLjIgMi4yIDQuN2g5OC44Yy44LTEuNSAxLjYtMy4xIDIuMi00LjdhNTUuODYgNTUuODYgMCAwIDAgNC40LTIxLjggNTUuODYgNTUuODYgMCAwIDAtNC40LTIxLjggYy0yLjgtNi43LTYuOS0xMi43LTEyLTE3LjgtNS4xLTUuMi0xMS4xLTkuMi0xNy44LTEyYTU1Ljg2IDU1Ljg2IDAgMCAwLTIxLjgtNC40IDU1Ljg2IDU1Ljg2IDAgMCAwLTIxLjggNC40Yy02LjYgMi44LTEyLjYgNi44LTE3LjcgMTB6IiBmaWxsPSIjNDQ0Ii8+// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMCAtMTAgMTQ4IDE0OCI+// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMCAtMTAgMTQ4IDE0OCI+PHBhdGggZD0iTTAgNzljMC0zNS40IDI4LjUtNjQgNjMuOS02NC4xczY0LjEgMjguNiA2NC4xIDY0YzAgOS40LTIuMSAxOC40LTUuNyAyNi41LTEgMi4zLTIuMyA0LjYtMy42IDYuNy0uNC42LTEgMS0xLjcgMUgxMWMtLjcgMC0xLjMtLjQtMS43LTEtMS4zLTIuMi0yLjUtNC40LTMuNi02LjdDMi4xIDk3LjQgMCA4OC40IDAgNzl6bTI0LjQtMzkuN2MtNS4yIDUuMS05LjIgMTEuMS0xMiAxNy44LTMgNi45LTQuNSAxNC4yLTQuNSAyMS44YTU1Ljg2IDU1Ljg2IDAgMCAwIDQuNCAyMS44Yy43IDEuNiAxLjQgMy4yIDIuMiA0LjdoOTguOGMuOC0xLjUgMS42LTMuMSAyLjItNC43YTU1Ljg2IDU1Ljg2IDAgMCAwIDQuNC0yMS44IDU1Ljg2IDU1Ljg2IDAgMCAwLTQuNC0yMS44IGMtMi44LTYuNy02LjktMTIuNy0xMi0xNy44LTUuMS01LjItMTEuMS05LjItMTcuOC0xMmE1NS44NiA1NS44NiAwIDAgMC0yMS44LTQuNCA1NS44NiA1NS44NiAwIDAgMC0yMS44IDQuNGMtNi42IDIuOC0xMi42IDYuOC0xNy43IDEweiIgZmlsbD0iIzQ0NCIvPjxwYXRoIGQ9Ik0xMi40IDU3LjFjMi44LTYuNyA2LjktMTIuNyAxMi0xNy44IDUuMS01LjIgMTEuMS05LjIgMTcuOC0xMkE1NS44NiA1NS44NiAwIDAgMSA2NCAyMi45YTU1Ljg2IDU1Ljg2IDAgMCAxIDIxLjggNC40YzYuNyAyLjggMTIuNyA2LjkgMTcuOCAxMiA1LjIgNS4xIDkuMiAxMS4xIDEyIDE3LjhhNTUuODYgNTUuODYgMCAwIDEgNC40IDIxLjggNTUuODYgNTUuODYgMCAwIDEtNC40IDIxLjhjLS43IDEuNi0xLjQgMy4yLDIuMiA0LjdIMTQuNmMtLjgtMS41LTEuNi0zLjEtMi4yLTQuN0E1NS44NiA1NS44NiAwIDAgMSA4IDc4LjljLS4xLTcuNiAxLjQtMTQuOSA0LjQtMjEuOHoiIGZpbGw9IiM2NDk5NTAiLz48cGF0aCBkPSJNNzcuNSA2MC45QzY4IDgxLjIgNjQuOSA4NC42IDY0LjYgODVjLTEuNSAxLjUtMy41IDIuMy01LjYgMi4zcy00LjEtLS44LTUuNi0yLjNhNy45MSA3LjkxIDAgMCAxIDAtMTEuMmMuMy0uNCAzLjgtMy40IDI0LjEtMTIuOXptMC04Yy0xLjEgMC0yLjMuMi0zLjQuOEM2My4yIDU4LjggNTEgNjQuOSA0Ny44IDY4LjFjLTYuMiA2LjItNi4yIDE2LjMgMCAyMi41IDMuMSAzLjEgNy4yIDQuNyAxMS4yIDQuN3M4LjEtMS42IDExLjItNC43YzMuMi0zLjIgOS4zLTE1LjQgMTQuNC0yNi4zIDIuNi01LjYtMS43LTExLjQtNy4xLTExLjR6TTYzLjkgMjkuOGMtMjcuMiAwLTQ5LjUgMjIuNi00OS4xIDQ5LjggMCAzLjYuNSA3LjIgMS4zIDEwLjYuNCAxLjggMiAzLjEgMy45IDMuMSAyLjYgMCA0LjQtMi40IDMuOS00LjktLjctMy0xLjEtNi4yLTEuMS05LjNBNDIuMDQgNDIuMDQgMCAwIDEgMjYgNjNjMi01IDUtOS40IDguOC0xMy4yUzQzIDQzLjEgNDcuOSA0MWE0Mi4wNCA0Mi4wNCAwIDAgMSAzMi4yIDBjNC45IDIuMSA5LjMgNS4xIDEzLjEgOC45Qzk3IDUzLjYgOTkuOSA1OCAxMDIgNjNhNDIuMDQgNDIuMDQgMCAwIDEgMy4yIDE2LjFjMCAzLjItLjQgNi4zLTEuMS05LjMtLjYgMi41IDEuMyA0LjkgMy45IDQuOSAxLjggMCAzLjUtMS4zIDMuOS0zLjEuOC0zLjYgMS4zLTcuMyAxLjMtMTEuMSAwLTI3LjMtMjIuMS00OS4zLTQ5LjMtNDkuM3oiIGZpbGw9IiM0NDQiLz48L3N2Zz4=
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
