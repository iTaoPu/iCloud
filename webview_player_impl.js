(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _statusInterval = null;

  var RESOLUTION_MAP = {
    "流畅": 360, "标清": 480, "高清": 540, "超清": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440, "4K": 2160, "2160": 2160, "8K": 4320
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      _log('Executing Critical Render Repair...');

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyDeepRepair(); 
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Success: Video forced to front.');
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

      // 1. 净化全局环境
      const styleTagId = 'webview-force-video-style';
      if (!document.getElementById(styleTagId)) {
        var style = document.createElement('style');
        style.id = styleTagId;
        style.innerHTML = `
          html, body { background: #000 !important; overflow: hidden !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }
          video { pointer-events: auto !important; }
          .webview-hidden-node { display: none !important; visibility: hidden !important; }
        `;
        document.head.appendChild(style);
      }

      // 2. 溯源清理：将视频的每一个父节点都强制转化为全屏容器
      var curr = video;
      var path = [];
      while (curr && curr !== document.documentElement) {
        path.push(curr);
        if (curr !== video) {
          curr.style.cssText = "all: unset !important; display: block !important; position: static !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important;";
        }
        curr = curr.parentElement;
      }

      // 3. 锁定视频样式（最强优先级）
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background-color': '#000', 'object-fit': 'contain',
        'display': 'block', 'visibility': 'visible', 'opacity': '1', 'transform': 'none',
        'clip': 'auto', 'clip-path': 'none', 'filter': 'none'
      };
      for (var p in props) s.setProperty(p, props[p], 'important');

      // 4. 物理隐藏所有非视频链路的同级节点
      this._isolateVideoPath(path);

      // 5. 解决 fjtv.net 的 play() 返回值问题
      if (!video.paused) {
        try {
          var p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch(e) {}
      }
    },

    _isolateVideoPath: function(path) {
      // 遍历所有父节点，隐藏它们的非路径子节点
      path.forEach(node => {
        if (node.parentElement) {
          Array.from(node.parentElement.children).forEach(sibling => {
            if (!path.includes(sibling) && sibling.tagName !== 'SCRIPT' && sibling.tagName !== 'STYLE') {
              sibling.classList.add('webview-hidden-node');
            }
          });
        }
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 检测样式是否被第三方 JS 还原（特别是 btzx 这种动态插入广告或蒙层的）
        if (v.style.position !== 'fixed' || v.offsetWidth === 0) {
          self._applyDeepRepair();
        }

        if (v.muted) v.muted = false;
        if (v.volume !== _volume) v.volume = _volume;

        if (!_isPaused && v.paused && v.readyState >= 2) {
          try {
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch(e) {}
        }

        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth; _videoHeight = v.videoHeight;
          window.WebviewVideoPlayerInterface?.changeResolution?.(_videoWidth, _videoHeight);
        }
      }, 600);
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
        var obs = new MutationObserver(() => {
          var v2 = this._getVideoElement();
          if (v2) { obs.disconnect(); resolve(v2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('Wait Timeout')); }, timeout || 15000);
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
