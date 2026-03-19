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

  // 分辨率映射表：增加 2K 和模糊匹配逻辑
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
          // 优先匹配映射表，匹配不到则尝试提取数字
          var targetVal = RESOLUTION_MAP[resParam] || parseInt(resParam.replace(/[^\d]/g, ''));
          if (!isNaN(targetVal)) {
            localStorage.setItem('cctv_live_resolution', targetVal.toString());
            _log('CCTV Resolution Pre-set: ' + targetVal);
          }
        }
      },
      init: function () {
        var err = document.getElementById('error_msg_player');
        if (err && err.offsetHeight > 0) throw new Error(err.textContent);
      },
      getDuration: function () {
        var p = new URLSearchParams(window.location.search);
        var s = p.get('stime'), e = p.get('etime');
        if (s?.length === 14 && e?.length === 14) {
          var parseTime = (t) => new Date(t.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1/$2/$3 $4:$5:$6"));
          return Math.floor(parseTime(e) - parseTime(s));
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
      if (_isInitialized) return;
      _log('Initialising WebviewVideoPlayer...');

      var config = HOST_CONFIGS[location.host] || {};
      if (config.beforeInit) config.beforeInit();

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._applyFullscreenStyles(); // 首次应用全屏
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Initialization Complete');
        })
        .catch(function (e) {
          _log('Init Error: ' + e.message, 'error');
          self._showErrorUI(e.message);
        });
    },

    // 核心改进：穿透 Iframe 寻找 Video
    _getVideoElement: function () {
      var v = document.querySelector('video');
      if (v) return v;

      // 递归寻找同源 iframe 内的 video (解决地方台问题的关键)
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          var iv = iframes[i].contentDocument?.querySelector('video');
          if (iv) return iv;
        } catch (e) { /* Cross-origin blocked */ }
      }
      return null;
    },

    _prepareDOMEnvironment: function () {
      // 优化 Viewport
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      // 强制背景黑场
      document.documentElement.style.background = '#000';
      document.body.style.setProperty('background', '#000', 'important');
      document.body.style.setProperty('margin', '0', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
    },

    // 核心改进：清理所有父级干扰样式
    _applyFullscreenStyles: function () {
      var video = this._getVideoElement();
      if (!video) return;

      // 1. 递归清理父容器（防止 transform 导致 fixed 失效）
      var p = video.parentElement;
      while (p && p !== document.body) {
        if (getComputedStyle(p).transform !== 'none') {
           p.style.setProperty('transform', 'none', 'important');
           p.style.setProperty('webkitTransform', 'none', 'important');
        }
        if (getComputedStyle(p).filter !== 'none') p.style.setProperty('filter', 'none', 'important');
        p.style.setProperty('perspective', 'none', 'important');
        p.style.setProperty('overflow', 'visible', 'important');
        p = p.parentElement;
      }

      // 2. 锁定 Video 样式
      var s = video.style;
      s.setProperty('position', 'fixed', 'important');
      s.setProperty('top', '0', 'important');
      s.setProperty('left', '0', 'important');
      s.setProperty('width', '100vw', 'important');
      s.setProperty('height', '100vh', 'important');
      s.setProperty('z-index', '2147483647', 'important');
      s.setProperty('object-fit', 'contain', 'important'); // 保持比例，如需拉满改 cover
      s.setProperty('background', '#000', 'important');
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 持续校验全屏状态 (防止页面脚本改回去)
        if (v.style.position !== 'fixed' || v.offsetWidth < window.innerWidth * 0.9) {
          self._applyFullscreenStyles();
        }

        if (v.volume !== _volume) v.volume = _volume;

        // 自动播放补偿
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){});
        }

        // 分辨率变更通知
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth;
          _videoHeight = v.videoHeight;
          window.WebviewVideoPlayerInterface?.changeResolution?.(_videoWidth, _videoHeight);
        }
      }, 1500);
    },

    _waitForVideoElement: function (timeout) {
      timeout = timeout || 30000;
      var self = this;
      return new Promise(function (resolve, reject) {
        var v = self._getVideoElement();
        if (v) return resolve(v);
        var timer = setTimeout(function () { obs.disconnect(); reject(new Error('Video Search Timeout')); }, timeout);
        var obs = new MutationObserver(function () {
          var v2 = self._getVideoElement();
          if (v2) { clearTimeout(timer); obs.disconnect(); resolve(v2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function () {
      var v = this._getVideoElement();
      if (!v) return Promise.reject();
      return new Promise(function(res) {
        if (v.videoWidth > 0) return res();
        v.addEventListener('loadedmetadata', res, { once: true });
        setTimeout(res, 5000); 
      });
    },

    _waitForElement: function (sel, timeout) {
      return new Promise(function(res) {
        var el = document.querySelector(sel);
        if (el) return res(el);
        setTimeout(res, timeout || 5000);
      });
    },

    _attachEventListeners: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var self = this;
      ['play', 'pause', 'waiting', 'error', 'timeupdate'].forEach(function(e) {
        var handler = function() {
          if (!window.WebviewVideoPlayerInterface) return;
          if (e === 'play') { _isPaused = false; window.WebviewVideoPlayerInterface.triggerPlaying?.(); }
          if (e === 'pause') { _isPaused = true; window.WebviewVideoPlayerInterface.triggerPaused?.(); }
          if (e === 'timeupdate') {
            var pos = Math.floor(video.currentTime * 1000);
            var hostDur = HOST_CONFIGS[location.host]?.getDuration?.();
            var dur = hostDur || Math.floor(video.duration * 1000) || pos;
            window.WebviewVideoPlayerInterface.changePosition?.(pos, dur);
          }
        };
        video.addEventListener(e, handler);
        _eventListeners.push({element: video, type: e, listener: handler});
      });
    },

    _showErrorUI: function (msg) {
      if (document.getElementById('webview-video-error')) return;
      var d = document.createElement('div');
      d.id = 'webview-video-error';
      Object.assign(d.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: '#000', color: '#ccc', zIndex: '999999', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
      });
      d.innerHTML = `<p>播放初始化失败</p><small style="opacity:0.5">${msg}</small>`;
      document.body.appendChild(d);
    }
  };

  function _log(m, l) {
    if (window.WebviewVideoPlayerInterface?.logV) window.WebviewVideoPlayerInterface.logV('[VideoPlayer] ' + m);
    console[l || 'info'](m);
  }

  // 启动：增加延时确保部分动态 script 已加载
  var start = function() {
    setTimeout(function() { WebviewVideoPlayer.initialize(); }, 600);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

})(typeof window !== 'undefined' ? window : this);
