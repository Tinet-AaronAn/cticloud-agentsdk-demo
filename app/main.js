// main.js — CTICloud AgentSDK Demo 主逻辑
(function() {
  'use strict';

  // 默认参数（env.json 不存在时使用）
  const DEFAULT_CONFIG = {
    baseURL: 'https://agent-gateway-hs-dev.cticloud.cn',
    tenantId: '6000001',
    agentNo: '1865',
    bindEndpoint: { endpointType: 3, endpoint: '1883' },
    customerNumber: '13426307922',
    initialStatus: 1
  };

  // JSONP 获取 sessionKey 的配置
  const AUTH_CONFIG = {
    apiBaseURL: 'https://api-hs-dev.cticloud.cn',
    validateType: '2',
    enterpriseId: '6000001',
    cno: '1865',
    token: '0e7a1929ab9d2bd9eb958c8873933123'
  };

  // 敏感字段列表（不打印到日志）
  const SENSITIVE_KEYS = ['sessionKey', 'token', 'password', 'secret'];

  // 工具函数
  function formatTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }

  function safeStringify(obj) {
    if (!obj) return '';
    const clone = JSON.parse(JSON.stringify(obj));
    function mask(o) {
      if (!o || typeof o !== 'object') return;
      for (const k of Object.keys(o)) {
        if (SENSITIVE_KEYS.includes(k)) o[k] = '***';
        else if (typeof o[k] === 'object') mask(o[k]);
      }
    }
    mask(clone);
    return JSON.stringify(clone, null, 2);
  }

  // JSONP 请求获取 sessionKey
  function fetchSessionKey() {
    return new Promise((resolve, reject) => {
      // 检查 md5 函数是否存在
      if (typeof window.md5 !== 'function') {
        reject(new Error('md5 函数未定义，请确保 blueimp-md5 已加载'));
        return;
      }
      
      const cno = AUTH_CONFIG.cno;
      const enterpriseId = AUTH_CONFIG.enterpriseId;
      const token = AUTH_CONFIG.token;
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 生成签名：MD5(enterpriseId + timestamp + token)
      const signSeed = `${enterpriseId}${timestamp}${token}`;
      const sign = window.md5(signSeed);
      
      // 构建回调函数名
      const callbackName = `__jsonp_cb_${timestamp}_${Math.floor(Math.random() * 1000000)}`;
      
      // 构建 URL
      let url = `${AUTH_CONFIG.apiBaseURL}/interface/v10/agentLogin/authenticateJsonp?validateType=${AUTH_CONFIG.validateType}`;
      url += `&enterpriseId=${encodeURIComponent(enterpriseId)}&cno=${encodeURIComponent(cno)}`;
      url += `&timestamp=${encodeURIComponent(timestamp)}&sign=${encodeURIComponent(sign)}`;
      url += `&callback=${callbackName}`;
      
      // 创建 script 标签
      const script = document.createElement('script');
      script.src = url;
      
      // 设置回调
      window[callbackName] = function(response) {
        try {
          const data = typeof response === 'string' ? JSON.parse(response) : response;
          if (data.result === 0 && data.sessionKey) {
            resolve({
              sessionKey: data.sessionKey,
              agentGateWayUrl: data.agentGateWayUrl
            });
          } else {
            reject(new Error(data.message || '获取 sessionKey 失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        } finally {
          delete window[callbackName];
          document.head.removeChild(script);
        }
      };
      
      // 超时处理
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          document.head.removeChild(script);
          reject(new Error('请求超时'));
        }
      }, 10000);
      
      // 发起请求
      document.head.appendChild(script);
    });
  }

  // PetiteVue 应用
  const App = {
    // 状态
    config: { ...DEFAULT_CONFIG, bindEndpoint: { ...DEFAULT_CONFIG.bindEndpoint } },
    loggedIn: false,
    agentState: 'offline',
    deviceStatus: 0,
    events: [],
    eventFilter: '',
    selectedEvent: null,
    autoTesting: false,
    toasts: [],
    webrtc: { jitter: '--', packetLoss: '--', rtt: '--' },
    theme: 'light',
    configOpen: false,

    // 计算属性
    get statusClass() {
      if (!this.loggedIn) return 'status-offline';
      if (this.deviceStatus === 4) return 'status-talking';
      if (this.deviceStatus === 3) return 'status-busy';
      if (this.agentState === 'idle') return 'status-idle';
      return 'status-busy';
    },
    get statusText() {
      if (!this.loggedIn) return '离线';
      if (this.deviceStatus === 4) return '通话中';
      if (this.deviceStatus === 3) return '振铃';
      if (this.agentState === 'idle') return '空闲';
      if (this.agentState === 'busy') return '忙碌';
      if (this.agentState === 'wrapup') return '整理';
      return this.agentState;
    },
    get canCall() {
      return this.loggedIn && this.agentState === 'idle' && this.config.customerNumber;
    },
    get canAnswer() {
      return this.loggedIn && this.deviceStatus === 3 && this.config.bindEndpoint.endpointType === 3;
    },
    get canHangup() {
      return this.loggedIn && this.deviceStatus === 4;
    },
    get filteredEvents() {
      if (!this.eventFilter) return this.events;
      return this.events.filter(e => e.type.includes(this.eventFilter));
    },
    get selectedEventDetail() {
      if (!this.selectedEvent) return '';
      return safeStringify(this.selectedEvent.data);
    },
    get callInfo() {
      const call = this.events.find(e => e.type === 'PREVIEW_OBCALL_START');
      if (!call) return null;
      return `呼叫 ${call.data.customerNumber || '未知号码'}`;
    },
    get themeIcon() {
      return this.theme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    },

    // 新 UI 辅助方法
    getEventDotClass(type) {
      if (type.includes('AGENT_STATUS') || type.includes('LOGIN')) return 'type-status';
      if (type.includes('CALL') || type.includes('RINGING') || type.includes('BRIDGE')) return 'type-call';
      if (type.includes('WEBRTC')) return 'type-webrtc';
      return 'type-other';
    },

    getToastIcon(type) {
      switch (type) {
        case 'success': return 'bi bi-check-circle-fill';
        case 'error': return 'bi bi-x-circle-fill';
        case 'warning': return 'bi bi-exclamation-triangle-fill';
        default: return 'bi bi-info-circle-fill';
      }
    },

    // 方法
    showToast(msg, type = 'info') {
      this.toasts.push({ msg, type });
      setTimeout(() => this.toasts.shift(), 4000);
    },

    addEvent(type, data) {
      const summary = this.getEventSummary(type, data);
      const detail = this.getEventDetail(type, data);
      this.events.unshift({
        time: formatTime(),
        type,
        data,
        summary,
        detail,
        expanded: false
      });
      // 限制事件数量
      if (this.events.length > 200) this.events.pop();
    },

    getEventSummary(type, data) {
      switch (type) {
        case 'AGENT_STATUS':
          return `状态: ${data.status?.state || 'unknown'} | 设备: ${this.getDeviceStatusText(data.status?.deviceStatus)}`;
        case 'PREVIEW_OBCALL_START':
          return `开始拨打 ${data.customerNumber || ''} | 坐席: ${data.agentNumber || ''}`;
        case 'PREVIEW_OBCALL_RINGING':
          return `振铃中 | ${data.ringingSide === 'agent' ? '坐席侧' : '客户侧'}`;
        case 'PREVIEW_OBCALL_BRIDGE':
          return `已接通 | 通话ID: ${(data.callId || '').substring(0, 12)}...`;
        case 'PREVIEW_OBCALL_RESULT':
          return `结果: ${data.result || data.reason || ''} | 挂断方: ${data.hangupSide || ''}`;
        case 'RINGING':
          return `来电振铃 | ${data.callerNumber || ''}`;
        case 'RECONNECT_ATTEMPT':
          return `重连尝试 #${data.attempt || 1} | ${data.reason || ''}`;
        case 'TRANSCRIPT':
          const text = data.text || '';
          return `转写: ${text.substring(0, 25)}${text.length > 25 ? '...' : ''}`;
        case 'WEBRTC_STATS':
          this.updateWebrtc(data);
          return `WebRTC | 抖动:${data.jitter?.toFixed(1) || '--'}ms 丢包:${data.packetLossRate ? (data.packetLossRate * 100).toFixed(1) : '--'}%`;
        case 'LOGIN_OK':
          return `登录成功 | 坐席: ${this.config.agentNo}`;
        case 'LOGIN_ERROR':
          return `登录失败 | ${data.message || data.errorCode || ''}`;
        case 'LOGIN_EXCEPTION':
          return `登录异常 | ${data.message || ''}`;
        case 'LOGOUT':
          return `登出成功 | ${data.message || ''}`;
        default:
          return type;
      }
    },

    getEventDetail(type, data) {
      try {
        // 返回格式化的 JSON，显示完整事件数据
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return String(data);
      }
    },

    getDeviceStatusText(status) {
      const statusMap = {
        0: '未绑定',
        1: '空闲',
        2: '振铃中',
        3: '通话中',
        4: '话后处理',
        5: '离线'
      };
      return statusMap[status] || `未知(${status})`;
    },

    updateWebrtc(data) {
      // 兼容多种数据结构
      // 结构1: { jitter, packetLossRate, rtt }
      // 结构2: { stats: { jitter, packetLossRate, rtt } }
      // 结构3: { audio: { jitter, packetsLost }, video: {...} }
      
      const stats = data.stats || data;
      
      // 抖动 (jitter)
      if (stats.jitter != null) {
        this.webrtc.jitter = typeof stats.jitter === 'number' 
          ? stats.jitter.toFixed(1) 
          : stats.jitter;
      }
      
      // 丢包率 (packetLossRate 或 calculated)
      if (stats.packetLossRate != null) {
        this.webrtc.packetLoss = typeof stats.packetLossRate === 'number'
          ? (stats.packetLossRate * 100).toFixed(2)
          : stats.packetLossRate;
      } else if (stats.packetsLost != null && stats.packetsReceived != null) {
        const rate = stats.packetsLost / (stats.packetsLost + stats.packetsReceived);
        this.webrtc.packetLoss = (rate * 100).toFixed(2);
      }
      
      // 往返时延 (rtt 或 roundTripTime)
      if (stats.rtt != null) {
        this.webrtc.rtt = typeof stats.rtt === 'number'
          ? stats.rtt.toFixed(0)
          : stats.rtt;
      } else if (stats.roundTripTime != null) {
        this.webrtc.rtt = typeof stats.roundTripTime === 'number'
          ? (stats.roundTripTime * 1000).toFixed(0) // 转换为 ms
          : stats.roundTripTime;
      }
      
      // 打印调试信息
      console.log('WebRTC Stats:', stats);
    },

    toggleEventDetail(i) {
      this.events[i].expanded = !this.events[i].expanded;
      this.selectedEvent = this.events[i].expanded ? this.events[i] : null;
    },

    clearEvents() {
      this.events = [];
      this.selectedEvent = null;
    },

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      document.body.style.background = this.theme === 'dark' ? '#1a1a2e' : '#f5f7fa';
    },

    openConfig() {
      this.configOpen = true;
    },

    closeConfig() {
      this.configOpen = false;
    },

    applyConfig() {
      this.closeConfig();
      this.showToast('配置已应用', 'success');
      // 保存到 localStorage
      try {
        localStorage.setItem('agentsdk_config', JSON.stringify(this.config));
      } catch (e) {}
    },

    loadSavedConfig() {
      try {
        const saved = localStorage.getItem('agentsdk_config');
        if (saved) {
          const cfg = JSON.parse(saved);
          Object.assign(this.config, cfg);
        }
      } catch (e) {}
    },

    // SDK 操作
    async setupSDK() {
      const AgentSDK = await getAgentSDK();
      const { EventType } = AgentSDK;

      // 订阅事件
      const eventTypes = [
        EventType.AGENT_STATUS,
        EventType.PREVIEW_OBCALL_START,
        EventType.PREVIEW_OBCALL_RINGING,
        EventType.PREVIEW_OBCALL_BRIDGE,
        EventType.PREVIEW_OBCALL_RESULT,
        EventType.RINGING,
        EventType.RECONNECT_ATTEMPT,
        EventType.TRANSCRIPT,
        EventType.WEBRTC_STATS,
      ];

      eventTypes.forEach(et => {
        AgentSDK.on(et, (e) => {
          const type = et.toString();
          this.addEvent(type.replace('EventType.', ''), e);
          // 更新坐席状态
          if (e.eventType === 'agentStatus') {
            this.agentState = e.status?.state || 'unknown';
            this.deviceStatus = e.status?.deviceStatus || 0;
          }
        });
      });

      return AgentSDK;
    },

    async login() {
      try {
        // 先获取 sessionKey
        this.showToast('正在获取登录凭证...', 'info');
        const authData = await fetchSessionKey();
        
        // 更新配置
        this.config.sessionKey = authData.sessionKey;
        if (authData.agentGateWayUrl) {
          this.config.baseURL = `https://${authData.agentGateWayUrl}`;
        }
        
        this.addEvent('AUTH_SUCCESS', { 
          agentGateWayUrl: authData.agentGateWayUrl,
          sessionKey: '***' // 不记录真实 sessionKey
        });
        
        // 执行登录
        const AgentSDK = await this.setupSDK();
        AgentSDK.setup({
          baseURL: this.config.baseURL,
          debug: true,
          webrtc: this.config.bindEndpoint.endpointType === 3,
          webrtcStats: true,
          observability: false,
        });

        const res = await AgentSDK.login({
          tenantId: this.config.tenantId,
          agentNo: this.config.agentNo,
          sessionKey: this.config.sessionKey,
          bindEndpoint: this.config.bindEndpoint,
          initialStatus: this.config.initialStatus,
        });

        if (res.code !== 0) {
          this.showToast(`登录失败: ${res.message || res.errorCode}`, 'danger');
          this.addEvent('LOGIN_ERROR', res);
        } else {
          this.loggedIn = true;
          this.showToast('登录成功', 'success');
          this.addEvent('LOGIN_OK', {});
        }
      } catch (err) {
        this.showToast(`登录异常: ${err.message}`, 'danger');
        this.addEvent('LOGIN_EXCEPTION', { code: err.code, message: err.message });
      }
    },

    async previewObCall() {
      if (!this.canCall) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.previewObCall({
          customerNumber: this.config.customerNumber,
          agentAnswerTimeout: 30,
          customerAnswerTimeout: 45,
        });
        if (res.code !== 0) {
          this.showToast(`外呼失败: ${res.message || res.errorCode}`, 'warning');
        } else {
          this.showToast('外呼已发起', 'info');
        }
      } catch (err) {
        this.showToast(`外呼异常: ${err.message}`, 'danger');
      }
    },

    async sipLink() {
      if (!this.canAnswer) return;
      try {
        const AgentSDK = await getAgentSDK();
        await AgentSDK.sipLink();
        this.showToast('已接听', 'success');
      } catch (err) {
        this.showToast(`接听异常: ${err.message}`, 'danger');
      }
    },

    async sipUnlink() {
      if (!this.canHangup) return;
      try {
        const AgentSDK = await getAgentSDK();
        await AgentSDK.sipUnlink();
        this.showToast('已挂断', 'info');
      } catch (err) {
        this.showToast(`挂断异常: ${err.message}`, 'danger');
      }
    },

    async logout() {
      if (!this.loggedIn) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.logout({ logoutMode: 1, unbindEndpoint: 0 });
        this.loggedIn = false;
        this.agentState = 'offline';
        this.deviceStatus = 0;
        this.showToast('已登出', 'info');
        this.addEvent('LOGOUT', res);
      } catch (err) {
        this.showToast(`登出异常: ${err.message}`, 'warning');
      }
    },

    // 一键自测
    async runAutoTest() {
      if (this.autoTesting) return;
      this.autoTesting = true;
      this.showToast('开始自动测试...', 'info');

      try {
        // 登录
        await this.login();
        if (!this.loggedIn) throw new Error('登录失败');
        await this.delay(2000);

        // 外呼
        await this.previewObCall();
        await this.delay(3000);

        // 等待振铃
        for (let i = 0; i < 30 && this.deviceStatus !== 3; i++) {
          await this.delay(1000);
        }

        // 接听
        if (this.canAnswer) {
          await this.sipLink();
          await this.delay(5000);
        }

        // 挂断
        if (this.canHangup) {
          await this.sipUnlink();
          await this.delay(1000);
        }

        // 登出
        await this.logout();

        this.showToast('自动测试完成', 'success');
      } catch (err) {
        this.showToast(`自动测试中断: ${err.message}`, 'warning');
      } finally {
        this.autoTesting = false;
      }
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 初始化
    async init() {
      // 加载保存的配置
      this.loadSavedConfig();

      // 检查 URL 参数
      const params = new URLSearchParams(window.location.search);
      if (params.get('autotest') === '1') {
        setTimeout(() => this.runAutoTest(), 1000);
      }
    }
  };

  // 启动应用
  PetiteVue.createApp(App).mount('#app');
  App.init();

})();
