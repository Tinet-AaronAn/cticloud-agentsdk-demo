// main.js — CTICloud AgentSDK Demo 主逻辑
(function() {
  'use strict';

  // 默认参数（env.json 不存在时使用）
  const DEFAULT_CONFIG = {
    baseURL: 'https://agent-gateway-hs-dev.cticloud.cn',
    tenantId: '6000001',
    agentNo: '1865',
    sessionKey: '32693082-19c3-43a5-a260-8e3852639a2f',
    bindEndpoint: { endpointType: 3, endpoint: '3016' },
    customerNumber: '13426307922',
    initialStatus: 1
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

    // 方法
    showToast(msg, type = 'info') {
      this.toasts.push({ msg, type });
      setTimeout(() => this.toasts.shift(), 4000);
    },

    addEvent(type, data) {
      const summary = this.getEventSummary(type, data);
      this.events.unshift({
        time: formatTime(),
        type,
        data,
        summary,
        expanded: false
      });
      // 限制事件数量
      if (this.events.length > 200) this.events.pop();
    },

    getEventSummary(type, data) {
      switch (type) {
        case 'AGENT_STATUS':
          return `状态: ${data.status?.state || 'unknown'}`;
        case 'PREVIEW_OBCALL_START':
          return `开始拨打 ${data.customerNumber || ''}`;
        case 'PREVIEW_OBCALL_RINGING':
          return `振铃中`;
        case 'PREVIEW_OBCALL_BRIDGE':
          return `已接通`;
        case 'PREVIEW_OBCALL_RESULT':
          return `结果: ${data.result || ''}`;
        case 'RINGING':
          return `来电振铃`;
        case 'RECONNECT_ATTEMPT':
          return `重连尝试 #${data.attempt || 1}`;
        case 'TRANSCRIPT':
          return `转写: ${(data.text || '').substring(0, 30)}...`;
        case 'WEBRTC_STATS':
          this.updateWebrtc(data);
          return `WebRTC 状态`;
        default:
          return type;
      }
    },

    updateWebrtc(data) {
      if (data.jitter != null) this.webrtc.jitter = data.jitter.toFixed(1);
      if (data.packetLossRate != null) this.webrtc.packetLoss = (data.packetLossRate * 100).toFixed(2);
      if (data.rtt != null) this.webrtc.rtt = data.rtt.toFixed(0);
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
      const el = document.querySelector('.offcanvas');
      if (el) new bootstrap.Offcanvas(el).show();
    },

    closeConfig() {
      const el = document.querySelector('.offcanvas');
      if (el) bootstrap.Offcanvas.getInstance(el)?.hide();
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
