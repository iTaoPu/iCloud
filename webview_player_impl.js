(function (global) {
  'use strict';

  var _isInitialized = false;
  var _isPaused = false;
  var _volume = 1.0;

  var RESOLUTION_MAP = {
    "流畅": 360, "360": 360, "标清": 480, "480": 480, "高清": 540, "540": 540,
    "超清": 720, "720": 720, "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080
  };

  var WebviewVideoPlayer = {
    // 1. 核心启动：全屏修复与业务逻辑并行
    initialize: function () {
      if (_isInitialized) return;
      var host = location.hostname.replace('www.', '');
      
      // A. 立即开始高频全屏监控（解决 1905 延迟问题）
      this._startInstantFullfix();

      // B. 异步处理各站点的特有逻辑（如画质切换）
      this._handleSiteSpecifics(host);

      this._attachBaseEvents();
      _isInitialized = true;
      console.log('[Player] 核心引擎已启动');
    },

    // 2. 暴力全屏：不等待任何条件，只要有 video 就强修
    _startInstantFullfix: function () {
      var self = this;
      var fix = function () {
        var video = document.querySelector('video');
        if (!video) return;

        // 针对 1905：如果视频不在 body 下，直接“抢”出来
        if (location.host.indexOf('1905.com') !== -1 && video.parentElement !== document.body) {
          document.body.appendChild(video);
        }

        // 递归解除父级限制
        var p = video.parentElement;
        while (p && p !== document.body) {
          p.style.setProperty('transform', 'none', 'important');
          p.style.setProperty('overflow', 'visible', 'important');
          p.style.setProperty('filter', 'none', 'important');
          p = p.parentElement;
        }

        // 强制视频全屏样式
        var s = video.style;
        s.setProperty('position', 'fixed', 'important');
        s.setProperty('top', '0', 'important');
        s.setProperty('left', '0', 'important');
        s.setProperty('width', '100vw', 'important');
        s.setProperty('height', '100vh', 'important');
        s.setProperty('z-index', '2147483647', 'important');
        s.setProperty('object-fit', 'contain', 'important');
        s.setProperty('background', '#000', 'important');
        
        document.body.style.setProperty('overflow', 'hidden', 'important');
      };

      // 前 10 秒每 300ms 检查一次（瞬时响应），之后每 1.5 秒检查一次（稳定）
      var count = 0;
      var timer = setInterval(function () {
        fix();
        if (++count > 30) {
          clearInterval(timer);
          setInterval(fix, 1500);
        }
      }, 300);
    },

    // 3. 站点业务逻辑（画质切换等）
    _handleSiteSpecifics: function (host) {
      var self = this;
      if (host === 'tv.cctv.com') {
        localStorage.setItem('cctv_live_resolution', 1080);
      } 
      else if (host === 'yangshipin.cn') {
        this._waitFor('.bei-player-control-quality-btn', function(btn) {
          btn.click();
          self._waitFor('.bei-list-inner span', function() {
            self._pickBest(document.querySelectorAll('.bei-list-inner span'));
          });
        });
      } 
      else if (host === 'm.1905.com') {
        this._waitFor('.vjs-menu-button', function(btn) {
          btn.click();
          self._waitFor('.vjs-menu-item', function() {
            self._pickBest(document.querySelectorAll('.vjs-menu-item'));
          });
        });
      }
    },

    _pickBest: function (elements) {
      var options = Array.prototype.map.call(elements, function(el) {
        var text = el.innerText.trim();
        var val = RESOLUTION_MAP[text] || parseInt(text.match(/\d+/) || 0);
        return { el: el, val: val };
      }).filter(function(i) { return i.val > 0; });

      if (options.length > 0) {
        options.sort(function(a, b) { return Math.abs(a.val - 1080) - Math.abs(b.val - 1080); });
        options[0].el.click();
        // 切换完关掉菜单
        setTimeout(function() { var v = document.querySelector('video'); if(v) v.click(); }, 500);
      }
    },

    _waitFor: function (sel, cb) {
      var t = setInterval(function() {
        var el = document.querySelector(sel);
        if (el) { clearInterval(t); cb(el); }
      }, 500);
      setTimeout(function() { clearInterval(t); }, 10000);
    },

    _attachBaseEvents: function () {
      var self = this;
      window.addEventListener('timeupdate', function(e) {
        if (e.target.tagName === 'VIDEO') {
          var v = e.target;
          var pos = Math.floor(v.currentTime * 1000);
          self._invoke('changePosition', pos, pos);
          // 顺便锁定音量和播放状态
          if (v.volume !== _volume) v.volume = _volume;
          if (!_isPaused && v.paused && v.readyState >= 2) v.play().catch(function(){});
        }
      }, true);
    },

    _invoke: function (m) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[m]) {
        window.WebviewVideoPlayerInterface[m].apply(window.WebviewVideoPlayerInterface, args);
      }
    }
  };

  // 注入全屏遮罩样式（立即执行）
  var style = document.createElement('style');
  style.textContent = 'body *:not(video) { visibility: hidden !important; pointer-events: none !important; } video { visibility: visible !important; pointer-events: auto !important; }';
  document.head.appendChild(style);

  // 启动
  if (document.readyState === 'complete') WebviewVideoPlayer.initialize();
  else window.addEventListener('load', function() { WebviewVideoPlayer.initialize(); });

})(typeof window !== 'undefined' ? window : this);
