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
        var resolutionValues = {
          "1080": 1080,    // 蓝光
          "超清": 720,      // 原超清
          "高清": 540,
          "标清": 480,
          "流畅": 360
        };
        var resolution = new URLSearchParams(window.location.search).get('resolution');
        if (resolution) {
          // 写入本地缓存，CCTV播放器加载时会自动读取此分辨率
          var val = resolutionValues[resolution] || 'auto';
          localStorage.setItem('cctv_live_resolution', val);
          _log('CCTV 预设分辨率: ' + val);
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
          var parseDate = function(s) {
            return new Date(s.slice(0, 4), parseInt(s.slice(4, 6)) - 1, s.slice(6, 8), s.slice(8, 10), s.slice(10, 12), s.slice(12, 14));
          };
          // 返回毫秒数差值
          return Math.floor(parseDate(endAt).getTime() - parseDate(startAt).getTime());
        }
        return 0;
      },
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        var resolution = new URLSearchParams(window.location.search).get('resolution') || "1080";

        return self._waitForElement('.bei-list-inner, .bright-text')
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            // 模糊匹配：只要包含 1080 或传入的关键字即点击
            var resolutionItem = Array.prototype.find.call(spans, function (span) {
              var text = span.innerText || "";
              return text.indexOf(resolution) !== -1 || (resolution === "1080" && text.indexOf("1080") !== -1);
            });

            if (resolutionItem) {
              _log('找到央视频分辨率选项: ' + resolutionItem.innerText);
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
        var channelItem = Array.prototype.find.call(lis, function (li) {
          return li.innerText && li.innerText.indexOf(channel) !== -1;
        });
        if (channelItem) channelItem.click();
      }
    },

    'live.jstv.com': {
      init: function () {
        var self = this;
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        return self._waitForElement('#programMain')
          .then(function () {
            var slides = document.querySelectorAll('#programMain .swiper-slide');
            var channelItem = Array.prototype.find.call(slides, function (slide) {
              return slide.innerText && slide.innerText.indexOf(channel) !== -1;
            });
            if (channelItem) {
              var imgBox = channelItem.querySelector('.imgBox');
              if (imgBox) imgBox.click();
            }
          });
      }
    },

    'www.cditv.cn': {
      init: function () {
        var timer = setInterval(function () {
          var video = document.querySelector('video');
          if (video && video.parentElement) {
            video.parentElement.style.transform = 'none';
          }
        }, 1000);
        _eventListeners.push({ element: window, type: 'unload', listener: function() { clearInterval(timer); } });
      }
    }
  };

  var WebviewVideoPlayer = {
    // 核心初始化：移除 async，使用标准 Promise 链以兼容 Android 5.0+ 
    initialize: function () {
      if (_isInitialized) {
        _log('播放器已初始化，跳过', 'warn');
        return Promise.resolve();
      }

      var self = this;
      var config = HOST_CONFIGS[location.host];

      if (config && config.beforeInit) {
        try { config.beforeInit(); } catch (e) { _log('beforeInit 错误: ' + e.message, 'error'); }
      }

      return this._waitForVideoElement()
        .then(function () {
          if (config && config.init) {
            return config.init.call(self);
          }
        })
        .then(function () {
          // 再次确认视频元素（部分站点 init 后会销毁重建 video）
          return self._waitForVideoElement();
        })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
          _log('WebviewVideoPlayer 初始化成功');
        })
        .catch(function (error) {
          _log('初始化失败: ' + error.message, 'error');
          self._showErrorUI(error.message);
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
      if (!video) return Promise.reject(new Error('未找到视频元素'));
      if (video.videoWidth > 0) return Promise.resolve();

      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          video.removeEventListener('loadedmetadata', onLoaded);
          reject(new Error('加载视频元数据超时'));
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
      var element = document.querySelector(selector);
      if (element) return Promise.resolve(element);

      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          observer.disconnect();
          reject(new Error('等待元素超时: ' + selector));
        }, timeout);
        var observer = new MutationObserver(function () {
          var el = document.querySelector(selector);
          if (el) {
            clearTimeout(timer);
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _prepareDOMEnvironment: function () {
      var meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      if (!meta.parentNode) document.head.appendChild(meta);

      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.backgroundColor = 'black';

      // 优化：不直接 remove 所有 CSS，而是注入覆盖样式，隐藏 UI 干扰
      var styleId = 'webview-player-mask';
      if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = 'body *:not(video):not(canvas):not([id="webview-video-error"]) { visibility: hidden !important; pointer-events: none !important; } ' +
                            'video { visibility: visible !important; pointer-events: auto !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; background: black !important; }';
        document.head.appendChild(style);
      }
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video) return;
      video.style.objectFit = 'contain'; // 1080P 下通常建议使用 contain 保持原始比例
    },

    _attachEventListeners: function () {
      var self = this;
      var video = this._getVideoElement();
      if (!video) return;

      var events = {
        play: function () { _isPaused = false; self._invokeNative('triggerPlaying'); },
        pause: function () { _isPaused = true; self._invokeNative('triggerPaused'); },
        waiting: function () { self._invokeNative('triggerLoading'); },
        error: function () { self._invokeNative('triggerError'); },
        timeupdate: function () {
          var pos = Math.floor(video.currentTime * 1000);
          var config = HOST_CONFIGS[location.host];
          var dur = (config && config.getDuration) ? config.getDuration() : Math.floor(video.duration * 1000);
          self._invokeNative('changePosition', pos, dur || pos);
        }
      };

      Object.keys(events).forEach(function (e) {
        video.addEventListener(e, events[e]);
        _eventListeners.push({ element: video, type: e, listener: events[e] });
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;
        
        // 自动播放与音量锁定
        if (v.volume !== _volume) v.volume = _volume;
        if (!_isPaused && v.paused && v.readyState >= 2) {
          v.play().catch(function(){});
        }
        
        // 分辨率变更通知 Native
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) {
          _videoWidth = v.videoWidth;
          _videoHeight = v.videoHeight;
          self._invokeNative('changeResolution', _videoWidth, _videoHeight);
        }
      }, 1500);
    },

    _invokeNative: function (method) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface[method]) {
        window.WebviewVideoPlayerInterface[method].apply(window.WebviewVideoPlayerInterface, args);
      }
    },

    _showErrorUI: function (msg) {
      var div = document.getElementById('webview-video-error') || document.createElement('div');
      div.id = 'webview-video-error';
      div.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:black;color:white;display:flex;align-items:center;justify-content:center;z-index:9999999;font-size:16px;';
      div.textContent = '播放失败: ' + msg;
      if (!div.parentNode) document.body.appendChild(div);
    }
  };

  function _log(m, lv) {
    var msg = '[VideoPlayer] ' + m;
    if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.logV) {
      window.WebviewVideoPlayerInterface.logV(msg);
    }
    console[lv || 'info'](msg);
  }

  // 挂载到全局
  global.WebviewVideoPlayer = WebviewVideoPlayer;

  // 启动逻辑：确保 DOM 加载后 800ms 执行以跳过初始广告或加载页
  var start = function() { 
    setTimeout(function(){ WebviewVideoPlayer.initialize(); }, 800); 
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);

})(typeof window !== 'undefined' ? window : this);
