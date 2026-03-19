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
  // 记录当前视频元素引用，防止在移动节点时丢失
  var _currentVideoElement = null;

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
          var targetVal = RESOLUTION_MAP[resParam] || parseInt(resParam.replace(/[^\d]/g, ''));
          if (!isNaN(targetVal)) {
            localStorage.setItem('cctv_live_resolution', targetVal.toString());
            _log('CCTV Resolution Pre-set: ' + targetVal);
          } else {
            localStorage.setItem('cctv_live_resolution', 'auto');
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
            if (target) {
                _log('Clicking resolution: ' + target.innerText);
                target.click();
            }
            return self._waitForVideoMetadata();
          });
      }
    },
    'www.cditv.cn': {
      init: function () {
        // 该站点有特殊的 transform 限制，已在通用 _enterFullscreen 中通过 body.appendChild 覆盖
        _log('CDITV special handling active via body-append logic');
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      _log('Starting video player initialization...');

      var config = HOST_CONFIGS[location.host] || {};
      if (config.beforeInit) {
        try { config.beforeInit(); } catch (e) { _log('Pre-init failed: ' + e.message, 'error'); }
      }

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          return self._waitForVideoElement();
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen(); 
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Initialization successful');
        })
        .catch(function (error) {
          _log('Initialization failed: ' + error.message, 'error');
          self._showErrorUI(error.message);
          throw error;
        });
    },

    _getVideoElement: function () {
      var v = document.querySelector('video');
      if (v) return v;
      // 穿透同源 iframe (针对部分地方台)
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          var iv = iframes[i].contentDocument?.querySelector('video');
          if (iv) return iv;
        } catch (e) {}
      }
      return null;
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;

      _currentVideoElement = video;

      // 【融合核心】将 video 移动到 body 根部，绕过所有父级 overflow/transform 限制
      if (video.parentElement !== document.body) {
        var wasPaused = video.paused;
        var currentTime = video.currentTime;
        document.body.appendChild(video);
        if (!wasPaused) video.play().catch(function(){});
        if (currentTime > 0) video.currentTime = currentTime;
        _log('Bypassed container limits by moving video to body');
      }

      // 【样式锁定】使用 !important 强制覆盖
      var s = video.style;
      var props = {
        'position': 'fixed', 'top': '0', 'left': '0', 'right': '0', 'bottom': '0',
        'width': '100vw', 'height': '100vh', 'z-index': '2147483647',
        'background-color': 'black', 'object-fit': 'contain', 'margin': '0',
        'padding': '0', 'border': 'none', 'transform': 'none', 'transition': 'none',
        'max-width': 'none', 'max-height': 'none', 'pointer-events': 'auto'
      };
      for (var p in props) {
        s.setProperty(p, props[p], 'important');
      }

      _log('Fullscreen styles applied and locked');
    },

    _prepareDOMEnvironment: function () {
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      document.body.style.setProperty('margin', '0', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('background-color', '#000', 'important');
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 1. 全屏破坏检查（核心修复）
        var isMisplaced = v.parentElement !== document.body || v.style.position !== 'fixed' || v.offsetWidth < window.innerWidth - 5;
        if (isMisplaced) {
          self._enterFullscreen();
        }

        // 2. 音量锁定
        if (v.volume !== _volume) v.volume = _volume;

        // 3. 自动播放补偿
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){});
        }

        // 4. 分辨率变化同步
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          self._updateResolution(v.videoWidth, v.videoHeight);
        }
      }, 800);

      // 监听 DOM，防止视频被脚本动态移除
      _mutationObserver = new MutationObserver(function () {
        var v = self._getVideoElement();
        if (v && (v !== _currentVideoElement || v.parentElement !== document.body)) {
          self._enterFullscreen();
        }
      });
      _mutationObserver.observe(document.body, { childList: true, subtree: true });
    },

    _updateResolution: function (w, h) {
      if (w === _videoWidth && h === _videoHeight) return;
      _videoWidth = w; _videoHeight = h;
      if (window.WebviewVideoPlayerInterface?.changeResolution) {
        window.WebviewVideoPlayerInterface.changeResolution(w, h);
      }
      _log('Resolution: ' + w + 'x' + h);
    },

    _waitForVideoElement: function (timeout) {
      timeout = timeout || 30000;
      var self = this;
      return new Promise(function (resolve, reject) {
        var v = self._getVideoElement();
        if (v) return resolve(v);
        var timer = setTimeout(function () { obs.disconnect(); reject(new Error('Timeout searching video')); }, timeout);
        var obs = new MutationObserver(function () {
          var v2 = self._getVideoElement();
          if (v2) { clearTimeout(timer); obs.disconnect(); resolve(v2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function (timeout) {
      var v = this._getVideoElement();
      if (!v) return Promise.reject(new Error('No video'));
      return new Promise(function (resolve) {
        if (v.videoWidth > 0) return resolve();
        var onLoaded = function () { v.removeEventListener('loadedmetadata', onLoaded); resolve(); };
        v.addEventListener('loadedmetadata', onLoaded);
        setTimeout(resolve, timeout || 5000);
      });
    },

    _waitForElement: function (selector, timeout) {
      return new Promise(function (resolve) {
        var el = document.querySelector(selector);
        if (el) return resolve(el);
        var timer = setTimeout(function () { obs.disconnect(); resolve(null); }, timeout || 8000);
        var obs = new MutationObserver(function () {
          var el2 = document.querySelector(selector);
          if (el2) { clearTimeout(timer); obs.disconnect(); resolve(el2); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });
    },

    _attachEventListeners: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var handlers = {
        play: () => { _isPaused = false; window.WebviewVideoPlayerInterface?.triggerPlaying?.(); },
        pause: () => { _isPaused = true; window.WebviewVideoPlayerInterface?.triggerPaused?.(); },
        waiting: () => window.WebviewVideoPlayerInterface?.triggerLoading?.(),
        ended: () => window.WebviewVideoPlayerInterface?.triggerEnded?.(),
        error: () => window.WebviewVideoPlayerInterface?.triggerError?.(),
        loadedmetadata: () => {
           this._updateResolution(video.videoWidth, video.videoHeight);
           this._enterFullscreen();
        },
        timeupdate: () => {
          if (window.WebviewVideoPlayerInterface?.changePosition) {
            var pos = Math.floor(video.currentTime * 1000);
            var dur = (HOST_CONFIGS[location.host]?.getDuration?.()) || Math.floor(video.duration * 1000) || pos;
            window.WebviewVideoPlayerInterface.changePosition(pos, Math.max(pos, dur));
          }
        }
      };
      Object.keys(handlers).forEach(event => {
        video.addEventListener(event, handlers[event]);
        _eventListeners.push({ element: video, type: event, listener: handlers[event] });
      });
    },

    _showErrorUI: function (msg) {
      var d = document.getElementById('webview-video-error') || document.createElement('div');
      d.id = 'webview-video-error';
      d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;background:black;color:white;display:flex;justify-content:center;align-items:center;';
      d.textContent = msg;
      if (!d.parentNode) document.body.appendChild(d);
    }
  };

  function _log(m, l) {
    if (window.WebviewVideoPlayerInterface?.logV) window.WebviewVideoPlayerInterface.logV('[WebviewPlayer] ' + m);
    console[l || 'info'](m);
  }

  // 延迟启动确保动态内容加载
  var start = () => setTimeout(() => global.WebviewVideoPlayer.initialize(), 600);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;
})(typeof window !== 'undefined' ? window : this);
