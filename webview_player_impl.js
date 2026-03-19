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
          "流畅": 360, "标清": 480, "高清": 540, "超清": 720, "1080P": 1080, "1080": 1080, "超高清": 1080, "蓝光": 1080, "2K": 1440, "1440": 1440, "4K": 2160, "2160": 2160, "8K": 4320
        };
        var resolution = new URLSearchParams(window.location.search).get('resolution');
        localStorage.setItem('cctv_live_resolution', resolutionValues[resolution] || 'auto');
      },
      init: function () {
        var errorMsgEl = document.getElementById('error_msg_player');
        if (errorMsgEl) { throw new Error(errorMsgEl.textContent); }
      },
      getDuration: function () {
        var params = new URLSearchParams(window.location.search);
        var startAt = params.get('stime');
        var endAt = params.get('etime');
        if (startAt && endAt && startAt.length === 14 && endAt.length === 14) {
          var startDate = new Date(parseInt(startAt.slice(0, 4)), parseInt(startAt.slice(4, 6)) - 1, parseInt(startAt.slice(6, 8)), parseInt(startAt.slice(8, 10)), parseInt(startAt.slice(10, 12)), parseInt(startAt.slice(12, 14)));
          var endDate = new Date(parseInt(endAt.slice(0, 4)), parseInt(endAt.slice(4, 6)) - 1, parseInt(endAt.slice(6, 8)), parseInt(endAt.slice(8, 10)), parseInt(endAt.slice(10, 12)), parseInt(endAt.slice(12, 14)));
          return Math.floor((endDate - startDate) / 1000 * 1000);
        }
        return 0;
      },
    },

    'yangshipin.cn': {
      init: function () {
        var self = this;
        var resolution = new URLSearchParams(window.location.search).get('resolution');
        return self._waitForElement('.bei-list-inner, .bright-text')
          .then(function () {
            var spans = document.querySelectorAll('.bei-list-inner span');
            var resolutionItem = Array.from(spans).find(function (span) {
              return span.innerText && span.innerText.includes(resolution);
            });
            if (resolutionItem) {
              resolutionItem.click();
              return self._waitForVideoMetadata();
            }
          })
          .then(function () {
            var errorMsgEl = document.querySelector('.bright-text');
            if (errorMsgEl) { throw new Error(errorMsgEl.textContent); }
          });
      },
    },

    'live.snrtv.com': {
      init: function () {
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        var lis = document.querySelectorAll('.btnStream > li');
        var channelItem = Array.from(lis).find(function (li) { return li.innerText && li.innerText.includes(channel); });
        if (channelItem) { channelItem.click(); }
      }
    },

    'live.jstv.com': {
      init: function () {
        var self = this;
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        return self._waitForElement('#programMain')
          .then(function () {
            var slides = document.querySelector('#programMain').querySelectorAll('.swiper-slide');
            var channelItem = Array.from(slides).find(function (slide) { return slide.innerText && slide.innerText.includes(channel); });
            if (channelItem) {
              var imgBox = channelItem.querySelector('.imgBox');
              if (imgBox) imgBox.click();
            }
          });
      }
    },

    'www.nbs.cn': {
      init: function () {
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        var items = document.querySelectorAll('.tv_list > .tv_c');
        var channelItem = Array.from(items).find(function (item) { return item.innerText && item.innerText.includes(channel); });
        if (channelItem) { channelItem.click(); }
      }
    },

    'www.brtn.cn': {
      init: function () {
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        var lis = document.querySelectorAll('.right_list li');
        var channelItem = Array.from(lis).find(function (li) { return li.innerText && li.innerText.includes(channel); });
        if (channelItem) { channelItem.click(); }
      }
    },

    'www.btime.com': {
      init: function () {
        var channel = (new URLSearchParams(window.location.search)).get('channel');
        var lis = document.querySelectorAll('.right_list li');
        var channelItem = Array.from(lis).find(function (li) { return li.innerText && li.innerText.includes(channel); });
        if (channelItem) { channelItem.click(); }
      }
    },

    'web.guangdianyun.tv': {
      init: function () { return this._waitForVideoMetadata(); }
    },

    'www.cditv.cn': {
      init: function () {
        setInterval(function () {
          var video = document.querySelector('video');
          if (video) { video.parentElement.style.transform = 'none'; }
        }, 1000);
      }
    },

    'www.btzx.com.cn': {
      init: function () {
        var self = this;
        // 1. 注入针对该站点的全局样式覆盖
        var styleId = 'btzx-final-fix';
        if (!document.getElementById(styleId)) {
          var style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            /* 强制视频元素充满视口 */
            video.btzx-fix-target {
              position: fixed !important;
              top: 0 !important; left: 0 !important;
              width: 100vw !important; height: 100vh !important;
              z-index: 2147483647 !important;
              background: #000 !important;
              object-fit: contain !important;
              visibility: visible !important;
              display: block !important;
            }
            /* 禁止页面滚动 */
            .btzx-locked { overflow: hidden !important; width: 100% !important; height: 100% !important; }
          `;
          document.head.appendChild(style);
        }

        var applyBtzxFix = function() {
          var video = self._getVideoElement();
          if (!video) return;

          // 保持 DOM 结构不变，仅添加类名
          video.classList.add('btzx-fix-target');
          document.documentElement.classList.add('btzx-locked');
          document.body.classList.add('btzx-locked');

          // 核心修复：递归解除所有父容器的层叠上下文和溢出隐藏
          var parent = video.parentElement;
          while (parent && parent !== document.body) {
            // 必须移除这些属性，position: fixed 才能相对于视口生效
            parent.style.setProperty('transform', 'none', 'important');
            parent.style.setProperty('filter', 'none', 'important');
            parent.style.setProperty('perspective', 'none', 'important');
            parent.style.setProperty('contain', 'none', 'important');
            parent.style.setProperty('clip-path', 'none', 'important');
            parent.style.setProperty('mask', 'none', 'important');
            
            // 确保容器不限制视频显示
            parent.style.setProperty('overflow', 'visible', 'important');
            parent.style.setProperty('opacity', '1', 'important');
            parent.style.setProperty('visibility', 'visible', 'important');
            parent.style.setProperty('display', 'block', 'important');
            
            // 如果父容器有 relative/absolute，会限制 z-index，将其设为 static 释放
            if (getComputedStyle(parent).position !== 'static') {
              parent.style.setProperty('position', 'static', 'important');
            }
            parent = parent.parentElement;
          }
        };

        // 立即执行并高频监控（应对该站点频繁的内部 UI 刷新）
        applyBtzxFix();
        setInterval(applyBtzxFix, 1000);
      }
    },

    'web.ningxiahuangheyun.com': {
      init: function () {
        var self = this;
        return self._waitForVideoElement().then(function (video) {
          video.muted = false;
          video.play().catch(function (err) { _log('取消静音后自动播放失败: ' + err.message, 'warn'); });
          document.addEventListener('click', function onClick() {
            if (video.paused) { video.muted = false; video.play().catch(function (e) {}); }
            document.removeEventListener('click', onClick);
          }, { once: true });
        });
      }
    }
  };

  var WebviewVideoPlayer = {
    initialize: async function () {
      if (_isInitialized) return Promise.resolve();
      var beforeInit = HOST_CONFIGS[location.host] && HOST_CONFIGS[location.host].beforeInit;
      if (beforeInit) { try { beforeInit(); } catch (e) { _log('Pre-initialization failed: ' + e.message, 'error'); } }

      var self = this;
      return this._waitForVideoElement()
        .then(function () {
          var init = HOST_CONFIGS[location.host] && HOST_CONFIGS[location.host].init;
          if (init) { return init.call(self); }
        })
        .then(function () { return self._waitForVideoElement(); })
        .then(function () {
          self._prepareDOMEnvironment();
          self._enterFullscreen();
          self._attachEventListeners();
          self._startStatusMonitoring();
          _isInitialized = true;
        })
        .catch(function (error) {
          self._showErrorUI(error.message);
          throw error;
        });
    },

    destroy: function () {
      _eventListeners.forEach(function (item) { item.element.removeEventListener(item.type, item.listener); });
      _eventListeners = [];
      if (_mutationObserver) { _mutationObserver.disconnect(); _mutationObserver = null; }
      if (_statusInterval) { clearInterval(_statusInterval); _statusInterval = null; }
      _isInitialized = false;
    },

    play: function () { _isPaused = false; var video = this._getVideoElement(); if (video) video.play(); },
    pause: function () { _isPaused = true; var video = this._getVideoElement(); if (video) video.pause(); },
    stop: function () { this.pause(); },
    setVolume: function (volume) { _volume = Math.max(0, Math.min(1, volume)); var video = this._getVideoElement(); if (video) video.volume = _volume; },
    getVolume: function () { var video = this._getVideoElement(); return video ? video.volume : 1.0; },
    _getVideoElement: function () { return document.querySelector('video'); },

    _waitForVideoElement: function (timeout) {
      timeout = timeout || 60000;
      var video = this._getVideoElement();
      if (video) return Promise.resolve(video);
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { observer.disconnect(); reject(new Error('等待video元素超时')); }, timeout);
        var observer = new MutationObserver(function () {
          var v = document.querySelector('video');
          if (v) { clearTimeout(timer); observer.disconnect(); resolve(v); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _waitForVideoMetadata: function (timeout) {
      timeout = timeout || 60000;
      var video = this._getVideoElement();
      if (!video) return Promise.reject(new Error('video元素不存在'));
      if (video.videoWidth > 0) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { cleanup(); reject(new Error('等待video元数据超时')); }, timeout);
        var cleanup = function () { clearTimeout(timer); video.removeEventListener('loadedmetadata', onLoaded); };
        var onLoaded = function () { cleanup(); resolve(); };
        video.addEventListener('loadedmetadata', onLoaded);
      });
    },

    _waitForElement: function (selector, timeout) {
      timeout = timeout || 60000;
      var element = document.querySelector(selector);
      if (element) return Promise.resolve(element);
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { observer.disconnect(); reject(new Error('等待元素超时: ' + selector)); }, timeout);
        var observer = new MutationObserver(function () {
          var el = document.querySelector(selector);
          if (el) { clearTimeout(timer); observer.disconnect(); resolve(el); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    _prepareDOMEnvironment: function () {
      var viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.body.style.margin = '0';
      document.body.style.overflow = 'hidden';
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style:not(#btzx-final-fix)');
      stylesheets.forEach(sheet => sheet.remove());
    },

    _enterFullscreen: function () {
      var video = this._getVideoElement();
      if (!video || video.classList.contains('btzx-fix-target')) return;
      video.style.position = 'fixed';
      video.style.top = '-1px'; video.style.left = '-1px';
      video.style.right = '-1px'; video.style.bottom = '-1px';
      video.style.width = 'calc(100vw + 2px)'; video.style.height = 'calc(100vh + 2px)';
      video.style.zIndex = '9999';
      video.style.backgroundColor = 'black';
      video.style.objectFit = 'cover';
      video.style.boxSizing = 'border-box';
      video.style.pointerEvents = 'auto';
      video.style.margin = '0'; video.style.padding = '0'; video.style.border = 'none';
    },

    _attachEventListeners: function () {
      var video = this._getVideoElement();
      if (!video) return;
      var handlers = {
        play: function () { _isPaused = false; if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.triggerPlaying) { window.WebviewVideoPlayerInterface.triggerPlaying(); } },
        pause: function () { _isPaused = true; if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.triggerPaused) { window.WebviewVideoPlayerInterface.triggerPaused(); } },
        waiting: function () { if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.triggerLoading) { window.WebviewVideoPlayerInterface.triggerLoading(); } },
        ended: function () { if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.triggerEnded) { window.WebviewVideoPlayerInterface.triggerEnded(); } },
        error: function (event) { if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.triggerError) { window.WebviewVideoPlayerInterface.triggerError(); } },
        loadedmetadata: function () {
          if (video.videoWidth && video.videoHeight) {
            _videoWidth = video.videoWidth; _videoHeight = video.videoHeight;
            if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.changeResolution) { window.WebviewVideoPlayerInterface.changeResolution(_videoWidth, _videoHeight); }
          }
        },
        timeupdate: function () {
          if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.changePosition) {
            var position = Math.floor(video.currentTime * 1000);
            var duration = HOST_CONFIGS[location.host] && HOST_CONFIGS[location.host].getDuration && HOST_CONFIGS[location.host].getDuration();
            if (!duration || duration <= 0 || position > duration) { duration = position; }
            window.WebviewVideoPlayerInterface.changePosition(position, duration);
          }
        }
      };
      Object.keys(handlers).forEach(function (event) {
        video.addEventListener(event, handlers[event]);
        _eventListeners.push({ element: video, type: event, listener: handlers[event] });
      });
    },

    _startStatusMonitoring: function () {
      var self = this;
      var video = this._getVideoElement();
      if (!video) return;
      var statusHandler = function () { if (video.videoWidth && video.videoHeight) { self._updateResolution(video.videoWidth, video.videoHeight); } };
      video.addEventListener('loadedmetadata', statusHandler);
      video.addEventListener('loadstart', statusHandler);
      _eventListeners.push({ element: video, type: 'loadedmetadata', listener: statusHandler });
      _eventListeners.push({ element: video, type: 'loadstart', listener: statusHandler });

      _statusInterval = setInterval(function () {
        var v = self._getVideoElement();
        if (!v) return;
        if (v.volume !== _volume) { v.volume = _volume; }
        if (!_isPaused && v.paused && v.readyState >= 2) { v.play().catch(function (err) { }); }
        if (v.style.position !== 'fixed' && !v.classList.contains('btzx-fix-target')) { self._enterFullscreen(); }
        if (v.videoWidth !== _videoWidth || v.videoHeight !== _videoHeight) { self._updateResolution(v.videoWidth, v.videoHeight); }
      }, 1000);
    },

    _updateResolution: function (width, height) {
      if (width === _videoWidth && height === _videoHeight) return;
      _videoWidth = width; _videoHeight = height;
      if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.changeResolution) { window.WebviewVideoPlayerInterface.changeResolution(_videoWidth, _videoHeight); }
    },

    _showErrorUI: function (message) {
      var errorDiv = document.getElementById('webview-video-error');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'webview-video-error';
        errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100000;background:black;color:white;display:flex;justify-content:center;align-items:center;font-size:3vw;text-align:center;';
        document.body.appendChild(errorDiv);
      }
      errorDiv.textContent = message;
    }
  };

  function _log(message, level) {
    if (window.WebviewVideoPlayerInterface && window.WebviewVideoPlayerInterface.logV) { window.WebviewVideoPlayerInterface.logV('[WebviewVideoPlayer] ' + message); }
  }

  if (!global.WebviewVideoPlayer) { global.WebviewVideoPlayer = WebviewVideoPlayer; }
  var start = function () { setTimeout(function () { global.WebviewVideoPlayer.initialize(); }, 500); };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})(typeof window !== 'undefined' ? window : this);
