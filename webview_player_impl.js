(function (global) {
  'use strict';

  var _currentVideo = null;
  var _isPaused = false;
  var _statusInterval = null;

  var WebviewVideoPlayer = {
    initialize: function () {
      var self = this;
      // 150ms 延迟避开内核初始化峰值，减少卡顿
      setTimeout(function() {
        self._waitForVideoElement().then(function (video) {
          _currentVideo = video;
          self._applyUniversalFullfix(video);
          self._attachEventListeners(video);
          self._startAudioMonitor();
        });
      }, 150);
    },

    _applyUniversalFullfix: function (video) {
      if (!video || video.getAttribute('data-v-fixed') === 'true') return;
      
      // 仅在初始化时执行一次强力全屏，之后不再操作 DOM
      var p = video.parentElement;
      while (p && p !== document.body) {
        p.style.setProperty('transform', 'none', 'important');
        p.style.setProperty('overflow', 'visible', 'important');
        p.style.setProperty('display', 'block', 'important');
        p = p.parentElement;
      }
      var styles = {
        'position': 'fixed', 'top': '0', 'left': '0', 'width': '100vw', 'height': '100vh',
        'z-index': '2147483647', 'background': '#000', 'object-fit': 'contain'
      };
      for (var key in styles) { video.style.setProperty(key, styles[key], 'important'); }
      video.setAttribute('data-v-fixed', 'true');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    _attachEventListeners: function (video) {
      video.onplay = function () { _isPaused = false; };
      video.onpause = function () { _isPaused = true; };
    },

    _startAudioMonitor: function () {
      var self = this;
      if (_statusInterval) clearInterval(_statusInterval);
      
      // 每 2 秒检查一次，这是平衡“响应速度”与“设备负担”的黄金频率
      _statusInterval = setInterval(function () {
        var v = document.querySelector('video');
        if (!v) return;

        // --- 核心修复：解决新增源导致的无声 ---
        // 逻辑：如果视频没手动暂停，但被系统静音了，立刻恢复声音
        if (!_isPaused && v.muted) {
          v.muted = false; 
          // 补偿逻辑：如果恢复声音后发现视频处于暂停状态（内核干扰），尝试唤醒
          if (v.paused && v.readyState >= 2) v.play().catch(function(){});
        }

        // 如果换源了（Video 标签重建），重新执行一次全屏
        if (v !== _currentVideo) {
          _currentVideo = v;
          self._applyUniversalFullfix(v);
        }
      }, 2000); 
    },

    _waitForVideoElement: function () {
      var self = this;
      return new Promise(function (resolve) {
        var t = setInterval(function() {
          var v = document.querySelector('video');
          if (v) { clearInterval(t); resolve(v); }
        }, 200);
      });
    }
  };

  if (document.readyState === 'complete') WebviewVideoPlayer.initialize();
  else window.addEventListener('load', function() { WebviewVideoPlayer.initialize(); });

})(window);
