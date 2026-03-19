(function (global) {
  'use strict';

  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _statusInterval = null;

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      init: function () {
        // 屏蔽 CCTV 网页自带的报错弹窗
        const errShield = document.createElement('style');
        errShield.textContent = '#error_msg_player, .vjs-error-display { display: none !important; }';
        document.head.appendChild(errShield);
        
        // CCTV 强制尝试点击起播
        const playBtn = document.querySelector('.vjs-play-control, #player_page_next');
        if (playBtn) playBtn.click();
      }
    },
    'yangshipin.cn': {
      init: function () {
        // 解决“有声无画”：通常是由于底层 div 遮挡或 canvas 渲染问题
        // 强制所有父级容器透明，只留 video 可见
        const style = document.createElement('style');
        style.textContent = `
          #player-container, .player-video, video { visibility: visible !important; opacity: 1 !important; display: block !important; }
          .player-mask, .player-poster { display: none !important; }
        `;
        document.head.appendChild(style);
      }
    },
    'live.ipanda.com': {
      init: function () {
        // iPanda 页面逻辑较老，强制触发它内部的播放函数
        if (window.player && window.player.play) window.player.play();
        _log('iPanda forced play triggered');
      }
    },
    'm.1905.com': {
      init: function () {
        // 1905 移动端全屏：它有大量的广告层和伪全屏按钮
        const style = document.createElement('style');
        style.textContent = `
          .m1905-player-poster, .vjs-poster, .advert-layer { display: none !important; }
          #player, .video-wrap { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; }
        `;
        document.head.appendChild(style);
      }
    },
    'web.guangdianyun.tv': {
      init: function () {
        // 解决“卡死”：通常是由于定时器冲突或弹幕层过载
        // 清理掉所有弹幕和浮动交互层
        const style = document.createElement('style');
        style.textContent = '.danmu-container, .interaction-area { display: none !important; }';
        document.head.appendChild(style);
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized || !HOST_CONFIGS[location.host]) return;
      _log('云影空蒙: 正在深度接管播放器...');

      try {
        const video = await this._waitForVideo();
        
        // 1. 基础环境清理
        this._sanitizeDOM();
        
        // 2. 站点特定优化
        if (HOST_CONFIGS[location.host].init) {
          HOST_CONFIGS[location.host].init(this);
        }

        // 3. 强制全屏（使用最高等级 z-index 和 !important）
        this._applySuperFullscreen(video);
        
        // 4. 事件绑定
        this._bindAppEvents(video);
        
        // 5. 守护进程 (每秒校准一次样式和状态)
        this._startGuardian(video);

        _isInitialized = true;
      } catch (e) {
        _log('初始化异常: ' + e.message, 'error');
      }
    },

    _sanitizeDOM: function () {
      // 暴力移除所有背景图和可能遮挡视频的 div
      const style = document.createElement('style');
      style.textContent = `
        * { -webkit-tap-highlight-color: transparent !important; }
        html, body { background: #000 !important; overflow: hidden !important; width: 100% !important; height: 100% !important; }
        video { background: #000 !important; z-index: 2147483647 !important; }
      `;
      document.head.appendChild(style);
    },

    _applySuperFullscreen: function (video) {
      const css = {
        'position': 'fixed',
        'top': '0',
        'left': '0',
        'width': '100vw',
        'height': '100vh',
        'z-index': '2147483647',
        'object-fit': 'contain',
        'background': '#000',
        'display': 'block'
      };
      for (let key in css) {
        video.style.setProperty(key, css[key], 'important');
      }
      
      // 向上遍历，确保所有祖先节点不限制溢出
      let p = video.parentElement;
      while (p && p !== document.body) {
        p.style.setProperty('position', 'static', 'important');
        p.style.setProperty('overflow', 'visible', 'important');
        p = p.parentElement;
      }
    },

    _startGuardian: function (video) {
      if (_statusInterval) clearInterval(_statusInterval);
      _statusInterval = setInterval(() => {
        // 1. 样式防篡改：防止网站脚本把 video 缩回去
        if (parseInt(video.style.width) < 90) {
          this._applySuperFullscreen(video);
        }

        // 2. 自动播放重试
        if (!_isPaused && video.paused) {
          video.play().catch(() => {});
        }

        // 3. 分辨率上报
        if (video.videoWidth !== _videoWidth) {
          _videoWidth = video.videoWidth;
          _videoHeight = video.videoHeight;
          this._toApp('changeResolution', _videoWidth, _videoHeight);
        }
      }, 1000);
    },

    _bindAppEvents: function (video) {
      video.addEventListener('play', () => { _isPaused = false; this._toApp('triggerPlaying'); });
      video.addEventListener('pause', () => { _isPaused = true; this._toApp('triggerPaused'); });
      video.addEventListener('waiting', () => this._toApp('triggerLoading'));
      video.addEventListener('error', () => {
        _log('视频加载失败，尝试重载渲染流');
        video.load(); // 尝试原地复活
        this._toApp('triggerError');
      });
      // 进度更新
      video.addEventListener('timeupdate', () => {
        const t = Math.floor(video.currentTime * 1000);
        this._toApp('changePosition', t, t);
      });
    },

    _waitForVideo: function () {
      return new Promise((resolve, reject) => {
        let count = 0;
        const check = () => {
          const v = document.querySelector('video');
          if (v) return resolve(v);
          if (++count > 40) reject(new Error("超时未找到视频源"));
          else setTimeout(check, 500);
        };
        check();
      });
    },

    _toApp: function (method, ...args) {
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method](...args);
      }
    }
  };

  function _log(m) {
    if (window.WebviewVideoPlayerInterface?.logV) window.WebviewVideoPlayerInterface.logV(m);
    console.log(m);
  }

  // 针对 Webview 的启动策略
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WebviewVideoPlayer.initialize());
  } else {
    WebviewVideoPlayer.initialize();
  }
  // 备用启动：防止某些单页应用加载过慢
  window.addEventListener('load', () => setTimeout(() => WebviewVideoPlayer.initialize(), 1500));

})(window);
