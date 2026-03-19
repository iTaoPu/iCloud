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

  // 扩展分辨率映射表
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
        var params = new URLSearchParams(window.location.search);
        var targetRes = params.get('resolution') || "1080";
        var resValue = RESOLUTION_MAP[targetRes] || 1080;
        // CCTV 常用 localStorage 控制初始清晰度
        localStorage.setItem('cctv_live_resolution', resValue);
      },
      init: function () {
        var errorMsgEl = document.getElementById('error_msg_player');
        if (errorMsgEl && errorMsgEl.offsetHeight > 0) {
          throw new Error(errorMsgEl.textContent);
        }
      }
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        var params = new URLSearchParams(window.location.search);
        var targetRes = params.get('resolution') || "1080";

        return self._waitForElement('.bei-list-inner, .bright-text')
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            if (spans.length === 0) return;

            // 寻找最接近 1080 或目标的选项
            var items = Array.from(spans).map(s => ({ 
                el: s, 
                val: RESOLUTION_MAP[s.innerText.trim()] || 0 
            })).filter(i => i.val > 0);

            if (items.length > 0) {
                // 排序：优先找 1080，如果没有则找最接近目标的
                items.sort((a, b) => Math.abs(a.val - 1080) - Math.abs(b.val - 1080));
                items[0].el.click();
                return self._waitForVideoMetadata();
            }
          });
      }
    },

    'web.guangdianyun.tv': {
      init: function () {
        return this._waitForVideoMetadata();
      }
    },

    'live.ipanda.com': {
      init: function () {
        // iPanda 逻辑通常与 CCTV 类似
        return this._waitForVideoElement();
      }
    },

    'm.1905.com': {
      init: function () {
        return this._waitForVideoElement().then(function(video) {
            video.play().catch(function(e) { _log("1905 Autoplay blocked"); });
        });
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return;

      var host = location.hostname.replace('www.', '');
      var config = HOST_CONFIGS[host] || HOST_CONFIGS[location.host];

      if (config && config.beforeInit) {
        try { config.beforeInit(); } catch (e) { _log('Pre-init error: ' + e.message); }
      }

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config && config.init) { return config.init.call(self); }
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Player initialized for ' + host);
        })
        .catch(function (error) {
          _log('Init failed: ' + error.message, 'error');
          self._showErrorUI(error.message);
        });
    },

    _getVideoElement: function () {
      return document.querySelector('video');
    },

    _waitForVideoElement: function (timeout) {
      timeout = timeout || 30000;
      var video = this._getVideoElement();
      if (video) return Promise.resolve(video);

      return new Promise((resolve, reject) => {
        var timer = setTimeout(() => {
          observer.disconnect();
          reject(new Error('Wait for video timeout'));
        }, timeout);

        var observer = new MutationObserver(() => {
          var v = document.querySelector('video');
          if (v) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(v);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _waitForElement: function (selector, timeout) {
      timeout = timeout || 20000;
      var el = document.querySelector(selector);
      if (el) return Promise.resolve(el);

      return new Promise((resolve, reject) => {
        var timer = setTimeout(() => {
          observer.disconnect();
          reject(new Error('Wait for element timeout: ' + selector));
        }, timeout);

        var observer = new MutationObserver(() => {
          var target = document.querySelector(selector);
          if (target) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(target);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function () {
      var video = this._getVideoElement();
      if (!video) return Promise.reject();
      if (video.videoWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        setTimeout(resolve, 5000); // 兜底
      });
    },

    _prepareDOMEnvironment: function () {
      // 强制设置 Viewport 防止缩放
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      document.body.style.overflow = 'hidden';
      document.body.style.margin = '0';
      
      // 移除干扰样式
      var style = document.createElement('style');
      style.textContent = `
        body, html { background: #000 !important; }
        #video_ad_container, .ad-unit, .player-ad { display: none !important; }
      `;
      document.head.appendChild(style);
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;
      Object.assign(video.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100vw', height: '100vh',
        zIndex: '999999',
        backgroundColor: '#000',
        objectFit: 'contain'
      });
    },

    _attachEventListeners: function () {
      var video = this._getVideoElement();
      if (!video) return;

      var self = this;
      var events = ['play', 'pause', 'waiting', 'ended', 'error', 'loadedmetadata', 'timeupdate'];
      
      events.forEach(function (eventName) {
        var handler = function () {
          if (!window.WebviewVideoPlayerInterface) return;
          
          switch(eventName) {
            case 'play': _isPaused = false; window.WebviewVideoPlayerInterface.triggerPlaying?.(); break;
            case 'pause': _isPaused = true; window.WebviewVideoPlayerInterface.triggerPaused?.(); break;
            case 'loadedmetadata': 
                _videoWidth = video.videoWidth; 
                _videoHeight = video.videoHeight;
                window.WebviewVideoPlayerInterface.changeResolution?.(_videoWidth, _videoHeight);
                break;
            case 'timeupdate':
                var pos = Math.floor(video.currentTime * 1000);
                window.WebviewVideoPlayerInterface.changePosition?.(pos, pos); // 直播通常时长等于当前位置
                break;
          }
        };
        video.addEventListener(eventName, handler);
        _eventListeners.push({ element: video, type: eventName, listener: handler });
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var video = self._getVideoElement();
        if (!video) return;

        // 强制播放
        if (!_isPaused && video.paused) {
          video.play().catch(() => {});
        }
        // 保持全屏
        if (video.style.position !== 'fixed') {
          self._enterFullscreen();
        }
      }, 2000);
    },

    _showErrorUI: function (msg) {
      var div = document.createElement('div');
      Object.assign(div.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: '#000', color: '#fff', zIndex: '1000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      div.textContent = "播放错误: " + msg;
      document.body.appendChild(div);
    }
  };

  function _log(msg, level = 'info') {
    if (window.WebviewVideoPlayerInterface?.logV) {
      window.WebviewVideoPlayerInterface.logV('[JS_PLAYER] ' + msg);
    }
    console[level === 'error' ? 'error' : 'log'](msg);
  }

  // 启动逻辑
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => WebviewVideoPlayer.initialize(), 600));
  } else {
    setTimeout(() => WebviewVideoPlayer.initialize(), 600);
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

})(typeof window !== 'undefined' ? window : this);
