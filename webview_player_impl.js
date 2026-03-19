(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _statusInterval = null;

  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360,
    "标清": 480, "480": 480,
    "高清": 540, "540": 540,
    "超清": 720, "720": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440,
    "4K": 2160, "2160": 2160,
    "8K": 4320, "4320": 4320
  };

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        localStorage.setItem('cctv_live_resolution', 1080);
      }
    },
    'yangshipin.cn': {
      init: function () {
        var self = this;
        return self._waitForElement('.bei-list-inner').then(function () {
          var spans = document.querySelectorAll('.bei-list-inner span');
          var items = Array.from(spans).map(s => ({ el: s, val: RESOLUTION_MAP[s.innerText.trim()] || 0 })).filter(i => i.val > 0);
          if (items.length > 0) {
            items.sort((a, b) => Math.abs(a.val - 1080) - Math.abs(b.val - 1080));
            items[0].el.click();
          }
        });
      }
    },
    'web.guangdianyun.tv': { init: function () { return this._waitForVideoMetadata(); } },
    'live.ipanda.com': {
      init: function () {
        // iPanda 强力全屏修正
        this._forceFillScreen();
      }
    },
    'm.1905.com': {
      init: function () {
        // 1905 屏蔽掉浮动遮罩和广告层
        var style = document.createElement('style');
        style.textContent = `
          .video-js .vjs-big-play-button, .player-mask, .ad-box, .app-download-guide { display: none !important; }
          #player, .player-container { position: fixed !important; z-index: 999998 !important; }
        `;
        document.head.appendChild(style);
        this._forceFillScreen();
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: function () {
      if (_isInitialized) return;
      var host = location.hostname.replace('www.', '');
      var config = HOST_CONFIGS[host];

      if (config && config.beforeInit) config.beforeInit();

      var self = this;
      this._waitForVideoElement().then(function (video) {
        if (config && config.init) return config.init.call(self);
      }).then(function () {
        self._prepareDOM();
        self._forceFillScreen();
        self._attachEvents();
        self._startMonitor();
        _isInitialized = true;
      });
    },

    _getVideoElement: function () { return document.querySelector('video'); },

    _waitForVideoElement: function () {
      return new Promise(resolve => {
        var check = () => {
          var v = document.querySelector('video');
          if (v) resolve(v); else setTimeout(check, 500);
        };
        check();
      });
    },

    _waitForElement: function (sel) {
      return new Promise(resolve => {
        var timer = setInterval(() => {
          if (document.querySelector(sel)) { clearInterval(timer); resolve(); }
        }, 500);
      });
    },

    _prepareDOM: function () {
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      // 强行清理 body 样式
      document.documentElement.style.overflow = 'hidden';
      document.body.style.cssText = 'overflow:hidden !important; margin:0 !important; padding:0 !important; background:#000 !important;';
    },

    _forceFillScreen: function () {
      var video = this._getVideoElement();
      if (!video) return;

      // 1. 递归将所有父元素设置为溢出可见/高度100%，确保不被裁剪
      var p = video.parentElement;
      while (p && p !== document.body) {
        p.style.overflow = 'visible';
        p.style.height = '100%';
        p.style.transform = 'none'; // 修复 cditv 等位移问题
        p = p.parentElement;
      }

      // 2. 视频对象强制置顶
      Object.assign(video.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '999999',
        backgroundColor: '#000',
        objectFit: 'contain', // 保持比例，避免拉伸变形
        margin: '0',
        padding: '0'
      });
    },

    _attachEvents: function () {
      var video = this._getVideoElement();
      if (!video) return;
      video.addEventListener('play', () => { _isPaused = false; window.WebviewVideoPlayerInterface?.triggerPlaying?.(); });
      video.addEventListener('pause', () => { _isPaused = true; window.WebviewVideoPlayerInterface?.triggerPaused?.(); });
      video.addEventListener('timeupdate', () => {
        var pos = Math.floor(video.currentTime * 1000);
        window.WebviewVideoPlayerInterface?.changePosition?.(pos, pos || 0);
      });
    },

    _startMonitor: function () {
      setInterval(() => {
        var v = this._getVideoElement();
        if (!v) return;
        if (!_isPaused && v.paused) v.play().catch(()=>{});
        // 持续锁定全屏样式，防止被网站原生脚本改回
        if (v.style.position !== 'fixed') this._forceFillScreen();
      }, 1500);
    }
  };

  // 启动
  if (document.readyState === 'complete') WebviewVideoPlayer.initialize();
  else window.addEventListener('load', () => WebviewVideoPlayer.initialize());

})(window);
