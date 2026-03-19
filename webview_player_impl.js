(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _currentVideoElement = null;

  var RESOLUTION_MAP = {
    "流畅": 360, "标清": 480, "高清": 540, "超清": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440, "4K": 2160, "2160": 2160, "8K": 4320
  };

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        var resParam = new URLSearchParams(window.location.search).get('resolution');
        if (resParam) {
          var targetVal = RESOLUTION_MAP[resParam] || parseInt(resParam.replace(/[^\d]/g, ''));
          if (!isNaN(targetVal)) {
            localStorage.setItem('cctv_live_resolution', targetVal.toString());
          }
        }
      },
      getDuration: function () {
        var p = new URLSearchParams(window.location.search);
        var s = p.get('stime'), e = p.get('etime');
        if (s?.length === 14 && e?.length === 14) {
          var parse = (t) => new Date(t.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1/$2/$3 $4:$5:$6"));
          return Math.floor(parse(e) - parse(s));
        }
        return 0;
      }
    }
    // ... 其他配置保持不变
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return;
      _log('Initializing Secure Video Environment...');

      var config = HOST_CONFIGS[location.host] || {};
      if (config.beforeInit) try { config.beforeInit(); } catch (e) {}

      try {
        await this._waitForVideoElement();
        if (config.init) await config.init.call(this);
        
        this._prepareDOMEnvironment();
        this._applyDeepRepair();
        this._attachEventListeners();
        this._startStatusMonitoring();
        
        _isInitialized = true;
        _log('Success: Environment fully repaired.');
      } catch (error) {
        _log('Fail: ' + error.message, 'error');
        this._showErrorUI(error.message);
      }
    },

    _getVideoElement: function () {
      var v = document.querySelector('video');
      if (v) return v;
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          var iv = iframes[i].contentDocument?.querySelector('video');
          if (iv) return iv;
        } catch (e) {}
      }
      return null;
    },

    // 修复 play() 报错的辅助函数
    _safePlay: function (v) {
      if (!v) return;
      try {
        var p = v.play();
        if (p !== undefined && typeof p.catch === 'function') {
          p.catch(function (e) { _log('Play interrupted: ' + e.message); });
        }
      } catch (e) {
        _log('Exec play failed: ' + e.message);
      }
    },

    _applyDeepRepair: function () {
      var video = this._getVideoElement();
      if (!video) return;
      _currentVideoElement = video;

      // 1. 尝试不移动节点，而是通过穿透父级限制（解决有声无画）
      var p = video.parentElement;
      while (p && p !== document.body) {
        p.style.setProperty('overflow', 'visible', 'important');
        p.style.setProperty('transform', 'none', 'important');
        p.style.setProperty('clip', 'auto', 'important');
        p.style.setProperty('filter', 'none', 'important');
        p = p.parentElement;
      }

      // 2. 强力样式锁定
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background-color': 'black', 'object-fit': 'contain',
        'display': 'block', 'visibility': 'visible', 'opacity': '1',
        'transform': 'translateZ(0)', // 强制开启硬件加速，解决黑屏
        '-webkit-transform': 'translateZ(0)',
        'clip-path': 'none', 'margin': '0'
      };
      for (var prop in props) s.setProperty(prop, props[prop], 'important');

      // 3. 漂白背景
      Array.from(document.body.children).forEach(el => {
        if (el !== video && !el.contains(video) && el.id !== 'webview-video-error' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 纠正静音和全屏
        if (v.style.position !== 'fixed') self._applyDeepRepair();
        if (v.muted) v.muted = false;
        if (v.volume !== _volume) v.volume = _volume;

        // 修复 play().catch 报错点
        if (!_isPaused && v.paused && v.readyState >= 2) {
          self._safePlay(v);
        }

        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth; _videoHeight = v.videoHeight;
          window.WebviewVideoPlayerInterface?.changeResolution?.(_videoWidth, _videoHeight);
        }
      }, 800);
    },

    _prepareDOMEnvironment: function () {
      document.body.style.setProperty('background', '#000', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      // 触发一次回流渲染，解决某些设备画面不刷新的问题
      document.body.offsetHeight;
    },

    _waitForVideoElement: function (timeout) {
      return new Promise((resolve, reject) => {
        var v = this._getVideoElement();
        if (v) return resolve(v);
        var timer = setTimeout(() => { obs.disconnect(); reject(new Error('Timeout')); }, timeout || 20000);
        var obs = new MutationObserver(() => {
          var v2 = this._getVideoElement();
          if (v2) { clearTimeout(timer); obs.disconnect(); resolve(v2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _attachEventListeners: function () {
      var v = this._getVideoElement();
      if (!v) return;
      var self = this;
      var handlers = {
        play: () => { _isPaused = false; window.WebviewVideoPlayerInterface?.triggerPlaying?.(); },
        pause: () => { _isPaused = true; window.WebviewVideoPlayerInterface?.triggerPaused?.(); },
        timeupdate: () => {
          if (window.WebviewVideoPlayerInterface?.changePosition) {
            var pos = Math.floor(v.currentTime * 1000);
            var dur = (HOST_CONFIGS[location.host]?.getDuration?.()) || Math.floor(v.duration * 1000) || pos;
            window.WebviewVideoPlayerInterface.changePosition(pos, Math.max(pos, dur));
          }
        }
      };
      Object.keys(handlers).forEach(e => v.addEventListener(e, handlers[e]));
    },

    _showErrorUI: function (msg) {
      var d = document.createElement('div');
      d.id = 'webview-video-error';
      d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;background:#000;color:#fff;display:flex;justify-content:center;align-items:center;';
      d.textContent = 'Player Error: ' + msg;
      document.body.appendChild(d);
    }
  };

  function _log(m, l) {
    if (window.WebviewVideoPlayerInterface?.logV) window.WebviewVideoPlayerInterface.logV('[WebviewPlayer] ' + m);
    console[l || 'info'](m);
  }

  var start = () => setTimeout(() => WebviewVideoPlayer.initialize(), 600);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.WebviewVideoPlayer = WebviewVideoPlayer;
})(typeof window !== 'undefined' ? window : this);
