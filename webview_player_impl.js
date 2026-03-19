(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _statusInterval = null;

  // 1. 分辨率数值映射表（标准对齐逻辑）
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
        var params = new URLSearchParams(window.location.search);
        var res = params.get('resolution');
        var val = RESOLUTION_MAP[res] || 1080; // 默认直跳 1080
        localStorage.setItem('cctv_live_resolution', val);
        _log('CCTV 预设画质锁定: ' + val);
      }
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        _log('开始执行央视频画质强制锁定...');

        // 1. 循环探测并点击画质按钮（处理按钮加载延迟）
        var retryBtn = 0;
        var btnTimer = setInterval(function() {
          var qualityBtn = document.querySelector('.bei-player-control-quality-btn');
          if (qualityBtn) {
            qualityBtn.click();
            _log('已唤醒画质菜单');
            clearInterval(btnTimer);
          }
          if (++retryBtn > 10) clearInterval(btnTimer);
        }, 400);

        // 2. 等待菜单容器并识别选项
        return self._waitForElement('.bei-list-inner')
          .then(function () {
            // 给菜单展开留出物理动画时间
            return new Promise(function(r) { setTimeout(r, 300); });
          })
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            var items = Array.prototype.map.call(spans, function(s) {
              var text = s.innerText.trim();
              var numMatch = text.match(/\d+/);
              // 混合识别：优先查表，其次提取数字
              var val = RESOLUTION_MAP[text] || (numMatch ? parseInt(numMatch[0]) : 0);
              return { el: s, val: val, name: text };
            }).filter(function(i) { return i.val > 0; });

            if (items.length > 0) {
              // 寻找最接近 1080 的档位
              items.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
              _log('央视频自动选中: ' + items[0].name);
              items[0].el.click();

              // 3. 点击视频中央收起菜单，保持全屏纯净
              setTimeout(function() {
                var v = self._getVideoElement();
                if (v) v.click(); 
              }, 800);

              return self._waitForVideoMetadata();
            }
          });
      }
    },

    'web.guangdianyun.tv': {
      init: function () { return this._waitForVideoMetadata(); }
    },

    'live.ipanda.com': {
      init: function () { this._applyUniversalFullfix(); }
    },

    'm.1905.com': {
      init: function () {
        // 屏蔽 1905 浮层及广告残留
        var style = document.createElement('style');
        style.textContent = '.player-mask, .ad-box, .app-download-guide, .header-app, .vjs-ads-label { display: none !important; }';
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
          _log('针对 ' + host + ' 初始化成功');
        })
        .catch(function (error) {
          _log('初始化失败: ' + error.message);
        });
    },

    _applyUniversalFullfix: function () {
      var video = this._getVideoElement();
      if (!video) return;

      // 1. 递归破解父容器 CSS 限制（核心稳定性逻辑）
      var parent = video.parentElement;
      while (parent && parent !== document.body) {
        parent.style.setProperty('transform', 'none', 'important');
        parent.style.setProperty('overflow', 'visible', 'important');
        parent.style.setProperty('filter', 'none', 'important');
        parent.style.setProperty('perspective', 'none', 'important');
        parent.style.setProperty('contain', 'none', 'important');
        // 修正 position 导致的偏移
        if (getComputedStyle(parent).position !== 'static') {
          parent.style.setProperty('position', 'static', 'important');
        }
        parent = parent.parentElement;
      }

      // 2. 视频强制置顶全屏
      var styles = {
        'position': 'fixed',
        'top': '0',
        'left': '0',
        'width': '100vw',
        'height': '100vh',
        'z-index': '2147483647',
        'background': '#000',
        'object-fit': 'contain',
        'display': 'block',
        'visibility': 'visible'
      };
      for (var key in styles) {
        video.style.setProperty(key, styles[key], 'important');
      }

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
        // 隐藏除视频、Canvas、报错信息以外的所有网页元素
        style.textContent = 'body *:not(video):not(canvas):not([id*="error"]):not([class*="player"]) { visibility: hidden !important; pointer-events: none !important; }';
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
        var timer = setInterval(function () {
          if (document.querySelector(selector)) { clearInterval(timer); resolve(); }
        }, 400);
      });
    },

    _waitForVideoMetadata: function () {
      var video = this._getVideoElement();
      if (!video || video.videoWidth > 0) return Promise.resolve();
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
        
        // 1. 自动播放与静音解除尝试
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function() {
            // 某些 WebView 限制，若播放失败则静音尝试
            v.muted = true; v.play();
          });
        }
        
        // 2. 音量与全屏布局锁定（对抗 1905 广告切正片）
        if (v.volume !== _volume) v.volume = _volume;
        self._applyUniversalFullfix();

        // 3. 分辨率上报
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

  function _log(m) {
    if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.logV) {
      window.WebviewVideoPlayerInterface.logV('[JS_Player] ' + m);
    }
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

  // 延时启动，确保 WebView 的桥接对象已经注入
  var start = function() { setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 400); };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);

})(typeof window !== 'undefined' ? window : this);
