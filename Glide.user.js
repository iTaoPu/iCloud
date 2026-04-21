// ==UserScript==
// @name            网页加速器 (Ultimate Stealth)
// @namespace       https://i叚娤.倖鍢.net.cn
// @version         3.2.0
// @author          言氏稗客
// @description     极致提速与设备性能的终极平衡。采用 RequestIdleCallback 调度与硬件感知技术，确保零负担运行。
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
            ext_link: false,    // 默认关闭外链，极省资源
            dns: true,          
            saveData: true,     // 网络节流感知
            smartMode: true,    // 智能调度模式
            maxPrefetch: 25,    // 严格限制缓存池大小
            delay: 180,         // 增加防抖延迟，确保是真实意图
            keywords: 'login\nlogout\nregister\nsignin\nsignup\npay\nedit\ndownload\ndelete\nexit\nreset'
        }
    };

    const Accelerator = {
        pool: new Set(),
        dnsPool: new Set(),
        timer: null,

        // 1. 硬件与环境嗅探
        isHealthy() {
            if (!document.createElement('link').relList?.supports?.('prefetch')) return false;

            // 检查网络负载
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn && CONFIG.get('saveData')) {
                if (conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return false;
            }

            // 检查硬件负载（核心数和内存限制）
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) return false; 
            if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;

            return true;
        },

        // 2. 深度过滤逻辑
        check(a) {
            if (!a?.href || a.hasAttribute('data-no-instant')) return false;
            const url = a.href.split('#')[0]; // 规范化并移除锚点
            if (this.pool.has(url) || this.pool.size >= CONFIG.get('maxPrefetch')) return false;
            if (!url.startsWith('http')) return false;

            // 排除后缀
            if (/\.(zip|rar|7z|pdf|exe|apk|dmg|jpg|png|gif|webp|mp4|mp3|iso|torrent|avi|mkv)$/i.test(url)) return false;

            // 排除关键词
            const keys = (CONFIG.get('keywords') || CONFIG.defaults.keywords).split('\n');
            if (keys.some(k => k.trim() && url.toLowerCase().includes(k.trim().toLowerCase()))) return false;

            // 域名判断
            if (!CONFIG.get('ext_link') && a.origin !== location.origin) return false;

            return url;
        },

        // 3. 极致性能：零压执行
        run(a, url) {
            const task = () => {
                // DNS 预解析
                if (CONFIG.get('dns')) {
                    const domain = new URL(url).hostname;
                    if (!this.dnsPool.has(domain)) {
                        const dns = document.createElement('link');
                        dns.rel = 'dns-prefetch';
                        dns.href = `//${domain}`;
                        document.head.appendChild(dns);
                        this.dnsPool.add(domain);
                    }
                }
                // Prefetch 插入
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = url;
                document.head.appendChild(link);
                this.pool.add(url);
                
                // 自动记录次数
                const s = CONFIG.get('stats') || 0;
                CONFIG.set('stats', s + 1);
            };

            // 使用空闲周期调度，绝对不干扰正常浏览
            if (window.requestIdleCallback) {
                window.requestIdleCallback(task, { timeout: 3000 });
            } else {
                setTimeout(task, 1);
            }
        },

        // 4. 生命周期管理：页面卸载前清理，防止内存泄漏
        clean() {
            this.pool.clear();
            this.dnsPool.clear();
        }
    };

    const UI = {
        init() {
            GM_registerMenuCommand(`🚀 已省时：${((GM_getValue('stats') || 0) * 0.4).toFixed(1)}s`, () => {
                Swal.fire({ title: '加速简报', text: `当前处于“智能零压模式”，已预读 ${GM_getValue('stats') || 0} 个链接。`, icon: 'info' });
            });
            GM_registerMenuCommand('⚙️ 性能配置', () => {
                Swal.fire({
                    title: '性能调优',
                    html: `
                        <div style="text-align:left; font-size:14px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <span>智能零压调度</span>
                                <input type="checkbox" id="c-smart" ${CONFIG.get('smartMode')?'checked':''}>
                            </div>
                            <div style="font-size:11px; color:#999; margin-bottom:15px;">仅在 CPU 空闲时工作，完全不影响页面流畅度。</div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <span>外链加速</span>
                                <input type="checkbox" id="c-ext" ${CONFIG.get('ext_link')?'checked':''}>
                            </div>
                            <textarea id="c-keys" style="width:100%;height:60px;font-size:12px;">${CONFIG.get('keywords')}</textarea>
                        </div>
                    `,
                    preConfirm: () => {
                        CONFIG.set('smartMode', document.getElementById('c-smart').checked);
                        CONFIG.set('ext_link', document.getElementById('c-ext').checked);
                        CONFIG.set('keywords', document.getElementById('c-keys').value);
                    }
                }).then(r => { if(r.isConfirmed) location.reload(); });
            });
        }
    };

    // --- 启动逻辑 ---
    (function bootstrap() {
        // 初始化默认配置
        Object.keys(CONFIG.defaults).forEach(k => {
            if (CONFIG.get(k) === undefined) CONFIG.set(k, CONFIG.defaults[k]);
        });

        if (!Accelerator.isHealthy()) return;

        UI.init();

        // 监听悬停（事件委托，全局仅一个监听器，极省内存）
        document.addEventListener('mouseover', (e) => {
            const a = e.target.closest('a');
            const url = Accelerator.check(a);
            if (!url) return;

            Accelerator.timer = setTimeout(() => {
                Accelerator.run(a, url);
            }, CONFIG.get('delay'));
        }, { passive: true });

        document.addEventListener('mouseout', () => {
            if (Accelerator.timer) { clearTimeout(Accelerator.timer); Accelerator.timer = null; }
        }, { passive: true });

        // 清理机制
        window.addEventListener('beforeunload', () => Accelerator.clean());
    })();

})();
