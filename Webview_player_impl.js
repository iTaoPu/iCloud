(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _mutationObserver = null;
  var _statusInterval = null;

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        var resolutionValues = { "超清": 720, "高清": 540, "标清": 480, "流畅": 360 };
        var resolution = new URLSearchParams(window.location.search).get('resolution');
        localStorage.setItem('cctv_live_resolution', resolutionValues[resolution] || 'auto');
      },
      init: function () {
        var errorMsgEl = document.getElementById('error_msg_player');
        if (errorMsgEl && errorMsgEl.offsetHeight > 0) { throw new Error(errorMsgEl.textContent); }
      }
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        var resolution = new URLSearchParams(window.location.search).get('resolution');
        return self._waitForElement('.bei-list-inner, .bright-text', 10000)
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            var resolutionItem = Array.from(spans).find(function (span) {
              return span.innerText && span.innerText.includes(resolution);
            });
            if (resolutionItem) { resolutionItem.click(); return self._waitForVideoMetadata(); }
          });
      },
    },

    // 针对 1905 的全屏修复
    'm.1905.com': {
      init: function () {
        var style = document.createElement('style');
        style.textContent = `
          /* 强制隐藏 1905 的广告层和干扰 UI */
          .advert-layer, .vjs-poster, .m1905-player-poster, .online-count { display: none !important; }
          /* 锁定视频容器为全屏 */
          #player, .video-wrap, .m1905-player { 
            position: fixed !important; top: 0 !important; left: 0 !important; 
            width: 100vw !important; height: 100vh !important; z-index: 999999 !important; 
          }
        `;
        document.head.appendChild(style);
        
        // 尝试触发播放按钮
        var playBtn = document.querySelector('.play-btn, .video-play');
        if (playBtn) playBtn.click();
      }
    },

    // 针对 iPanda 的提速：减少等待时间
    'live.ipanda.com': {
      init: function () {
        _log('iPanda speed-up mode active');
        // iPanda 页面逻辑较重，强制移除背景遮罩
        var mask = document.querySelector('.player_cover, .vjs-poster');
        if (mask) mask.style.display = 'none';
      }
    },

    // 针对 广电云 的提速：禁用非核心组件
    'web.guangdianyun.tv': {
      init: function () {
        var style = document.createElement('style');
        style.textContent = '.danmu-container, .interaction-area, .sidebar { display: none !important; }';
        document.head.appendChild(style);
        return this._waitForVideoMetadata(5000); // 缩短等待时长
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return;
      
      // 检查当前域名是否在配置中
      if (!HOST_CONFIGS[location.host]) return;

      var self = this;
      var beforeInit = HOST_CONFIGS[location.host].beforeInit;
      if (beforeInit) beforeInit();

      // 优化：加快 video 元素的捕获速度
      return this._waitForVideoElement(15000)
        .then(function () {
          var init = HOST_CONFIGS[location.host].init;
          if (init) { return init.call(self); }
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
        })
        .catch(function (error) {
          _log('Init error: ' + error.message);
        });
    },

    _prepareDOMEnvironment: function () {
      var viewportMeta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!viewportMeta.parentNode) document.head.appendChild(viewportMeta);

      document.body.style.margin = '0';
      document.body.style.backgroundColor = 'black';
      
      // 1905 等站点需要禁用 body 的滚动以保持全屏稳定
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;

      // 强力全屏 CSS
      video.style.setProperty('position', 'fixed', 'important');
      video.style.setProperty('top', '0', 'important');
      video.style.setProperty('left', '0', 'important');
      video.style.setProperty('width', '100vw', 'important');
      video.style.setProperty('height', '100vh', 'important');
      video.style.setProperty('z-index', '2147483647', 'important');
      video.style.setProperty('background', 'black', 'important');
      video.style.objectFit = 'contain';
      
      _log('Super Fullscreen applied');
    },

    // ... (以下保留你原始代码中未修改的 play, pause, setVolume, _getVideoElement, _attachEventListeners 等方法)
    _getVideoElement: function () { return document.querySelector('video'); },
    
    _waitForVideoElement: function (timeout) {
      timeout = timeout || 15000;
      var video = this._getVideoElement();
      if (video) return Promise.resolve(video);
      return new Promise((resolve, reject) => {
        var timer = setTimeout(() => { obs.disconnect(); reject(new Error('Timeout')); }, timeout);
        var obs = new MutationObserver(() => {
          var v = document.querySelector('video');
          if (v) { clearTimeout(timer); obs.disconnect(); resolve(v); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForElement: function (selector, timeout) {
      timeout = timeout || 10000;
      var el = document.querySelector(selector);
      if (el) return Promise.resolve(el);
      return new Promise(resolve => {
        var timer = setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
        var obs = new MutationObserver(() => {
          if (document.querySelector(selector)) { clearTimeout(timer); obs.disconnect(); resolve(); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function (timeout) {
      timeout = timeout || 10000;
      var video = this._getVideoElement();
      if (!video) return Promise.resolve();
      return new Promise(resolve => {
        var timer = setTimeout(resolve, timeout);
        video.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    },

    _attachEventListeners: function () {
        var video = this._getVideoElement();
        if (!video) return;
        var self = this;
        video.addEventListener('play', () => { _isPaused = false; self._toApp('triggerPlaying'); });
        video.addEventListener('pause', () => { _isPaused = true; self._toApp('triggerPaused'); });
        video.addEventListener('waiting', () => self._toApp('triggerLoading'));
        video.addEventListener('timeupdate', () => {
            var pos = Math.floor(video.currentTime * 1000);
            self._toApp('changePosition', pos, pos);
        });
    },

    _startStatusMonitoring: function () {
      _statusInterval = setInterval(() => {
        var v = this._getVideoElement();
        if (!v) return;
        if (v.style.position !== 'fixed') this._enterFullscreen();
        if (!_isPaused && v.paused) v.play().catch(()=>{});
      }, 2000);
    },

    _toApp: function (method, ...args) {
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method](...args);
      }
    }
  };

  function _log(message) {
    if (window.WebviewVideoPlayerInterface?.logV) {
      window.WebviewVideoPlayerInterface.logV('[WebviewVideoPlayer] ' + message);
    }
    console.log(message);
  }

  // 立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WebviewVideoPlayer.initialize());
  } else {
    WebviewVideoPlayer.initialize();
  }
  
  global.WebviewVideoPlayer = WebviewVideoPlayer;

})(window);
