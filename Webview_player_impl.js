(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _statusInterval = null;

  // 仅保留指定的 5 个域名配置
  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        var resMap = { "超清": 720, "高清": 540, "标清": 480, "流畅": 360 };
        var res = new URLSearchParams(window.location.search).get('resolution');
        if (res) localStorage.setItem('cctv_live_resolution', resMap[res] || 'auto');
      }
    },
    'yangshipin.cn': {
      init: async function (self) {
        await self._waitForElement('.bei-list-inner, .bright-text');
        var res = new URLSearchParams(window.location.search).get('resolution');
        var spans = document.querySelectorAll('.bei-list-inner span');
        var target = Array.from(spans).find(s => s.innerText.includes(res));
        if (target) target.click();
      }
    },
    'live.ipanda.com': {
      init: function () { _log('iPanda mode active'); }
    },
    'm.1905.com': {
      init: async function (self) {
        // 尝试自动点击移动端的播放按钮
        const playBtn = document.querySelector('.play-btn, .video-play, .m1905-player-poster');
        if (playBtn) playBtn.click();
      }
    },
    'web.guangdianyun.tv': {
      init: function (self) { return self._waitForVideoMetadata(); }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return;
      
      // 域名校验：不在名单内则退出
      if (!HOST_CONFIGS[location.host]) {
        _log('Domain not in whitelist, skipping initialization', 'warn');
        return;
      }

      _log('云影空蒙 Player Initializing...');

      var config = HOST_CONFIGS[location.host];
      if (config.beforeInit) config.beforeInit();

      try {
        const video = await this._waitForVideoElement();
        if (config.init) await config.init(this);
        
        this._prepareDOMEnvironment();
        this._forceFullscreen(video);
        this._attachEventListeners(video);
        this._startHeartbeat();
        
        _isInitialized = true;
        _log('Initialized successfully for ' + location.host);
      } catch (e) {
        _log('Init Failed: ' + e.message, 'error');
        this._showErrorUI(e.message);
      }
    },

    _prepareDOMEnvironment: function () {
      // 1. 强制注入 Viewport 禁止缩放
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      // 2. 注入全局 CSS：强制背景黑色、隐藏滚动条、确保视频层级最高
      const style = document.createElement('style');
      style.textContent = `
        html, body { overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: #000 !important; }
        video { object-fit: contain !important; background: #000 !important; }
        #webview-video-error { z-index: 2147483647 !important; }
      `;
      document.head.appendChild(style);
    },

    _forceFullscreen: function (video) {
      if (!video) return;
      // 核心：使用 fixed 布局撑满 Webview 窗口
      Object.assign(video.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483646',
        backgroundColor: '#000',
        display: 'block',
        pointerEvents: 'auto'
      });
      
      // 递归隐藏干扰元素（非视频容器的兄弟节点）
      var p = video.parentElement;
      while (p && p !== document.body) {
        Array.from(p.children).forEach(el => {
          if (!el.contains(video) && el !== video) {
            el.style.setProperty('display', 'none', 'important');
          }
        });
        p = p.parentElement;
      }
    },

    _attachEventListeners: function (video) {
      var self = this;
      var events = {
        play: () => { _isPaused = false; self._toApp('triggerPlaying'); },
        pause: () => { _isPaused = true; self._toApp('triggerPaused'); },
        waiting: () => self._toApp('triggerLoading'),
        error: () => self._toApp('triggerError'),
        loadedmetadata: () => {
          if (video.videoWidth) self._toApp('changeResolution', video.videoWidth, video.videoHeight);
        },
        timeupdate: () => {
          var pos = Math.floor(video.currentTime * 1000);
          // 直播通常没有固定 duration，传当前位置作为进度
          self._toApp('changePosition', pos, pos); 
        }
      };

      Object.keys(events).forEach(e => {
        video.addEventListener(e, events[e]);
        _eventListeners.push({el: video, type: e, cb: events[e]});
      });
    },

    _startHeartbeat: function () {
      _statusInterval = setInterval(() => {
        var v = document.querySelector('video');
        if (!v) return;
        
        // 维持音量同步
        if (v.volume !== _volume) v.volume = _volume;
        
        // 强制全屏状态检查（防止原网页脚本改回样式）
        if (v.style.position !== 'fixed') this._forceFullscreen(v);

        // 自动播放补偿
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(() => {});
        }
      }, 2000);
    },

    _toApp: function (method, ...args) {
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method](...args);
      }
    },

    _waitForVideoElement: function () {
      return new Promise((resolve, reject) => {
        var v = document.querySelector('video');
        if (v) return resolve(v);
        var obs = new MutationObserver(() => {
          var v = document.querySelector('video');
          if (v) { obs.disconnect(); resolve(v); }
        });
        obs.observe(document.documentElement, {childList: true, subtree: true});
        setTimeout(() => { obs.disconnect(); reject(new Error("等待视频超时")); }, 20000);
      });
    },

    _waitForElement: function (selector) {
      return new Promise(resolve => {
        if (document.querySelector(selector)) return resolve();
        const obs = new MutationObserver(() => {
          if (document.querySelector(selector)) { obs.disconnect(); resolve(); }
        });
        obs.observe(document.body, {childList: true, subtree: true});
      });
    },

    _waitForVideoMetadata: function () {
      var v = document.querySelector('video');
      return new Promise(resolve => {
        if (v && v.videoWidth > 0) return resolve();
        v.addEventListener('loadedmetadata', () => resolve(), {once: true});
        setTimeout(resolve, 5000); // 兜底
      });
    },

    _showErrorUI: function (msg) {
      var div = document.getElementById('webview-video-error') || document.createElement('div');
      div.id = 'webview-video-error';
      div.innerHTML = `<div style="color:#eee;font-size:14px;">${msg}</div>`;
      Object.assign(div.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      if (!div.parentNode) document.body.appendChild(div);
    }
  };

  function _log(msg, level = 'info') {
    if (window.WebviewVideoPlayerInterface?.logV) {
      window.WebviewVideoPlayerInterface.logV(`[云影空蒙] ${msg}`);
    }
    console[level](msg);
  }

  // 初始化触发
  if (document.readyState === 'complete') {
    WebviewVideoPlayer.initialize();
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => WebviewVideoPlayer.initialize(), 500);
    });
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;
})(window);
