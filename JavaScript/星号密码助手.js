// ==UserScript==
// @name         星号密码助手 (PC/移动全内核版)
// @namespace    https://i叚娤.倖鍢.net.cn
// @version      3.6.0
// @author       言氏稗客
// @description  人的白嫖，就如同高山滚石一般，一旦开始，就再也停不下了 —— 「鲁迅」
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @icon         https://fastly.jsdelivr.net/gh/iTaoPu/iCloud@Grey/JavaScript/星号密码助手.ico
// ==/UserScript==

(function() {
    'use strict';

    // 1. 静态配置与内核判定
    const CFG = {
        M: parseInt(GM_getValue('m', 0)), // 0:悬停/长按, 1:双击, 2:聚焦, 3:Ctrl/长按
        W: parseInt(GM_getValue('w', 300)),
        IS_MOB: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        IS_FF: navigator.userAgent.includes('Firefox')
    };

    let timer;

    // 2. 内核级切换函数：解决浏览器自动填充机制导致的干扰
    const flip = (el, isShow) => {
        if (!el || el.readOnly) return;
        // 避免重复操作引发的重绘
        const nextType = isShow ? 'text' : 'password';
        if (el.type === nextType) return;

        // Firefox 在切换 type 时可能会重置光标，此处做微任务保护
        Promise.resolve().then(() => {
            el._isC = true; // 标记为本脚本修改
            el.type = nextType;
        });
    };

    // 3. 高效事件过滤器
    const getTarget = (e) => {
        const t = e.target;
        if (t.tagName !== 'INPUT') return null;
        // 兼容 Chrome 自动填充样式和 Firefox 的私有属性
        if (t.type === 'password' || t._isC) return t;
        return null;
    };

    // 4. 事件策略池
    const actions = {
        0: (e) => { // 悬停/触控
            const t = getTarget(e);
            if (!t) return;
            const isStart = ['mouseover', 'touchstart'].includes(e.type);
            if (isStart) {
                timer = setTimeout(() => flip(t, true), CFG.W);
            } else {
                clearTimeout(timer);
                flip(t, false);
            }
        },
        1: (e) => { // 双击
            const t = getTarget(e);
            if (t) flip(t, t.type === 'password');
        },
        2: (e) => { // 聚焦
            const t = getTarget(e);
            if (t) flip(t, e.type === 'focusin');
        },
        3: (e) => { // 特殊组合键
            const t = getTarget(e);
            if (!t) return;
            // PC 端 Ctrl+点击，移动端长按 (contextmenu)
            if (e.ctrlKey || e.type === 'contextmenu') {
                if (e.type === 'contextmenu' && CFG.M === 3) e.preventDefault();
                flip(t, t.type === 'password');
            }
        }
    };

    // 5. 跨端挂载逻辑
    const bind = () => {
        const d = document;
        const mode = CFG.M;

        if (mode === 0) {
            const evs = CFG.IS_MOB ? ['touchstart', 'touchend', 'touchcancel'] : ['mouseover', 'mouseout'];
            evs.forEach(ev => d.addEventListener(ev, actions[0], {passive: true, capture: true}));
        } else if (mode === 1) {
            d.addEventListener('dblclick', actions[1], true);
        } else if (mode === 2) {
            d.addEventListener('focusin', actions[2], true);
            d.addEventListener('focusout', actions[2], true);
        } else if (mode === 3) {
            d.addEventListener('click', actions[3], true);
            if (CFG.IS_MOB) d.addEventListener('contextmenu', actions[3], true);
        }

        // 统一安全逻辑：回车还原、失去焦点还原
        d.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && getTarget(e)) flip(e.target, false);
        }, true);
        
        // 针对 Chrome 移动端的额外保护：切出应用时还原
        window.addEventListener('blur', () => {
            const focused = document.activeElement;
            if (focused && focused._isC) flip(focused, false);
        });
    };

    // 6. 极致轻量设置 (原生 Prompt)
    if (window.self === window.top) {
        GM_registerMenuCommand("⚙️ 极简配置", () => {
            const m = prompt("模式: 0-悬停/触碰, 1-双击, 2-聚焦, 3-Ctrl/长按", CFG.M);
            if (m !== null) {
                GM_setValue('m', parseInt(m));
                const w = prompt("延迟(ms):", CFG.W);
                GM_setValue('w', parseInt(w) || 0);
                location.reload();
            }
        });
    }

    // 启动执行
    bind();
})();
