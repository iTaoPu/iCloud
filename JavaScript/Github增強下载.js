// ==UserScript==
// @name         Github 增強 - 高速下載
// @version      4.4.4
// @author       言氏稗客
// @description  人的白嫖，就如同高山滚石一般，一旦开始，就再也停不下了 —— 「鲁迅」
// @match        *://github.com/*
// @icon         https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/JavaScript/jsdelivr.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const raw_url = [
        ['https://cdn.jsdmirror.com', 'JsDMirror (中)', '中国公益加速', true],
        ['https://cdn.jsdelivr.net', 'JsDelivr (美)', 'Cloudflare 全球加速', true],
        ['https://fastly.jsdelivr.net', 'Fastly (日)', 'Fastly 亚太加速', true],
        ['https://wget.la/raw.githubusercontent.com', 'Wget.la (港)', '香港公益加速', false]
    ];

    const cloudIcon = `<svg aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" class="octicon octicon-cloud" style="margin-right: 6px; fill: currentColor; vertical-align: middle;"><path d="M8 14a4.996 4.996 0 0 1-4.755-3.463 3.5 3.5 0 1 1 .53-6.936 4.502 4.502 0 0 1 8.455 1.4A3.502 3.502 0 0 1 11.5 12h-3a.75.75 0 0 1 0-1.5h3a2 2 0 0 0 0-4 .75.75 0 0 1-.75-.75 3 3 0 0 0-5.892-.803.75.75 0 0 1-.682.553 2 2 0 1 0-.176 3.992.75.75 0 1 1-.1 1.498A3.5 3.5 0 0 0 3.5 10.5 3.5 3.5 0 0 0 8 14Z"></path></svg>`;

    function addStyle() {
        if (document.getElementById('XIU2-Style-Final')) return;
        const style = document.createElement('style');
        style.id = 'XIU2-Style-Final';
        style.textContent = `
            /* 消除父容器间隙 */
            .BtnGroup {
                font-size: 0 !important;
                letter-spacing: -0.31em !important;
                gap: 0 !important;
                display: inline-flex !important;
                flex-wrap: nowrap !important;
            }
            .BtnGroup .BtnGroup-item,
            .BtnGroup .XIU2-RF {
                font-size: 12px !important;
                letter-spacing: normal !important;
            }

            /* 加速按钮基础样式 */
            .XIU2-RF {
                margin-left: -1px !important;   /* 默认与左邻按钮边框重叠，消除间隙 */
                margin-right: 0 !important;
                border-radius: 0 !important;    /* 默认无圆角，中间按钮保持直角 */
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0 !important;
                height: 28px !important;
                line-height: 20px !important;
                padding: 4px 12px !important;
                font-weight: 500 !important;
                vertical-align: middle !important;
                box-sizing: border-box !important;

                background-color: var(--color-btn-bg, #f6f8fa) !important;
                border: 1px solid var(--color-border-default, #d0d7de) !important;
                color: var(--color-fg-default, #24292f) !important;
                box-shadow: 0 1px 0 rgba(0,0,0,0.03) !important;

                position: relative !important;
                z-index: 1 !important;
            }

            /* 第一个加速按钮：左间距 6px（与 Raw 按钮分开），同时左圆角 */
            .XIU2-First {
                margin-left: 6px !important;
                border-top-left-radius: 6px !important;
                border-bottom-left-radius: 6px !important;
            }

            /* 最后一个加速按钮：右圆角 */
            .XIU2-Last {
                margin-right: 8px !important;
                border-top-right-radius: 6px !important;
                border-bottom-right-radius: 6px !important;
            }

            /* 深色模式调整边框和背景 */
            @media (prefers-color-scheme: dark) {
                .XIU2-RF {
                    background-color: var(--color-btn-bg, #21262d) !important;
                    border-color: var(--color-border-default, #30363d) !important;
                    color: var(--color-fg-default, #c9d1d9) !important;
                    box-shadow: 0 1px 0 rgba(255,255,255,0.05) !important;
                }
            }

            /* 悬停效果：无白色背景，完全跟随主题 */
            .XIU2-RF:hover {
                z-index: 2 !important;
                background-color: var(--color-btn-hover-bg, #f3f4f6) !important;
                border-color: var(--color-border-default, #c0c5cc) !important;
                color: var(--color-success-fg, #1f883d) !important;
                box-shadow: 0 1px 0 rgba(0,0,0,0.08) !important;
            }

            @media (prefers-color-scheme: dark) {
                .XIU2-RF:hover {
                    background-color: var(--color-btn-hover-bg, #30363d) !important;
                    border-color: var(--color-border-default, #8b949e) !important;
                    box-shadow: 0 1px 0 rgba(255,255,255,0.08) !important;
                }
            }

            .XIU2-RF:active {
                background-color: var(--color-btn-active-bg, #eaeef2) !important;
            }

            /* 复制按钮左间距保障 */
            .XIU2-Last + .BtnGroup-item,
            .XIU2-Last + button,
            .XIU2-Last + [data-testid="copy-button"],
            .XIU2-Last + clipboard-copy {
                margin-left: 8px !important;
            }

            /* 云朵浮动动画 */
            .XIU2-RF:hover svg {
                animation: xiu2-cloud-float 1.5s ease-in-out infinite;
            }
            @keyframes xiu2-cloud-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
            }
        `;
        document.head.appendChild(style);
    }

    function getConvertedUrl(prefix, isJSD) {
        const path = location.pathname;
        if (isJSD) {
            const match = path.match(/^\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.*)$/);
            if (match) {
                return prefix + '/gh/' + match[1] + '@' + match[2] + '/' + match[3];
            }
            return prefix + path;
        }
        return prefix + path.replace('/blob/', '/');
    }

    function findRawButton() {
        const selectors = [
            'a[data-testid="raw-button"]',
            'a#raw-url',
            '[data-component="react-app"] a[href*="/raw/"]',
            'a.BtnGroup-item[href*="/raw/"]'
        ];
        for (let sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) return btn;
        }
        const allLinks = document.querySelectorAll('a');
        for (let link of allLinks) {
            if (link.textContent.trim() === 'Raw' && link.getAttribute('href')?.includes('/raw/')) {
                return link;
            }
        }
        return null;
    }

    function fixCopyButtonSpacing() {
        const lastAccel = document.querySelector('.XIU2-Last');
        if (!lastAccel) return;
        let copyBtn = lastAccel.nextElementSibling;
        while (copyBtn && !copyBtn.matches('button, .BtnGroup-item, [data-testid="copy-button"], clipboard-copy, .js-copy-button')) {
            copyBtn = copyBtn.nextElementSibling;
        }
        if (copyBtn && !copyBtn.style.marginLeft) {
            copyBtn.style.marginLeft = '8px';
        }
    }

    function addRawFile() {
        const rawBtn = findRawButton();
        if (!rawBtn) {
            console.log('[Github高速下载] 未找到 Raw 按钮');
            return;
        }
        // 移除已存在的加速按钮，避免重复
        const existing = document.querySelectorAll('.XIU2-RF');
        existing.forEach(btn => btn.remove());

        addStyle();
        const className = rawBtn.className;

        let prevBtn = rawBtn;
        raw_url.forEach((item, index) => {
            const url = getConvertedUrl(item[0], item[3]);
            const a = document.createElement('a');
            const isFirst = (index === 0);
            const isLast = (index === raw_url.length - 1);
            let extraClass = ' XIU2-RF';
            if (isFirst) extraClass += ' XIU2-First';
            if (isLast) extraClass += ' XIU2-Last';
            a.className = className + extraClass;
            a.href = url;
            a.target = '_blank';
            a.role = 'button';
            a.title = item[2];
            a.innerHTML = `${cloudIcon}${item[1]}`;
            rawBtn.parentNode.insertBefore(a, prevBtn.nextSibling);
            prevBtn = a;
        });

        fixCopyButtonSpacing();
        console.log('[Github高速下载] 成功添加加速按钮（带圆角和Raw间距）');
    }

    let attemptCount = 0;
    const interval = setInterval(() => {
        if (document.querySelector('.XIU2-RF')) {
            clearInterval(interval);
            return;
        }
        addRawFile();
        attemptCount++;
        if (attemptCount >= 20) {
            clearInterval(interval);
            console.log('[Github高速下载] 超过最大尝试次数');
        }
    }, 500);

    const observer = new MutationObserver(() => {
        if (document.querySelector('.XIU2-RF')) return;
        addRawFile();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    addRawFile();
})();
