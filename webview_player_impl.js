(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _statusInterval = null;

  // 1. 分辨率数值映射表 (用于锁定 1080P 或寻找最接近值)
  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360,
    "标清": 480, "480": 480,
    "高清": 540, "540": 540,
    "超清": 720, "720": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440,
    "4K": 2160, "2160": 2160,
    "8K": 4320
  };

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        // CCTV 核心逻辑：直接修改本地缓存锁定 1080
        localStorage.setItem('cctv_live_resolution', 1080);
        _log('CCTV 预设锁定 1080');
      }
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        // 尝试寻找并点开清晰度菜单
        return self._waitForElement('.bei-player-control-quality-btn, .bei-list-inner').then(function() {
          var btn = document.querySelector('.bei-player-control-quality-btn');
          if (btn) {
            btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            btn.click(); 
          }
          return self._waitForElement('.bei-list-inner span');
        }).then(function () {
          var spans = document.querySelectorAll('.bei-list-inner span');
          self._pickBestResolution(spans);
        });
      }
    },

    'web.guangdianyun.tv': {
      init: function () { return this._waitForVideoMetadata(); }
    },

    'live.ipanda.com': {
      init: function () { 
        this._applyUniversalFullfix(); 
        _log('iPanda 强化全屏应用');
      }
    },

    'm.1905.com': {
      init: function () {
        var self = this;
        // 1905 屏蔽干扰层
        var style = document.createElement('style');
        style.textContent = '.player-mask, .ad-box, .app-download-guide, .header-app { display: none !important; }';
        document.head.appendChild(style);

        // 尝试点开 Video.js 的清晰度菜单
        return self._waitForElement('.vjs-menu-button, .vjs-menu-item').then(function() {
          var menuBtn = document.querySelector('.vjs-quality-selector, .vjs-menu-button');
          if (menuBtn) menuBtn.click();
          return self._waitForElement('.vjs-menu-item');
        }).then(function() {
          var items = document.querySelectorAll('.vjs-menu-item');
          self._pickBestResolution(items);
        }).catch(function() { _log('1905 画质菜单未找到或无需点击'); });
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
          _log(host + ' 脚本加载成功');
        })
        .catch(function (error) {
          _log('初始化失败: ' + error.message, 'error');
        });
    },

    // 核心：智能分辨率匹配 (离 1080 最近原则)
    _pickBestResolution: function (elements) {
      if (!elements || elements.length === 0) return;
      var options = Array.prototype.map.call(elements, function(el) {
        var text = el.innerText.trim();
        var numMatch = text.match(/\d+/);
        var val = RESOLUTION_MAP[text] || (numMatch ? parseInt(numMatch[0]) : 0);
        return { el: el, val: val, text: text };
      }).filter(function(i) { return i.val > 0; });

      if (options.length > 0) {
        options.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
        var target = options[0];
        _log('锁定目标分辨率: ' + target.text);
        if (target.el.click) target.el.click();
        else target.el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        // 尝试点击视频区域关闭可能残留的菜单
        setTimeout(function() {
          var v = document.querySelector('video');
          if (v) v.click();
        }, 500);
      }
    },

    // 终极全屏修复：递归解除父级所有 transform/overflow 限制
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
        parent.style.setProperty('clip-path', 'none', 'important');
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
        // 隐藏除视频、Canvas、报错UI以外的所有元素，防止点击干扰
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
        var timer = setInterval(function () {
          if (document.querySelector(selector)) { clearInterval(timer); resolve(); }
        }, 500);
        setTimeout(function() { clearInterval(timer); resolve(); }, 10000);
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
        
        if (v.volume !== _volume) v.volume = _volume;
        if (!_isPaused && v.paused && v.readyState >= 2) v.play().catch(function(){});
        
        // 持续应用修复，防止动态加载的内容破坏全屏
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
    console[lv || 'info']('[Player] ' + m);
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

  var start = function() { setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 800); };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);

})(typeof window !== 'undefined' ? window : this);
