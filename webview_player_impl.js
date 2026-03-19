(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _statusInterval = null;
  var _currentVideoElement = null;

  // 使用您指定的分辨率映射
  var RESOLUTION_MAP = {
    "流畅": 360, "标清": 480, "高清": 540, "超清": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440, "4K": 2160, "2160": 2160, "8K": 4320
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      _log('Starting Ultimate Video Fix (No-Move Mode)...');

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyDeepRepair(); 
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Success: Video environment stabilized.');
        })
        .catch(function (error) {
          _log('Fail: ' + error.message, 'error');
        });
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

    _applyDeepRepair: function () {
      var video = this._getVideoElement();
      if (!video) return;
      _currentVideoElement = video;

      // 1. 基础环境锁定
      [document.documentElement, document.body].forEach(el => {
        el.style.setProperty('background', '#000', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
      });

      // 2. 递归向上：解除所有父容器的限制（关键：不移动节点，防止 btzx 闪退）
      var parent = video.parentElement;
      while (parent && parent !== document.body) {
        parent.style.setProperty('position', 'static', 'important');
        parent.style.setProperty('overflow', 'visible', 'important');
        parent.style.setProperty('display', 'block', 'important');
        parent.style.setProperty('transform', 'none', 'important');
        parent.style.setProperty('clip', 'auto', 'important');
        parent.style.setProperty('filter', 'none', 'important');
        parent.style.setProperty('perspective', 'none', 'important');
        parent = parent.parentElement;
      }

      // 3. 强制视频全屏覆盖
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background-color': '#000', 'object-fit': 'contain',
        'display': 'block', 'visibility': 'visible', 'opacity': '1', 'transform': 'none',
        'clip-path': 'none', 'mask': 'none', 'filter': 'none', 'margin': '0'
      };
      for (var p in props) s.setProperty(p, props[p], 'important');

      // 4. 隐藏干扰元素（仅保留视频及其父级链路）
      this._hideStrangers(video);

      // 5. 安全触发播放（兼容 fjtv.net）
      if (!video.paused) {
        try {
          var p = video.play();
          if (p !== undefined && typeof p.catch === 'function') p.catch(function(){});
        } catch(e) {}
      }
    },

    _hideStrangers: function(video) {
      var path = [];
      var curr = video;
      while (curr) { path.push(curr); curr = curr.parentElement; }

      Array.from(document.body.children).forEach(el => {
        if (!path.includes(el) && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 持续监控：如果样式被原站 JS 还原，则再次修复
        if (v.style.position !== 'fixed' || v.style.visibility === 'hidden') {
          self._applyDeepRepair();
        }

        if (v.muted) v.muted = false;
        if (v.volume !== _volume) v.volume = _volume;

        if (!_isPaused && v.paused && v.readyState >= 2) {
          try {
            var p = v.play();
            if (p !== undefined && typeof p.catch === 'function') p.catch(function(){});
          } catch(e) {}
        }

        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth; _videoHeight = v.videoHeight;
          window.WebviewVideoPlayerInterface?.changeResolution?.(_videoWidth, _videoHeight);
        }
      }, 500);
    },

    _prepareDOMEnvironment: function () {
      var m = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!m.parentNode) document.head.appendChild(m);
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
      var handlers = {
        play: () => { _isPaused = false; window.WebviewVideoPlayerInterface?.triggerPlaying?.(); },
        pause: () => { _isPaused = true; window.WebviewVideoPlayerInterface?.triggerPaused?.(); },
        waiting: () => window.WebviewVideoPlayerInterface?.triggerLoading?.(),
        timeupdate: () => {
          if (window.WebviewVideoPlayerInterface?.changePosition) {
            var pos = Math.floor(v.currentTime * 1000);
            var dur = Math.floor(v.duration * 1000) || pos;
            window.WebviewVideoPlayerInterface.changePosition(pos, Math.max(pos, dur));
          }
        }
      };
      Object.keys(handlers).forEach(e => v.addEventListener(e, handlers[e]));
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
