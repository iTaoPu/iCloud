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

  var HOST_CONFIGS = {
    'tv.cctv.com': {
      beforeInit: function () {
        // 扩展分辨率映射，增加 1080P 和 4K 支持
        var resolutionValues = {
          "4K": "4k",
          "1080": "1080",
          "超清": 720,
          "高清": 540,
          "标清": 480,
          "流畅": 360
        };

        var params = new URLSearchParams(window.location.search);
        var resParam = params.get('resolution');
        if (resParam) {
          var targetRes = resolutionValues[resParam] || 'auto';
          localStorage.setItem('cctv_live_resolution', targetRes);
          _log('已设置CCTV分辨率缓存: ' + targetRes);
        }
      },

      init: function () {
        var errorMsgEl = document.getElementById('error_msg_player');
        if (errorMsgEl && errorMsgEl.offsetHeight > 0) {
          throw new Error(errorMsgEl.textContent);
        }
      },

      getDuration: function () {
        var params = new URLSearchParams(window.location.search);
        var startAt = params.get('stime');
        var endAt = params.get('etime');
        if (startAt && endAt && startAt.length === 14 && endAt.length === 14) {
          var parse = function(s) {
            return new Date(s.slice(0, 4), parseInt(s.slice(4, 6)) - 1, s.slice(6, 8), s.slice(8, 10), s.slice(10, 12), s.slice(12, 14));
          };
          // 返回毫秒级时长
          return Math.floor(parse(endAt).getTime() - parse(startAt).getTime());
        }
        return 0;
      },
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        var params = new URLSearchParams(window.location.search);
        // 默认尝试 1080P
        var resolution = params.get('resolution') || "1080";

        return self._waitForElement('.bei-list-inner, .bright-text')
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            // 模糊匹配包含 resolution 字符的选项（如 "蓝光1080P", "1080P"）
            var resolutionItem = Array.prototype.find.call(spans, function (span) {
              var text = span.innerText || "";
              return text.indexOf(resolution) !== -1;
            });

            if (resolutionItem) {
              _log('找到分辨率选项: ' + resolutionItem.innerText);
              resolutionItem.click();
              return self._waitForVideoMetadata();
            }
          })
          .then(function () {
            var errorMsgEl = document.querySelector('.bright-text');
            if (errorMsgEl && errorMsgEl.innerText.trim() !== "") {
              throw new Error(errorMsgEl.textContent);
            }
          });
      },
    },

    'live.snrtv.com': {
      init: function () {
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        var lis = document.querySelectorAll('.btnStream > li');
        var item = Array.prototype.find.call(lis, function (li) {
          return li.innerText && li.innerText.indexOf(channel) !== -1;
        });
        if (item) item.click();
      }
    },

    'live.jstv.com': {
      init: function () {
        var self = this;
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        return self._waitForElement('#programMain')
          .then(function () {
            var slides = document.querySelectorAll('#programMain .swiper-slide');
            var item = Array.prototype.find.call(slides, function (s) {
              return s.innerText && s.innerText.indexOf(channel) !== -1;
            });
            if (item) {
              var btn = item.querySelector('.imgBox');
              if (btn) btn.click();
            }
          });
      }
    },

    'www.cditv.cn': {
      init: function () {
        // 持续修正成都台的容器偏移
        var fixTimer = setInterval(function () {
          var video = document.querySelector('video');
          if (video && video.parentElement) {
            video.parentElement.style.transform = 'none';
          }
        }, 1000);
        _eventListeners.push({ element: window, type: 'unload', listener: function() { clearInterval(fixTimer); } });
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: function () {
      if (_isInitialized) return Promise.resolve();

      var self = this;
      var config = HOST_CONFIGS[location.host];

      if (config && config.beforeInit) {
        try { config.beforeInit(); } catch (e) { _log('Pre-init error: ' + e.message, 'error'); }
      }

      return this._waitForVideoElement()
        .then(function () {
          if (config && config.init) {
            return config.init.call(self);
          }
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
          _log('播放器脚本初始化成功');
        })
        .catch(function (err) {
          _log('初始化失败: ' + err.message, 'error');
          self._showErrorUI(err.message);
        });
    },

    _getVideoElement: function () {
      return document.querySelector('video');
    },

    _waitForVideoElement: function (timeout) {
      var self = this;
      timeout = timeout || 30000;
      var video = self._getVideoElement();
      if (video) return Promise.resolve(video);

      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          observer.disconnect();
          reject(new Error('等待视频元素超时'));
        }, timeout);

        var observer = new MutationObserver(function () {
          var v = self._getVideoElement();
          if (v) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(v);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function (timeout) {
      var self = this;
      timeout = timeout || 20000;
      var video = self._getVideoElement();
      if (!video) return Promise.reject(new Error('未找到video'));
      if (video.videoWidth > 0) return Promise.resolve();

      return new Promise(function (resolve) {
        var timer = setTimeout(function () {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve(); // 超时后也尝试继续，避免死等
        }, timeout);
        function onLoaded() {
          clearTimeout(timer);
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        }
        video.addEventListener('loadedmetadata', onLoaded);
      });
    },

    _waitForElement: function (selector, timeout) {
      timeout = timeout || 20000;
      var el = document.querySelector(selector);
      if (el) return Promise.resolve(el);

      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          observer.disconnect();
          reject(new Error('等待元素超时: ' + selector));
        }, timeout);
        var observer = new MutationObserver(function () {
          var target = document.querySelector(selector);
          if (target) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(target);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _prepareDOMEnvironment: function () {
      // 优化：不删除所有样式，改用 CSS 覆盖保证视频最顶层显示
      var style = document.createElement('style');
      style.textContent = `
        body, html { overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: #000 !important; }
        video { z-index: 999999 !important; visibility: visible !important; display: block !important; }
        /* 隐藏可能遮挡视频的其他浮层（慎重使用，可根据需要调整） */
        #error_msg_player, .bright-text { visibility: visible !important; } 
      `;
      document.head.appendChild(style);

      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var s = video.style;
      s.position = 'fixed';
      s.top = '0'; s.left = '0';
      s.width = '100vw'; s.height = '100vh';
      s.objectFit = 'contain'; // 1080P下保持比例，防止拉伸
      s.zIndex = '999999';
      s.backgroundColor = '#000';
    },

    _attachEventListeners: function () {
      var self = this;
      var video = this._getVideoElement();
      if (!video) return;

      var handlers = {
        play: function () { _isPaused = false; self._toNative('triggerPlaying'); },
        pause: function () { _isPaused = true; self._toNative('triggerPaused'); },
        waiting: function () { self._toNative('triggerLoading'); },
        error: function () { self._toNative('triggerError'); },
        timeupdate: function () {
          var pos = Math.floor(video.currentTime * 1000);
          var config = HOST_CONFIGS[location.host];
          var dur = (config && config.getDuration) ? config.getDuration() : Math.floor(video.duration * 1000);
          self._toNative('changePosition', pos, Math.max(pos, dur || 0));
        }
      };

      Object.keys(handlers).forEach(function (e) {
        video.addEventListener(e, handlers[e]);
        _eventListeners.push({ element: video, type: e, listener: handlers[e] });
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;

        // 强制音量同步
        if (v.volume !== _volume) v.volume = _volume;

        // 自动播放维护
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){});
        }

        // 强制全屏状态
        if (v.style.position !== 'fixed') self._enterFullscreen();

        // 实时分辨率反馈
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth;
          _videoHeight = v.videoHeight;
          self._toNative('changeResolution', _videoWidth, _videoHeight);
        }
      }, 1500);
    },

    _toNative: function (method) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method].apply(window.WebviewVideoPlayerInterface, args);
      }
    },

    _showErrorUI: function (msg) {
      var div = document.createElement('div');
      div.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999999;font-size:14px;padding:20px;';
      div.textContent = '播放失败: ' + msg;
      document.body.appendChild(div);
    }
  };

  function _log(m, lv) {
    var out = '[Player] ' + m;
    if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.logV) {
      window.WebviewVideoPlayerInterface.logV(out);
    }
    console[lv || 'info'](out);
  }

  global.WebviewVideoPlayer = WebviewVideoPlayer;

  var run = function() { setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 600); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

})(typeof window !== 'undefined' ? window : this);
