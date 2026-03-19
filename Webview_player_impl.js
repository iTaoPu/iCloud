(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _statusInterval = null;

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        var resMap = { "超清": 720, "高清": 540, "标清": 480, "流畅": 360 };
        var res = new URLSearchParams(window.location.search).get('resolution');
        localStorage.setItem('cctv_live_resolution', resMap[res] || 'auto');
      }
    },
    'yangshipin.cn': {
      init: function () {
        var self = this;
        var res = new URLSearchParams(window.location.search).get('resolution');
        return self._waitForElement('.bei-list-inner', 8000).then(function () {
          var spans = document.querySelectorAll('.bei-list-inner span');
          var target = Array.from(spans).find(s => s.innerText.includes(res));
          if (target) target.click();
        });
      }
    },
    'm.1905.com': {
      init: function () {
        // 修复全屏被遮挡的核心补丁
        var style = document.createElement('style');
        style.textContent = `
          .advert-layer, .vjs-poster, .m1905-player-poster, .header, .footer, .btn-app-open { display: none !important; opacity: 0 !important; pointer-events: none !important; }
          #player, .video-wrap, video { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; }
        `;
        document.head.appendChild(style);
        var playBtn = document.querySelector('.play-btn, .video-play');
        if (playBtn) playBtn.click();
      }
    },
    'live.ipanda.com': {
      init: function () {
        _log('iPanda focus mode');
        var cover = document.querySelector('.player_cover');
        if (cover) cover.remove();
      }
    },
    'web.guangdianyun.tv': {
      init: function () {
        // 针对广电云卡死的优化：干掉弹幕和侧边栏
        var style = document.createElement('style');
        style.textContent = '.danmu-container, .interaction-area, .sidebar-wrap { display: none !important; }';
        document.head.appendChild(style);
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized || !HOST_CONFIGS[location.host]) return;

      var self = this;
      var config = HOST_CONFIGS[location.host];
      if (config.beforeInit) config.beforeInit();

      return this._waitForVideoElement(15000) // 缩短等待时长提速
        .then(function (video) {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Initialized for ' + location.host);
        })
        .catch(function (e) { _log('Init task failed: ' + e.message); });
    },

    _prepareDOMEnvironment: function () {
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);
      
      document.documentElement.style.overflow = 'hidden';
      document.body.style.backgroundColor = 'black';
      document.body.style.margin = '0';
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;
      // 强力全屏样式
      var css = {
        'position': 'fixed', 'top': '0', 'left': '0',
        'width': '100vw', 'height': '100vh',
        'z-index': '2147483646', 'background': 'black',
        'object-fit': 'contain', 'display': 'block'
      };
      for (var key in css) { video.style.setProperty(key, css[key], 'important'); }
    },

    _getVideoElement: function () { return document.querySelector('video'); },

    _waitForVideoElement: function (timeout) {
      var self = this;
      return new Promise((resolve, reject) => {
        var v = self._getVideoElement();
        if (v) return resolve(v);
        var timer = setTimeout(() => { obs.disconnect(); reject(new Error('No video found')); }, timeout);
        var obs = new MutationObserver(() => {
          var v = self._getVideoElement();
          if (v) { clearTimeout(timer); obs.disconnect(); resolve(v); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForElement: function (selector, timeout) {
      return new Promise(resolve => {
        if (document.querySelector(selector)) return resolve();
        var obs = new MutationObserver(() => {
          if (document.querySelector(selector)) { obs.disconnect(); resolve(); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); resolve(); }, timeout);
      });
    },

    _attachEventListeners: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var self = this;
      var events = {
        play: () => { _isPaused = false; self._toApp('triggerPlaying'); },
        pause: () => { _isPaused = true; self._toApp('triggerPaused'); },
        waiting: () => self._toApp('triggerLoading'),
        error: () => self._toApp('triggerError'),
        timeupdate: () => {
          var pos = Math.floor(video.currentTime * 1000);
          self._toApp('changePosition', pos, pos);
        }
      };
      Object.keys(events).forEach(e => video.addEventListener(e, events[e]));
    },

    _startStatusMonitoring: function () {
      _statusInterval = setInterval(() => {
        var v = this._getVideoElement();
        if (!v) return;
        // 监控全屏样式是否被篡改
        if (v.style.position !== 'fixed') this._enterFullscreen();
        // 自动播放补偿
        if (!_isPaused && v.paused && v.readyState >= 2) v.play().catch(()=>{});
        // 分辨率上报
        if (v.videoWidth !== _videoWidth) {
          _videoWidth = v.videoWidth;
          this._toApp('changeResolution', _videoWidth, v.videoHeight);
        }
      }, 2000);
    },

    _toApp: function (method, ...args) {
      try {
        if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
          window.WebviewVideoPlayerInterface[method](...args);
        }
      } catch (e) { console.error('App Interface Error', e); }
    }
  };

  function _log(m) {
    console.log('[WebviewVideoPlayer] ' + m);
    try { window.WebviewVideoPlayerInterface?.logV?.(m); } catch(e) {}
  }

  // 启动：不等 load 事件，DOMContentLoaded 立即执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WebviewVideoPlayer.initialize());
  } else {
    WebviewVideoPlayer.initialize();
  }
  // 兜底启动
  window.addEventListener('load', () => setTimeout(() => WebviewVideoPlayer.initialize(), 1000));

  global.WebviewVideoPlayer = WebviewVideoPlayer;
})(window);
