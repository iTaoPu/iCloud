(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _statusInterval = null;

  // 1. 扩展分辨率映射表
  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360,
    "标清": 480, "480": 480,
    "高清": 540, "540": 540,
    "超清": 720, "720": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "4K": 2160, "8K": 4320
  };

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        // CCTV 优先尝试从 URL 获取，否则默认锁定 1080
        var params = new URLSearchParams(window.location.search);
        var res = params.get('resolution');
        var val = RESOLUTION_MAP[res] || 1080; 
        localStorage.setItem('cctv_live_resolution', val);
        _log('CCTV 预设画质锁定: ' + val);
      }
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        _log('准备唤醒央视频画质菜单...');
        
        // 1. 立即点击下方的“画质/自动”按钮，激活 DOM 渲染
        var qualityBtn = document.querySelector('.bei-player-control-quality-btn');
        if (qualityBtn) qualityBtn.click();

        // 2. 等待菜单容器出现
        return self._waitForElement('.bei-list-inner')
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            var items = Array.prototype.map.call(spans, function(s) {
              var text = s.innerText.trim();
              // 增强识别：正则提取数字，确保 "1080P(超清)" 也能识别成 1080
              var match = text.match(/\d+/);
              var val = RESOLUTION_MAP[text] || (match ? parseInt(match[0]) : 0);
              return { el: s, val: val, name: text };
            }).filter(function(i) { return i.val > 0; });

            if (items.length > 0) {
              // 3. 寻找最接近 1080 的档位
              items.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
              _log('央视频自动选择画质: ' + items[0].name);
              items[0].el.click();

              // 4. 延迟点一下屏幕中央，收起菜单，保持界面纯净
              setTimeout(function() {
                var v = self._getVideoElement();
                if (v) v.click(); 
              }, 800);

              return self._waitForVideoMetadata();
            }
          });
      }
    },
    
    'live.ipanda.com': {
      init: function () { this._applyUniversalFullfix(); }
    },

    'web.guangdianyun.tv': {
      init: function () { return this._waitForVideoMetadata(); }
    },

    'm.1905.com': {
      init: function () {
        var style = document.createElement('style');
        style.textContent = '.player-mask, .ad-box, .app-download-guide, .header-app { display: none !important; }';
        document.head.appendChild(style);
        this._applyUniversalFullfix();
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: function () {
      if (_isInitialized) return Promise.resolve();
      
      var host = location.hostname.replace('www.', '');
      var config = HOST_CONFIGS[host];
      if (!config) return Promise.resolve();

      if (config.beforeInit) {
        try { config.beforeInit(); } catch (e) { _log('beforeInit Error: ' + e.message); }
      }

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyUniversalFullfix();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('播放器针对 ' + host + ' 初始化完成');
        })
        .catch(function (error) {
          _log('初始化失败: ' + error.message, 'error');
        });
    },

    _applyUniversalFullfix: function () {
      var video = this._getVideoElement();
      if (!video) return;

      var parent = video.parentElement;
      while (parent && parent !== document.body) {
        parent.style.setProperty('transform', 'none', 'important');
        parent.style.setProperty('overflow', 'visible', 'important');
        parent.style.setProperty('filter', 'none', 'important');
        parent.style.setProperty('perspective', 'none', 'important');
        parent.style.setProperty('contain', 'none', 'important');
        if (getComputedStyle(parent).position !== 'static') {
          parent.style.setProperty('position', 'static', 'important');
        }
        parent = parent.parentElement;
      }

      video.style.setProperty('position', 'fixed', 'important');
      video.style.setProperty('top', '0', 'important');
      video.style.setProperty('left', '0', 'important');
      video.style.setProperty('width', '100vw', 'important');
      video.style.setProperty('height', '100vh', 'important');
      video.style.setProperty('z-index', '2147483647', 'important');
      video.style.setProperty('background', '#000', 'important');
      video.style.setProperty('object-fit', 'contain', 'important');
      video.style.setProperty('visibility', 'visible', 'important');

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    _prepareDOMEnvironment: function () {
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      var styleId = 'webview-player-mask';
      if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = 'body *:not(video):not(canvas):not([id="webview-video-error"]) { visibility: hidden !important; pointer-events: none !important; }';
        document.head.appendChild(style);
      }
    },

    _getVideoElement: function () { return document.querySelector('video'); },

    _waitForVideoElement: function (timeout) {
      var self = this;
      timeout = timeout || 30000;
      var video = self._getVideoElement();
      if (video) return Promise.resolve(video);

      return new Promise(function (resolve) {
        var observer = new MutationObserver(function () {
          var v = self._getVideoElement();
          if (v) { observer.disconnect(); resolve(v); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(function() { observer.disconnect(); resolve(self._getVideoElement()); }, timeout);
      });
    },

    _waitForElement: function (selector) {
      return new Promise(function (resolve) {
        var check = function() {
          if (document.querySelector(selector)) { resolve(); }
          else { setTimeout(check, 500); }
        };
        check();
      });
    },

    _waitForVideoMetadata: function () {
      var video = this._getVideoElement();
      if (!video) return Promise.resolve();
      if (video.videoWidth > 0) return Promise.resolve();
      return new Promise(function (resolve) {
        video.addEventListener('loadedmetadata', function onLoaded() {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        });
        setTimeout(resolve, 5000);
      });
    },

    _attachEventListeners: function () {
      var self = this;
      var video = this._getVideoElement();
      if (!video) return;

      var events = {
        play: function () { _isPaused = false; self._invokeNative('triggerPlaying'); },
        pause: function () { _isPaused = true; self._invokeNative('triggerPaused'); },
        waiting: function () { self._invokeNative('triggerLoading'); },
        error: function () { self._invokeNative('triggerError'); },
        timeupdate: function () {
          var pos = Math.floor(video.currentTime * 1000);
          self._invokeNative('changePosition', pos, pos);
        }
      };

      Object.keys(events).forEach(function (e) {
        video.addEventListener(e, events[e]);
        _eventListeners.push({ element: video, type: e, listener: events[e] });
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;
        if (v.volume !== _volume) v.volume = _volume;
        if (!_isPaused && v.paused && v.readyState >= 2) v.play().catch(function(){});
        self._applyUniversalFullfix();
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth;
          _videoHeight = v.videoHeight;
          self._invokeNative('changeResolution', _videoWidth, _videoHeight);
        }
      }, 1500);
    },

    _invokeNative: function (method) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method].apply(window.WebviewVideoPlayerInterface, args);
      }
    }
  };

  function _log(m, lv) {
    if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.logV) {
      window.WebviewVideoPlayerInterface.logV('[Player] ' + m);
    }
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;
  var start = function() { setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 800); };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);

})(typeof window !== 'undefined' ? window : this);
