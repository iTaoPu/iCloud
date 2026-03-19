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
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      _log('Starting Deep Repair Mode...');

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyDeepRepair(); 
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Success: Environment stabilized.');
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

      // 1. 锁定 HTML/BODY 基础环境
      [document.documentElement, document.body].forEach(el => {
        el.style.setProperty('background', '#000', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('margin', '0', 'important');
      });

      // 2. 递归向上：破除所有父容器的裁剪和偏移（解决闪退核心）
      var parent = video.parentElement;
      while (parent && parent !== document.body) {
        parent.style.setProperty('position', 'static', 'important');
        parent.style.setProperty('overflow', 'visible', 'important');
        parent.style.setProperty('display', 'block', 'important');
        parent.style.setProperty('transform', 'none', 'important');
        parent.style.setProperty('clip', 'auto', 'important');
        parent.style.setProperty('z-index', 'auto', 'important');
        parent = parent.parentElement;
      }

      // 3. 锁定视频样式：强制全屏且最顶层
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background-color': '#000', 'object-fit': 'contain',
        'display': 'block', 'visibility': 'visible', 'opacity': '1', 'transform': 'none',
        'filter': 'none', 'transition': 'none', 'margin': '0'
      };
      for (var p in props) s.setProperty(p, props[p], 'important');

      // 4. 隐藏干扰元素：隐藏 body 下非视频所在链路的其它节点
      // 这里的逻辑是：只保留包含 video 的链路，其它的全部隐藏
      this._hideNonEssential(video);
      
      // 5. 解决 fjtv.net 的 play() 报错
      if (!video.paused) {
        try {
          var p = video.play();
          if (p && typeof p.catch === 'function') p.catch(function(){});
        } catch(e) {}
      }
    },

    _hideNonEssential: function(video) {
      var nodesToKeep = [];
      var curr = video;
      while (curr) {
        nodesToKeep.push(curr);
        curr = curr.parentElement;
      }

      Array.from(document.body.children).forEach(el => {
        if (!nodesToKeep.includes(el) && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 持续监控样式。如果 position 不是 fixed，说明被原站脚本还原了
        if (v.style.position !== 'fixed' || v.style.visibility === 'hidden') {
          self._applyDeepRepair();
        }

        // 强行解除静音
        if (v.muted) v.muted = false;
        if (v.volume !== _volume) v.volume = _volume;

        // 自动播放保活
        if (!_isPaused && v.paused && v.readyState >= 2) {
          try {
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(function(){});
          } catch(e) {}
        }

        // 分辨率回调
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
        var timer = setTimeout(() => { obs.disconnect(); reject(new Error('Wait timeout')); }, timeout || 20000);
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
