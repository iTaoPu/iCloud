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
    },
    'yangshipin.cn': {
      init: function () {
        var self = this;
        var res = new URLSearchParams(window.location.search).get('resolution');
        if (!res) return self._waitForVideoMetadata();
        return self._waitForElement('.quality-list, .definition-btn, .bei-list-inner', 8000)
          .then(function () {
            var items = document.querySelectorAll('.bei-list-inner span, .quality-list li, .definition-btn, [class*="quality"]');
            var target = Array.from(items).find(function (el) {
              var txt = el.innerText || "";
              if (res.includes('4K')) return /4K|2160|超高/.test(txt);
              if (res.includes('1080')) return /1080|超清|蓝光/.test(txt);
              return txt.includes(res);
            });
            if (target) target.click();
            return self._waitForVideoMetadata();
          });
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      _log('Starting Ultimate Video Fix...');

      var config = HOST_CONFIGS[location.host] || {};
      if (config.beforeInit) try { config.beforeInit(); } catch (e) {}

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyDeepRepair(); 
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Success: Video environment repaired.');
        })
        .catch(function (error) {
          _log('Fail: ' + error.message, 'error');
          self._showErrorUI(error.message);
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

      // 1. 强制清理 Html/Body 容器背景与溢出
      [document.documentElement, document.body].forEach(el => {
        el.style.setProperty('background', '#000', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
      });

      // 2. 节点提取：绕过容器限制
      if (video.parentElement !== document.body) {
        var wasPaused = video.paused;
        var currentTime = video.currentTime;
        document.body.appendChild(video);
        
        // 针对 fjtv.net 修复：安全调用 play
        if (!wasPaused) {
          try {
            var p = video.play();
            if (p !== undefined && typeof p.catch === 'function') {
              p.catch(function(e){ _log('Play error: ' + e.message); });
            }
          } catch(e) {}
        }
        if (currentTime > 0) video.currentTime = currentTime;
      }

      // 3. 极高强度样式锁定（解决 btzx.com.cn 有声无画及闪现问题）
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background-color': '#000', 'object-fit': 'contain',
        'display': 'block', 'visibility': 'visible', 'opacity': '1', 'transform': 'none',
        'clip': 'auto', 'clip-path': 'none', 'mask': 'none', 'filter': 'none',
        'transition': 'none', 'margin': '0', 'padding': '0'
      };
      for (var p in props) s.setProperty(p, props[p], 'important');

      // 4. 彻底消除 body 下其他元素的视觉干扰
      Array.from(document.body.children).forEach(el => {
        if (el !== video && el.id !== 'webview-video-error' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
        }
      });

      // 5. 强制触发 Reflow 重绘渲染
      video.style.display = 'none';
      video.offsetHeight; 
      video.style.setProperty('display', 'block', 'important');
    },

    _startStatusMonitoring: function () {
      var self = this;
      // 提高轮询频率至 400ms，防止 btzx 等站点脚本动态还原样式
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 如果位置被挪动或样式被篡改，立即修复
        if (v.parentElement !== document.body || v.style.position !== 'fixed' || v.style.visibility === 'hidden') {
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
      }, 400);

      _mutationObserver = new MutationObserver((mutations) => {
        var v = self._getVideoElement();
        if (v && (v !== _currentVideoElement || v.parentElement !== document.body)) {
          self._applyDeepRepair();
        }
      });
      _mutationObserver.observe(document.body, { childList: true, attributes: true });
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
        var timer = setTimeout(() => { obs.disconnect(); reject(new Error('Wait video timeout')); }, timeout || 30000);
        var obs = new MutationObserver(() => {
          var v2 = this._getVideoElement();
          if (v2) { clearTimeout(timer); obs.disconnect(); resolve(v2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function () {
      var v = this._getVideoElement();
      if (!v) return Promise.reject();
      return new Promise(res => {
        if (v.videoWidth > 0) return res();
        v.addEventListener('loadedmetadata', () => res(), { once: true });
        setTimeout(res, 5000);
      });
    },

    _waitForElement: function (sel, timeout) {
      return new Promise(res => {
        var el = document.querySelector(sel);
        if (el) return res(el);
        setTimeout(res, timeout || 8000);
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
      d.textContent = msg;
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
