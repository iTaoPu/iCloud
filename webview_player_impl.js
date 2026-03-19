(function (global) {
  'use strict';

  var _isInitialized = false;
  var _currentVideo = null;     // 记录当前 video 实例，用于换集检测
  var _qualityLocked = false;   // 画质单次点击锁
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _statusInterval = null;

  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360, "标清": 480, "480": 480,
    "高清": 540, "540": 540, "超清": 720, "720": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "4K": 2160
  };

  var HOST_CONFIGS = {
    // 1. CCTV
    'tv.cctv.com': {
      beforeInit: function () { localStorage.setItem('cctv_live_resolution', 1080); }
    },

    // 2. 央视频 (保持单次精准点击逻辑)
    'yangshipin.cn': {
      init: function () {
        var self = this;
        if (_qualityLocked) return; // 如果已经锁过画质，直接退出

        var retry = 0;
        var btnTimer = setInterval(function() {
          if (_qualityLocked) { clearInterval(btnTimer); return; }
          var btn = document.querySelector('.bei-player-control-quality-btn');
          if (btn) {
            btn.click(); 
            clearInterval(btnTimer);
            self._waitForElement('.bei-list-inner').then(function() {
              setTimeout(function() {
                var spans = document.querySelectorAll('.bei-list-inner span');
                var items = Array.prototype.map.call(spans, function(s) {
                  var text = s.innerText.trim();
                  var num = text.match(/\d+/);
                  return { el: s, val: RESOLUTION_MAP[text] || (num ? parseInt(num[0]) : 0) };
                }).filter(function(i) { return i.val > 0; });

                if (items.length > 0) {
                  items.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
                  items[0].el.click();
                  _qualityLocked = true; // 动作完成，上锁
                  _log('1080P 锁定成功');
                  setTimeout(function() { 
                    var v = self._getVideoElement(); if(v) v.click(); 
                  }, 800);
                }
              }, 300);
            });
          }
          if (++retry > 15) clearInterval(btnTimer);
        }, 400);
      }
    },

    'web.guangdianyun.tv': { init: function () { return this._waitForVideoMetadata(); } },
    'live.ipanda.com': { init: function () { this._applyUniversalFullfix(); } },
    
    // 5. 1905 电影网 (恢复原本的遮罩逻辑)
    'm.1905.com': {
      init: function () {
        var styleId = 'v-1905-style';
        if (!document.getElementById(styleId)) {
          var style = document.createElement('style');
          style.id = styleId;
          // 只针对已知的广告和遮罩元素进行 display: none
          style.textContent = '.player-mask, .ad-box, .app-download-guide, .header-app { display: none !important; }';
          document.head.appendChild(style);
        }
        this._applyUniversalFullfix();
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: function () {
      var host = location.hostname.replace('www.', '');
      var config = HOST_CONFIGS[host] || { init: function() { this._applyUniversalFullfix(); } };
      if (config.beforeInit) { try { config.beforeInit(); } catch(e) {} }

      var self = this;
      return this._waitForVideoElement().then(function (video) {
        _currentVideo = video;
        if (config.init) config.init.call(self);
        
        self._applyUniversalFullfix();
        self._attachEventListeners(video);
        self._startStatusMonitoring(config);
        _log('针对 ' + host + ' 初始化完成');
      });
    },

    _applyUniversalFullfix: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var p = video.parentElement;
      while (p && p !== document.body) {
        p.style.setProperty('transform', 'none', 'important');
        p.style.setProperty('overflow', 'visible', 'important');
        // 关键修复：确保所有父级在 CSS 层面不被隐藏
        p.style.setProperty('visibility', 'visible', 'important');
        p.style.setProperty('display', 'block', 'important');
        if (getComputedStyle(p).position !== 'static') p.style.setProperty('position', 'static', 'important');
        p = p.parentElement;
      }
      var styles = {
        'position': 'fixed', 'top': '0', 'left': '0',
        'width': '100vw', 'height': '100vh', 'z-index': '2147483647',
        'background': '#000', 'object-fit': 'contain', 'display': 'block', 'visibility': 'visible'
      };
      for (var key in styles) { video.style.setProperty(key, styles[key], 'important'); }
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    _attachEventListeners: function (video) {
      var self = this;
      var events = {
        play: function () { _isPaused = false; self._invokeNative('triggerPlaying'); },
        pause: function () { _isPaused = true; self._invokeNative('triggerPaused'); },
        timeupdate: function () { self._invokeNative('changePosition', Math.floor(video.currentTime * 1000)); }
      };
      Object.keys(events).forEach(function (e) {
        video.removeEventListener(e, events[e]);
        video.addEventListener(e, events[e]);
      });
    },

    _startStatusMonitoring: function (config) {
      var self = this;
      if (_statusInterval) clearInterval(_statusInterval);
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // --- 核心：换集/实例变更检测 ---
        if (v !== _currentVideo) {
          _log('检测到视频实例变更，重置画质锁');
          _currentVideo = v;
          _qualityLocked = false; // 换视频了，允许重新执行一次切画质
          self._attachEventListeners(v);
          if (config.init) config.init.call(self);
        }

        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){ v.muted=true; v.play(); });
        }
        self._applyUniversalFullfix();
        
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth; _videoHeight = v.videoHeight;
          self._invokeNative('changeResolution', _videoWidth, _videoHeight);
        }
      }, 1500);
    },

    _getVideoElement: function () { return document.querySelector('video'); },

    _waitForVideoElement: function () {
      var self = this;
      return new Promise(function (resolve) {
        var v = self._getVideoElement();
        if (v) return resolve(v);
        var obs = new MutationObserver(function () {
          var v = self._getVideoElement(); if (v) { obs.disconnect(); resolve(v); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(function() { obs.disconnect(); resolve(self._getVideoElement()); }, 10000);
      });
    },

    _waitForElement: function (sel) {
      return new Promise(function (res) {
        var t = setInterval(function () { if (document.querySelector(sel)) { clearInterval(t); res(); } }, 400);
      });
    },

    _waitForVideoMetadata: function () {
      var v = this._getVideoElement();
      if (!v || v.videoWidth > 0) return Promise.resolve();
      return new Promise(function (res) {
        v.addEventListener('loadedmetadata', function onM() { v.removeEventListener('loadedmetadata', onM); res(); });
        setTimeout(res, 5000);
      });
    },

    _invokeNative: function (m) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[m]) {
        window.WebviewVideoPlayerInterface[m].apply(window.WebviewVideoPlayerInterface, args);
      }
    }
  };

  function _log(m) { if (window.WebviewVideoPlayerInterface) window.WebviewVideoPlayerInterface.logV('[Player] ' + m); }

  global.WebviewVideoPlayer = WebviewVideoPlayer;
  var start = function() { setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 800); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);

})(window);
