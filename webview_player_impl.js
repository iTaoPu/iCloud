(function (global) {
  'use strict';

  // --- 全局状态 ---
  var _isInitialized = false;
  var _volume = 1.0;
  var _isPaused = false;
  var _videoWidth = 0;
  var _videoHeight = 0;
  var _eventListeners = [];
  var _mutationObserver = null;
  var _statusInterval = null;
  var _currentVideoElement = null; // 记录当前锁定的视频元素引用

  // --- 配置：分辨率映射表 (支持模糊匹配 key) ---
  var RESOLUTION_MAP = {
    "流畅": 360, "标清": 480, "高清": 540, "超清": 720,
    "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080, "FHD": 1080,
    "2K": 1440, "1440": 1440, "QHD": 1440,
    "4K": 2160, "2160": 2160, "UHD": 2160,
    "8K": 4320, "4320": 4320
  };

  // --- 配置：特定站点逻辑 ---
  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        var resParam = new URLSearchParams(window.location.search).get('resolution');
        if (resParam) {
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
        if (s && e && s.length === 14 && e.length === 14) {
          var parseTime = function(t) {
            return new Date(t.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1/$2/$3 $4:$5:$6"));
          };
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
            var items = document.querySelectorAll('.bei-list-inner span, .quality-list li, .definition-btn, [class*="quality"], [class*="definition"]');
            var target = Array.from(items).find(function (el) {
              var txt = (el.innerText || "").trim();
              // 增强正则匹配
              if (/4K|2160|超高/.test(txt) && /4K|2160|超高/.test(res)) return true;
              if (/1080|超清|蓝光|FHD/.test(txt) && /1080|超清|蓝光|FHD/.test(res)) return true;
              if (/2K|1440|QHD/.test(txt) && /2K|1440|QHD/.test(res)) return true;
              return txt.includes(res);
            });
            if (target) {
              _log('Clicking resolution: ' + target.innerText);
              target.click();
            } else {
              _log('Resolution button not found for: ' + res, 'warn');
            }
            return self._waitForVideoMetadata();
          });
      }
    },
    // 针对某些顽固网站，强制清理 transform
    'www.cditv.cn': {
      init: function () {
        setInterval(function () {
          var video = document.querySelector('video');
          if (video) {
            video.style.transform = 'none';
            if(video.parentElement) {
                video.parentElement.style.transform = 'none';
                video.parentElement.style.overflow = 'visible';
            }
          }
        }, 500);
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) {
        _log('Already initialized', 'warn');
        return Promise.resolve();
      }
      _log('Initialising WebviewVideoPlayer (Fusion Edition)...');

      var config = HOST_CONFIGS[location.host] || {};
      if (config.beforeInit) {
        try { config.beforeInit(); } catch(e) { _log('beforeInit error: ' + e.message, 'error'); }
      }

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          if (config.init) return config.init.call(self);
        })
        .then(function () {
          // 重新获取可能变化的 video 元素
          var v = self._getVideoElement();
          if(!v) throw new Error("Video element lost after init");
          
          self._prepareDOMEnvironment();
          self._applyFullscreenStyles(v); // 首次应用全屏
          self._attachEventListeners(v);
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('Initialization Complete');
        })
        .catch(function (e) {
          _log('Init Error: ' + e.message, 'error');
          self._showErrorUI(e.message);
        });
    },

    // 【核心融合点 1】穿透 Iframe + 常规查找
    _getVideoElement: function () {
      // 1. 优先查找文档直连 video
      var v = document.querySelector('video');
      if (v) {
        _currentVideoElement = v;
        return v;
      }

      // 2. 递归寻找同源 iframe 内的 video (解决地方台/嵌套播放器问题)
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          // 检查 contentDocument 是否存在且可访问
          var idoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
          if (idoc) {
            var iv = idoc.querySelector('video');
            if (iv) {
              _currentVideoElement = iv;
              return iv;
            }
          }
        } catch (e) { 
          // Cross-origin blocked, ignore
        }
      }
      
      // 如果之前有记录但现在找不到了，返回 null 触发重建逻辑
      return null;
    },

    _prepareDOMEnvironment: function () {
      // 优化 Viewport
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        document.head.appendChild(meta);
      }
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

      // 强制背景黑场
      document.documentElement.style.background = '#000';
      document.body.style.setProperty('background', '#000', 'important');
      document.body.style.setProperty('margin', '0', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
    },

    // 【核心融合点 2】手术式修复 + 暴力兜底
    _applyFullscreenStyles: function (video) {
      if (!video) return;

      // --- 阶段 1: 手术式原地修复 (保留 DOM 结构) ---
      var p = video.parentElement;
      var depth = 0;
      var maxDepth = 15; // 防止死循环
      
      while (p && p !== document.body && p !== document.documentElement && depth < maxDepth) {
        try {
          var cs = window.getComputedStyle(p);
          var needsFix = false;
          
          // 检测干扰属性
          if (cs.transform !== 'none') needsFix = true;
          if (cs.filter !== 'none') needsFix = true;
          if (cs.perspective !== 'none') needsFix = true;
          if (['hidden', 'auto', 'scroll'].indexOf(cs.overflow) > -1) needsFix = true;
          if (cs.clip && cs.clip !== 'auto') needsFix = true;
          if (cs.clipPath && cs.clipPath !== 'none') needsFix = true;

          if (needsFix) {
            _log('Fixing parent container styles: ' + (p.id || p.className), 'warn');
            p.style.setProperty('transform', 'none', 'important');
            p.style.setProperty('webkitTransform', 'none', 'important');
            p.style.setProperty('filter', 'none', 'important');
            p.style.setProperty('perspective', 'none', 'important');
            p.style.setProperty('overflow', 'visible', 'important');
            p.style.setProperty('clip', 'auto', 'important');
            p.style.setProperty('clip-path', 'none', 'important');
          }
        } catch (e) {
          // 忽略无法访问的节点
        }
        p = p.parentElement;
        depth++;
      }

      // --- 阶段 2: 锁定 Video 自身样式 ---
      var s = video.style;
      s.setProperty('position', 'fixed', 'important');
      s.setProperty('top', '0', 'important');
      s.setProperty('left', '0', 'important');
      s.setProperty('right', '0', 'important');
      s.setProperty('bottom', '0', 'important');
      s.setProperty('width', '100vw', 'important');
      s.setProperty('height', '100vh', 'important');
      s.setProperty('max-width', 'none', 'important');
      s.setProperty('max-height', 'none', 'important');
      s.setProperty('z-index', '2147483647', 'important');
      s.setProperty('object-fit', 'contain', 'important'); // 保持比例，如需拉伸改 cover
      s.setProperty('background', '#000', 'important');
      s.setProperty('margin', '0', 'important');
      s.setProperty('padding', '0', 'important');
      s.setProperty('border', 'none', 'important');
      s.setProperty('transform', 'none', 'important');

      // --- 阶段 3: 暴力兜底 (如果原地修复后尺寸仍不对) ---
      // 检测条件：视频可视区域小于屏幕的 90%
      // 注意：offsetWidth 在 display:none 时为 0，需确保视频已渲染
      if (video.offsetWidth > 0 && (video.offsetWidth < window.innerWidth * 0.9 || video.offsetHeight < window.innerHeight * 0.9)) {
        _log('Standard fix failed (Size: ' + video.offsetWidth + 'x' + video.offsetHeight + '), forcing DOM move...', 'warn');
        
        var wasPaused = video.paused;
        var curTime = video.currentTime;
        var src = video.currentSrc || video.src;

        // 移动到 body
        document.body.appendChild(video);
        
        // 恢复状态 (部分浏览器移动节点会暂停或重置时间)
        if (!wasPaused) {
            var playPromise = video.play();
            if (playPromise) playPromise.catch(function(){});
        }
        // 尝试恢复时间点 (如果漂移超过 1 秒)
        if (curTime > 0 && Math.abs(video.currentTime - curTime) > 1) {
            video.currentTime = curTime;
        }

        // 再次强制样式 (确保移动后生效)
        s.setProperty('position', 'fixed', 'important');
        s.setProperty('width', '100vw', 'important');
        s.setProperty('height', '100vh', 'important');
        s.setProperty('z-index', '2147483647', 'important');
        
        _log('Video moved to body successfully.');
      }
      
      // 尝试原生全屏 API 作为辅助
      if (video.requestFullscreen && document.fullscreenElement !== video) {
        video.requestFullscreen().catch(function(){});
      }
    },

    _startStatusMonitoring: function () {
      var self = this;
      
      // 监听 DOM 变化，防止视频被替换或移回
      _mutationObserver = new MutationObserver(function () {
        var v = self._getVideoElement();
        if (!v) return;
        
        // 如果视频元素引用变了，或者父节点不再是 body (如果是暴力模式)
        if (v !== _currentVideoElement) {
          _log('Video element replaced, re-attaching listeners and styles', 'warn');
          _currentVideoElement = v;
          self._attachEventListeners(v);
          self._applyFullscreenStyles(v);
        }
      });
      _mutationObserver.observe(document.body, { childList: true, subtree: true });

      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 1. 持续校验全屏状态
        // 检查样式属性 OR 实际渲染尺寸
        var isFixed = (v.style.position === 'fixed');
        var isSmall = (v.offsetWidth > 0 && (v.offsetWidth < window.innerWidth * 0.9 || v.offsetHeight < window.innerHeight * 0.9));
        
        if (!isFixed || isSmall) {
          // _log('Fullscreen compromised, repairing...');
          self._applyFullscreenStyles(v);
        }

        // 2. 音量同步
        if (Math.abs(v.volume - _volume) > 0.01) {
          v.volume = _volume;
        }

        // 3. 自动播放补偿 (防暂停)
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){});
        }

        // 4. 分辨率变更通知
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth;
          _videoHeight = v.videoHeight;
          if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.changeResolution) {
            window.WebviewVideoPlayerInterface.changeResolution(_videoWidth, _videoHeight);
          }
          _log('Resolution: ' + _videoWidth + 'x' + _videoHeight);
        }
      }, 1200); // 1.2 秒检查一次
    },

    _waitForVideoElement: function (timeout) {
      timeout = timeout || 30000;
      var self = this;
      return new Promise(function (resolve, reject) {
        var v = self._getVideoElement();
        if (v) return resolve(v);
        
        var timer = setTimeout(function () { 
          obs.disconnect(); 
          reject(new Error('Video Search Timeout (' + timeout + 'ms)')); 
        }, timeout);
        
        var obs = new MutationObserver(function () {
          var v2 = self._getVideoElement();
          if (v2) { 
            clearTimeout(timer); 
            obs.disconnect(); 
            resolve(v2); 
          }
        });
        
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function () {
      var v = this._getVideoElement();
      if (!v) return Promise.reject(new Error('No video found for metadata'));
      
      return new Promise(function(resolve) {
        if (v.videoWidth > 0) return resolve();
        
        var handler = function() {
          v.removeEventListener('loadedmetadata', handler);
          resolve();
        };
        v.addEventListener('loadedmetadata', handler);
        
        // 超时兜底
        setTimeout(function() {
          v.removeEventListener('loadedmetadata', handler);
          resolve(); // 即使没元数据也继续，避免卡死
        }, 5000);
      });
    },

    _waitForElement: function (sel, timeout) {
      return new Promise(function(resolve) {
        var el = document.querySelector(sel);
        if (el) return resolve(el);
        
        var timer = setTimeout(function() { resolve(null); }, timeout || 5000);
        var obs = new MutationObserver(function() {
          var e = document.querySelector(sel);
          if (e) {
            clearTimeout(timer);
            obs.disconnect();
            resolve(e);
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });
    },

    _attachEventListeners: function (video) {
      if (!video) return;
      
      // 清理旧监听 (简单处理，实际场景中如果 video 被替换，旧监听会自动失效)
      // 这里主要添加新监听
      
      var self = this;
      var events = ['play', 'pause', 'waiting', 'error', 'timeupdate', 'loadedmetadata'];
      
      events.forEach(function(e) {
        var handler = function(evt) {
          if (!window.WebviewVideoPlayerInterface) return;
          
          if (e === 'play') { 
            _isPaused = false; 
            window.WebviewVideoPlayerInterface.triggerPlaying?.(); 
          }
          if (e === 'pause') { 
            _isPaused = true; 
            window.WebviewVideoPlayerInterface.triggerPaused?.(); 
          }
          if (e === 'waiting') {
            window.WebviewVideoPlayerInterface.triggerLoading?.();
          }
          if (e === 'error') {
            _log('Video Error: ' + (evt.target.error?.message || 'Unknown'), 'error');
            window.WebviewVideoPlayerInterface.triggerError?.();
          }
          if (e === 'timeupdate') {
            var pos = Math.floor(video.currentTime * 1000);
            var hostDur = HOST_CONFIGS[location.host]?.getDuration?.();
            var dur = hostDur || (video.duration ? Math.floor(video.duration * 1000) : pos);
            if (dur < pos) dur = pos; // 直播流常见情况
            window.WebviewVideoPlayerInterface.changePosition?.(pos, dur);
          }
          if (e === 'loadedmetadata') {
             // 元数据加载后再次确保全屏
             self._applyFullscreenStyles(video);
          }
        };
        
        video.addEventListener(e, handler);
        _eventListeners.push({element: video, type: e, listener: handler});
      });
      _log('Event listeners attached');
    },

    _showErrorUI: function (msg) {
      if (document.getElementById('webview-video-error')) return;
      var d = document.createElement('div');
      d.id = 'webview-video-error';
      d.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;color:#ccc;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:20px;box-sizing:border-box;';
      d.innerHTML = `<h2 style="color:#fff;margin-bottom:10px;">播放初始化失败</h2><p style="opacity:0.7;font-size:14px;max-width:80%;">${msg}</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#333;color:#fff;border:1px solid #666;cursor:pointer;">刷新页面</button>`;
      document.body.appendChild(d);
    }
  };

  function _log(m, l) {
    l = l || 'info';
    if (window.WebviewVideoPlayerInterface?.logV) {
      window.WebviewVideoPlayerInterface.logV('[VideoPlayer] ' + m);
    }
    if (console && console[l]) {
      console[l](m);
    }
  }

  // 启动逻辑
  var start = function() {
    // 稍微延时，等待页面其他脚本执行
    setTimeout(function() { 
      WebviewVideoPlayer.initialize(); 
    }, 600);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

})(typeof window !== 'undefined' ? window : this);
