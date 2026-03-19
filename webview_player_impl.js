(function (global) {
  'use strict';

  var _currentVideo = null;
  var _qualityLocked = false;
  var _isPaused = false;
  var _statusInterval = null;
  var _isExecuting = false;

  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360, "标清": 480, "480": 480,
    "高清": 540, "540": 540, "超清": 720, "720": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080,
    "2K": 1440, "1440": 1440, "4K": 2160, "2160": 2160
  };

  var HOST_CONFIGS = {
    'tv.cctv.com': { beforeInit: function () { localStorage.setItem('cctv_live_resolution', 1080); } },
    'yangshipin.cn': {
      init: function () {
        var self = this;
        if (_qualityLocked || _isExecuting) return;
        _isExecuting = true;
        var retry = 0;
        var btnTimer = setInterval(function() {
          if (_qualityLocked) { clearInterval(btnTimer); _isExecuting = false; return; }
          var btn = document.querySelector('.bei-player-control-quality-btn');
          if (btn) {
            btn.click(); 
            clearInterval(btnTimer);
            self._waitForElement('.bei-list-inner').then(function() {
              setTimeout(function() {
                var spans = document.querySelectorAll('.bei-list-inner span');
                var items = Array.prototype.map.call(spans, function(s) {
                  var text = s.innerText.trim();
                  return { el: s, val: RESOLUTION_MAP[text] || parseInt(text.match(/\d+/) || 0) };
                }).filter(function(i) { return i.val > 0; });
                if (items.length > 0) {
                  items.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
                  items[0].el.click();
                  _qualityLocked = true; 
                  setTimeout(function() { var v = self._getVideoElement(); if(v) v.click(); _isExecuting = false; }, 500); 
                } else { _isExecuting = false; }
              }, 200); 
            });
          }
          if (++retry > 12) { clearInterval(btnTimer); _isExecuting = false; }
        }, 400);
      }
    },
    'web.guangdianyun.tv': { init: function () { this._applyUniversalFullfix(); } },
    'live.ipanda.com': { init: function () { this._applyUniversalFullfix(); } },
    'm.1905.com': {
      init: function () {
        var styleId = 'v-1905-style';
        if (!document.getElementById(styleId)) {
          var style = document.createElement('style');
          style.id = styleId;
          style.textContent = '.player-mask, .ad-box, .app-download-guide, .header-app { display: none !important; }';
          document.head.appendChild(style);
        }
        this._applyUniversalFullfix();
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: function () {
      var self = this;
      var host = location.hostname.replace('www.', '');
      var config = HOST_CONFIGS[host] || { init: function() { this._applyUniversalFullfix(); } };
      if (config.beforeInit) { try { config.beforeInit(); } catch(e) {} }

      setTimeout(function() {
        self._waitForVideoElement().then(function (video) {
          _currentVideo = video;
          if (config.init) config.init.call(self);
          self._applyUniversalFullfix();
          self._attachEventListeners(video);
          self._startMonitor(config);
        });
      }, 150); 
    },

    _applyUniversalFullfix: function () {
      var video = this._getVideoElement();
      if (!video || (video.getAttribute('data-v-fixed') === 'true' && video.offsetTop === 0)) return;
      
      var p = video.parentElement;
      while (p && p !== document.body) {
        p.style.setProperty('transform', 'none', 'important');
        p.style.setProperty('overflow', 'visible', 'important');
        p.style.setProperty('display', 'block', 'important');
        if (getComputedStyle(p).position !== 'static') p.style.setProperty('position', 'static', 'important');
        p = p.parentElement;
      }
      var styles = { 'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh', 'z-index': '2147483647', 'background': '#000', 'object-fit': 'contain', 'display': 'block' };
      for (var key in styles) { video.style.setProperty(key, styles[key], 'important'); }
      video.setAttribute('data-v-fixed', 'true');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    _attachEventListeners: function (video) {
      video.onplay = function () { _isPaused = false; };
      video.onpause = function () { _isPaused = true; };
    },

    _startMonitor: function (config) {
      var self = this;
      if (_statusInterval) clearInterval(_statusInterval);
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v || _isExecuting) return;

        if (v !== _currentVideo) {
          _currentVideo = v; _qualityLocked = false;
          v.removeAttribute('data-v-fixed');
          self._attachEventListeners(v);
          if (config.init) config.init.call(self);
          return;
        }

        if (!_isPaused && v.muted) {
          v.muted = false; 
          if (v.paused && v.readyState >= 2) v.play().catch(function(){});
        }
        
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){ v.muted = true; v.play(); });
        }
        
        self._applyUniversalFullfix();
      }, 2000); 
    },

    _getVideoElement: function () { return document.querySelector('video'); },
    _waitForVideoElement: function () {
      var self = this;
      return new Promise(function (resolve) {
        var t = setInterval(function() {
          var v = self._getVideoElement();
          if (v && v.isConnected !== false) { clearInterval(t); resolve(v); }
        }, 150);
      });
    },
    _waitForElement: function (sel) {
      return new Promise(function (res) {
        var t = setInterval(function () { if (document.querySelector(sel)) { clearInterval(t); res(); } }, 200);
      });
    }
  };

  if (document.readyState === 'complete') WebviewVideoPlayer.initialize(); 
  else window.addEventListener('load', function() { WebviewVideoPlayer.initialize(); });

})(window);
