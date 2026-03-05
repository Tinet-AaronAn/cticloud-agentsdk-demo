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
    isOnHold: false,
    isMuted: false,
    isConsulting: false,
    // 班组长操作状态
    isSpying: false,        // 监听中
    isWhispering: false,    // 耳语中
    isBarging: false,       // 强插中
    spyTarget: null,        // 监听目标
    whisperTarget: null,    // 耳语目标
    bargeTarget: null,      // 强插目标
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
      if (this.deviceStatus === 3) return '振铃中';
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
    get canSetBusy() {
      return this.loggedIn && this.agentState === 'idle';
    },
    get canSetIdle() {
      return this.loggedIn && (this.agentState === 'busy' || this.agentState === 'wrapup');
    },
    // 通话控制
    get canHold() {
      return this.loggedIn && this.deviceStatus === 4 && !this.isOnHold;
    },
    get canUnhold() {
      return this.loggedIn && this.isOnHold;
    },
    get canMute() {
      return this.loggedIn && this.deviceStatus === 4 && !this.isMuted;
    },
    get canUnmute() {
      return this.loggedIn && this.isMuted;
    },
    get canSendDtmf() {
      return this.loggedIn && this.deviceStatus === 4;
    },
    // 转接控制
    get canStartAtxfer() {
      // 通话中且未咨询状态可以开始咨询
      return this.loggedIn && this.deviceStatus === 4 && !this.isConsulting;
    },
    get canCancelAtxfer() {
      // 咨询中可以取消
      return this.loggedIn && this.isConsulting;
    },
    get canResumeAtxfer() {
      // 咨询中可以恢复
      return this.loggedIn && this.isConsulting;
    },
    get canCompleteAtxfer() {
      // 咨询中可以完成转接
      return this.loggedIn && this.isConsulting;
    },
    get canThreewayAtxfer() {
      // 咨询中可以三方
      return this.loggedIn && this.isConsulting;
    },
    get canBlxfer() {
      // 通话中可以盲转
      return this.loggedIn && this.deviceStatus === 4;
    },
    // 置忙置闲（班组长操作）
    get canSetPause() {
      return this.loggedIn && this.agentState === 'idle';
    },
    get canSetUnpause() {
      return this.loggedIn && (this.agentState === 'busy' || this.agentState === 'wrapup');
    },
    // 班组长操作 - 状态控制
    // 监听：已登录 + 不在自己振铃或通话中
    get canSpy() {
      return this.loggedIn && this.deviceStatus !== 3 && this.deviceStatus !== 4 && !this.isSpying;
    },
    // 耳语：已登录 + 正在监听中（监听后可升级为耳语）
    get canWhisper() {
      return this.loggedIn && this.isSpying && !this.isWhispering && !this.isBarging;
    },
    // 强插：已登录 + 正在监听中（监听后可升级为强插）
    get canBarge() {
      return this.loggedIn && this.isSpying && !this.isWhispering && !this.isBarging;
    },
    // 强拆：已登录即可（不需要在监听中）
    get canDisconnect() {
      return this.loggedIn;
    },
    // 取消监听：正在监听中
    get canUnspy() {
      return this.isSpying && !this.isWhispering && !this.isBarging;
    },
    // 取消耳语： 正在耳语中
    get canUnwhisper() {
      return this.isWhispering;
    },
    // 取消强插： 正在强插中
    get canCancelBarge() {
      return this.isBarging;
    },
    // 取消三方（班组长）： 正在三方中
    get canCancelThreeway() {
      return this.loggedIn && this.isSpying;  // 简化判断，监听中即可取消
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
      // 统一转大写处理
      const upperType = type.toUpperCase().replace(/-/g, '_');
      
      switch (upperType) {
        // ========== 坐席状态与会话 ==========
        case 'AGENT_STATUS':
          return `状态: ${data.status?.state || 'unknown'} | 设备: ${this.getDeviceStatusText(data.status?.deviceStatus)}`;
        case 'SESSION_INIT':
          return `会话初始化 | 坐席: ${data.agentNo || ''}`;
        case 'SESSION_TERMINATE':
          return `会话终止 | 坐席: ${data.agentNo || ''}`;
        case 'SIP_SESSION_INIT':
          return `SIP会话初始化 | 坐席: ${data.agentNo || ''}`;
        case 'SIP_SESSION_TERMINATE':
          return `SIP会话终止 | 坐席: ${data.agentNo || ''}`;
        case 'SIP_DISCONNECTED':
          return `软电话断开 | 坐席: ${data.agentNo || ''}`;
        case 'RECONNECT_ATTEMPT':
          return `重连尝试 #${data.attempt || 1}/${data.maxAttempts || 20} | 状态码: ${data.code || ''}`;
          
        // ========== 预览外呼 ==========
        case 'PREVIEW_OBCALL_START':
          return `开始拨打 ${data.customerNumber || ''} | 主叫: ${data.obClid || ''}`;
        case 'PREVIEW_OBCALL_RINGING':
          return `振铃中 | 状态: ${data.state || ''} | 客户: ${data.customerNumber || ''}`;
        case 'PREVIEW_OBCALL_BRIDGE':
          return `已接通 | 通道: ${(data.channel || '').substring(0, 15)}...`;
        case 'PREVIEW_OBCALL_RESULT':
          return `结果: ${data.result || ''} | 通话ID: ${(data.uniqueId || '').substring(0, 12)}...`;
          
        // ========== 来电振铃 ==========
        case 'RINGING':
          const callTypeMap = {1: '呼入', 2: 'WebCall', 4: '预览外呼', 5: '预测外呼', 6: '外呼', 9: '内部呼叫', 11: 'SIP接入'};
          return `来电振铃 | ${callTypeMap[data.callType] || '未知'} | ${data.customerNumber || ''}`;
          
        // ========== 咨询转接 ==========
        case 'ATXFER_START':
          return `咨询开始 | 目标: ${data.target || ''}`;
        case 'ATXFER_LINK':
          return `咨询接通 | 目标: ${data.target || ''}`;
        case 'ATXFER_ENDED':
          return `咨询结束 | 目标: ${data.target || ''} | 挂断方: ${data.hangupSide || ''}`;
        case 'ATXFER_ERROR':
          return `咨询失败 | 状态: ${data.state || ''}`;
        case 'THREEWAY_ATXFER_RESULT':
          return `咨询三方结果 | 目标: ${data.target || ''}`;
        case 'ATXFER_THREEWAY_UNLINK':
          return `咨询三方结束 | 目标: ${data.target || ''}`;
        case 'COMPLETE_ATXFER_RESULT':
          return `转接完成 | 目标: ${data.target || ''}`;
          
        // ========== 班组长操作 - 监听 ==========
        case 'SPY_RESULT':
          return `监听结果 | 目标: ${data.spiedCno || ''} | ${data.result || ''}`;
        case 'SPY_LINK':
          return `监听接通 | 目标: ${data.spiedCno || ''}`;
        case 'SPY_UNLINK':
          return `监听结束 | 目标: ${data.spiedCno || ''}`;
          
        // ========== 班组长操作 - 三方 ==========
        case 'THREEWAY_RESULT':
          return `三方结果 | 目标: ${data.threewayedCno || ''} | ${data.result || ''}`;
        case 'THREEWAY_LINK':
          return `三方接通 | 目标: ${data.threewayedCno || ''}`;
        case 'THREEWAY_UNLINK':
          return `三方结束 | 目标: ${data.threewayedAgentNo || ''}`;
          
        // ========== 班组长操作 - 耳语 ==========
        case 'WHISPER_RESULT':
          return `耳语结果 | 目标: ${data.whisperedCno || ''} | ${data.result || ''}`;
        case 'WHISPER_LINK':
          return `耳语接通 | 目标: ${data.whisperedCno || ''}`;
        case 'WHISPER_UNLINK':
          return `耳语结束 | 目标: ${data.whisperedAgentNo || ''}`;
          
        // ========== 班组长操作 - 强插 ==========
        case 'BARGE_RESULT':
          return `强插结果 | 目标: ${data.bargedAgentNo || ''} | ${data.result || ''}`;
        case 'BARGE_LINK':
          return `强插接通 | 目标: ${data.bargedAgentNo || ''}`;
        case 'BARGE_UNLINK':
          return `强插结束 | 目标: ${data.bargedCno || ''}`;
          
        // ========== 班组长操作 - 强拆/强下 ==========
        case 'DISCONNECT_RESULT':
          return `强拆结果 | 目标: ${data.disconnectorCno || ''} | ${data.result || ''}`;
        case 'SET_OFFLINE':
          return `强制下线 | 操作者: ${data.initiator || ''} | ${data.message || ''}`;
          
        // ========== 队列与分机状态 ==========
        case 'QUEUE_STATUS':
          const queueCount = data.queueStatus ? Object.keys(data.queueStatus).length : 0;
          return `队列状态 | ${queueCount} 个队列`;
        case 'EXTENSTATE':
          return `分机状态 | ${data.extenNo || ''} | ${data.state || ''} | 注册: ${data.registerState || ''}`;
          
        // ========== IVR 交互 ==========
        case 'INTERACT_RETURN':
          const varCount = data.returnVariables ? Object.keys(data.returnVariables).length : 0;
          return `IVR交互返回 | ${varCount} 个变量`;
          
        // ========== 转写与回调 ==========
        case 'TRANSCRIPT':
          const text = data.text || '';
          const roleText = data.role === 1 ? '坐席' : (data.role === 2 ? '客户' : '未知');
          return `转写[${roleText}]: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`;
        case 'ORDER_CALLBACK':
          return `预约回调事件`;
          
        // ========== 网络与质量 ==========
        case 'PING':
          return `Ping | 延迟: ${data.latencyTime || '--'}ms | 网络状态: ${data.networkState || '--'}`;
        case 'WEBRTC_STATS':
        case 'WEBRTCSTATS':
          this.updateWebrtc(data);
          return `WebRTC | 抖动:${data.jitter?.toFixed(1) || '--'}ms 丢包:${data.packetLossRate ? (data.packetLossRate * 100).toFixed(1) : '--'}%`;
          
        // ========== 内部事件 ==========
        case 'LOGIN_OK':
          return `登录成功 | 坐席: ${this.config.agentNo}`;
        case 'LOGIN_ERROR':
          return `登录失败 | ${data.message || data.errorCode || ''}`;
        case 'LOGIN_EXCEPTION':
          return `登录异常 | ${data.message || ''}`;
        case 'LOGOUT':
          return `登出成功 | ${data.message || ''}`;
        case 'AUTH_SUCCESS':
          return `认证成功`;
          
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
        2: '等待',
        3: '振铃中',
        4: '通话中',
        5: '话后处理',
        6: '离线'
      };
      return statusMap[status] || `未知(${status})`;
    },

    updateWebrtc(data) {
      // 直接使用传入的数据（事件数据结构）
      // { jitter, packetLossRate, rtt, ... }
      
      // 抖动 (jitter) - 单位可能是秒，需要转换为毫秒
      if (data.jitter != null) {
        const jitterVal = typeof data.jitter === 'number' ? data.jitter : parseFloat(data.jitter);
        this.webrtc.jitter = isNaN(jitterVal) ? '--' : jitterVal.toFixed(1);
      }
      
      // 丢包率 (packetLossRate) - 0-1 的比例，需要转换为百分比
      if (data.packetLossRate != null) {
        const lossVal = typeof data.packetLossRate === 'number' ? data.packetLossRate : parseFloat(data.packetLossRate);
        this.webrtc.packetLoss = isNaN(lossVal) ? '--' : (lossVal * 100).toFixed(2);
      }
      
      // 往返时延 (rtt) - 单位可能是秒，需要转换为毫秒
      if (data.rtt != null) {
        const rttVal = typeof data.rtt === 'number' ? data.rtt : parseFloat(data.rtt);
        this.webrtc.rtt = isNaN(rttVal) ? '--' : rttVal.toFixed(0);
      }
      
      console.log('WebRTC Stats Updated:', {
        jitter: this.webrtc.jitter,
        packetLoss: this.webrtc.packetLoss,
        rtt: this.webrtc.rtt
      });
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

      // 订阅所有事件（40个）
      const eventTypes = [
        // 坐席状态与会话
        EventType.AGENT_STATUS,
        EventType.SESSION_INIT,
        EventType.SESSION_TERMINATE,
        EventType.SIP_SESSION_INIT,
        EventType.SIP_SESSION_TERMINATE,
        EventType.SIP_DISCONNECTED,
        EventType.RECONNECT_ATTEMPT,
        
        // 预览外呼
        EventType.PREVIEW_OBCALL_START,
        EventType.PREVIEW_OBCALL_RINGING,
        EventType.PREVIEW_OBCALL_BRIDGE,
        EventType.PREVIEW_OBCALL_RESULT,
        
        // 来电振铃
        EventType.RINGING,
        
        // 咨询转接
        EventType.ATXFER_START,
        EventType.ATXFER_LINK,
        EventType.ATXFER_ENDED,
        EventType.ATXFER_ERROR,
        EventType.THREEWAY_ATXFER_RESULT,
        EventType.ATXFER_THREEWAY_UNLINK,
        EventType.COMPLETE_ATXFER_RESULT,
        
        // 班组长操作 - 监听
        EventType.SPY_RESULT,
        EventType.SPY_LINK,
        EventType.SPY_UNLINK,
        
        // 班组长操作 - 三方
        EventType.THREEWAY_RESULT,
        EventType.THREEWAY_LINK,
        EventType.THREEWAY_UNLINK,
        
        // 班组长操作 - 耳语
        EventType.WHISPER_RESULT,
        EventType.WHISPER_LINK,
        EventType.WHISPER_UNLINK,
        
        // 班组长操作 - 强插
        EventType.BARGE_RESULT,
        EventType.BARGE_LINK,
        EventType.BARGE_UNLINK,
        
        // 班组长操作 - 强拆/强下
        EventType.DISCONNECT_RESULT,
        EventType.SET_OFFLINE,
        
        // 队列与分机状态
        EventType.QUEUE_STATUS,
        EventType.EXTENSTATE,
        
        // IVR 交互
        EventType.INTERACT_RETURN,
        
        // 转写与回调
        EventType.TRANSCRIPT,
        EventType.ORDER_CALLBACK,
        
        // 网络与质量
        EventType.PING,
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
          
          // 班组长操作状态跟踪
          if (e.eventType === 'spyLink') {
            this.isSpying = true;
            this.spyTarget = e.spiedCno;
          }
          if (e.eventType === 'spyUnlink') {
            this.isSpying = false;
            this.spyTarget = null;
            this.isWhispering = false;
            this.whisperTarget = null;
            this.isBarging = false;
            this.bargeTarget = null;
          }
          if (e.eventType === 'whisperLink') {
            this.isWhispering = true;
            this.whisperTarget = e.whisperedCno;
          }
          if (e.eventType === 'whisperUnlink') {
            this.isWhispering = false;
            this.whisperTarget = null;
          }
          if (e.eventType === 'bargeLink') {
            this.isBarging = true;
            this.bargeTarget = e.bargedAgentNo;
          }
          if (e.eventType === 'bargeUnlink') {
            this.isBarging = false;
            this.bargeTarget = null;
          }
          // 班组长三方通话
          if (e.eventType === 'threewayLink') {
            this.isSpying = true;  // 三方通话也是监听的一种
          }
          if (e.eventType === 'threewayUnlink') {
            this.isSpying = false;
          }
          
          // 咨询转接状态跟踪
          if (e.eventType === 'atxferStart') {
            this.isConsulting = true;
          }
          if (e.eventType === 'atxferLink') {
            this.isConsulting = true;
          }
          if (e.eventType === 'atxferEnded') {
            this.isConsulting = false;
          }
          if (e.eventType === 'atxferError') {
            this.isConsulting = false;
          }
          if (e.eventType === 'completeAtxferResult') {
            this.isConsulting = false;
          }
          if (e.eventType === 'threewayAtxferResult') {
            // 三方咨询后仍保持咨询状态
            this.isConsulting = true;
          }
          if (e.eventType === 'atxferThreewayUnlink') {
            this.isConsulting = false;
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
        // 重置保持和静音状态
        this.isOnHold = false;
        this.isMuted = false;
        this.isConsulting = false;
      } catch (err) {
        this.showToast(`挂断异常: ${err.message}`, 'danger');
      }
    },

    // 通话控制
    async hold() {
      if (!this.canHold) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.hold();
        if (res.code === 0) {
          this.isOnHold = true;
          this.showToast('已保持', 'warning');
          this.addEvent('HOLD', res);
        } else {
          this.showToast(`保持失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`保持异常: ${err.message}`, 'danger');
      }
    },

    async unhold() {
      if (!this.canUnhold) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.unhold();
        if (res.code === 0) {
          this.isOnHold = false;
          this.showToast('已恢复', 'success');
          this.addEvent('UNHOLD', res);
        } else {
          this.showToast(`恢复失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`恢复异常: ${err.message}`, 'danger');
      }
    },

    async mute() {
      if (!this.canMute) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.mute({ direction: 'sendrecv' });
        if (res.code === 0) {
          this.isMuted = true;
          this.showToast('已静音', 'warning');
          this.addEvent('MUTE', res);
        } else {
          this.showToast(`静音失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`静音异常: ${err.message}`, 'danger');
      }
    },

    async unmute() {
      if (!this.canUnmute) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.unmute({ direction: 'sendrecv' });
        if (res.code === 0) {
          this.isMuted = false;
          this.showToast('已取消静音', 'success');
          this.addEvent('UNMUTE', res);
        } else {
          this.showToast(`取消静音失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`取消静音异常: ${err.message}`, 'danger');
      }
    },

    async sendDtmf() {
      if (!this.canSendDtmf) return;
      try {
        const digits = prompt('请输入要发送的 DTMF 数字:');
        if (!digits) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.sendDtmf({ digits });
        if (res.code === 0) {
          this.showToast(`DTMF 已发送: ${digits}`, 'success');
          this.addEvent('SEND_DTMF', { digits, ...res });
        } else {
          this.showToast(`发送失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`发送异常: ${err.message}`, 'danger');
      }
    },

    // 转接控制
    async startAtxfer() {
      if (!this.canStartAtxfer) return;
      try {
        const targetType = prompt('请输入目标类型:\n0 = 外线号码\n1 = 坐席号\n2 = 分机号');
        if (!targetType) return;
        
        const target = prompt('请输入目标号码:');
        if (!target) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.startAtxfer({ 
          targetType: parseInt(targetType),
          target 
        });
        if (res.code === 0) {
          this.isConsulting = true;
          this.showToast('咨询已发起', 'info');
          this.addEvent('START_ATXFER', { targetType, target, ...res });
        } else {
          this.showToast(`发起咨询失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`发起咨询异常: ${err.message}`, 'danger');
      }
    },

    async cancelAtxfer() {
      if (!this.canCancelAtxfer) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.cancelAtxfer();
        if (res.code === 0) {
          this.isConsulting = false;
          this.showToast('咨询已取消', 'warning');
          this.addEvent('CANCEL_ATXFER', res);
        } else {
          this.showToast(`取消咨询失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`取消咨询异常: ${err.message}`, 'danger');
      }
    },

    async resumeAtxfer() {
      if (!this.canResumeAtxfer) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.resumeAtxfer();
        if (res.code === 0) {
          this.showToast('咨询已恢复', 'success');
          this.addEvent('RESUME_ATXFER', res);
        } else {
          this.showToast(`恢复咨询失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`恢复咨询异常: ${err.message}`, 'danger');
      }
    },

    async completeAtxfer() {
      if (!this.canCompleteAtxfer) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.completeAtxfer();
        if (res.code === 0) {
          this.isConsulting = false;
          this.showToast('转接已完成', 'success');
          this.addEvent('COMPLETE_ATXFER', res);
        } else {
          this.showToast(`完成转接失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`完成转接异常: ${err.message}`, 'danger');
      }
    },

    async threewayAtxfer() {
      if (!this.canThreewayAtxfer) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.threewayAtxfer();
        if (res.code === 0) {
          this.showToast('三方咨询已建立', 'success');
          this.addEvent('THREEWAY_ATXFER', res);
        } else {
          this.showToast(`三方咨询失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`三方咨询异常: ${err.message}`, 'danger');
      }
    },

    async blxfer() {
      if (!this.canBlxfer) return;
      try {
        const targetType = prompt('请输入目标类型:\n0 = 外线号码\n1 = 坐席号\n2 = 分机号\n3 = IVR节点');
        if (!targetType) return;
        
        const target = prompt('请输入目标号码:');
        if (!target) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.blxfer({ 
          targetType: parseInt(targetType),
          target 
        });
        if (res.code === 0) {
          this.isConsulting = false;
          this.isOnHold = false;
          this.isMuted = false;
          this.showToast('盲转已完成', 'success');
          this.addEvent('BLXFER', { targetType, target, ...res });
        } else {
          this.showToast(`盲转失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`盲转异常: ${err.message}`, 'danger');
      }
    },

    // 班组长操作
    async setPause() {
      if (!this.canSetPause) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.setPause({ agent });
        if (res.code === 0) {
          this.showToast('已置忙', 'warning');
          this.addEvent('SET_PAUSE', { agent, ...res });
        } else {
          this.showToast(`置忙失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`置忙异常: ${err.message}`, 'danger');
      }
    },

    async setUnpause() {
      if (!this.canSetUnpause) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.setUnpause({ agent });
        if (res.code === 0) {
          this.showToast('已置闲', 'success');
          this.addEvent('SET_UNPAUSE', { agent, ...res });
        } else {
          this.showToast(`置闲失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`置闲异常: ${err.message}`, 'danger');
      }
    },

    async spy() {
      if (!this.canSpy) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.spy({ agentNo: agent });
        if (res.code === 0) {
          this.isSpying = true;
          this.spyTarget = agent;
          this.showToast('监听已启动', 'success');
          this.addEvent('SPY_RESULT', { agent, ...res });
        } else {
          this.showToast(`监听失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`监听异常: ${err.message}`, 'danger');
      }
    },

    async unspy() {
      if (!this.canUnspy) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.unspy();
        if (res.code === 0) {
          this.isSpying = false;
          this.spyTarget = null;
          this.isWhispering = false;
          this.whisperTarget = null;
          this.isBarging = false;
          this.bargeTarget = null;
          this.showToast('监听已取消', 'success');
          this.addEvent('SPY_UNLINK', res);
        } else {
          this.showToast(`取消监听失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`取消监听异常: ${err.message}`, 'danger');
      }
    },

    async whisper() {
      if (!this.canWhisper) return;
      try {
        const agent = this.spyTarget || prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.whisper({ agentNo: agent });
        if (res.code === 0) {
          this.isWhispering = true;
          this.whisperTarget = agent;
          this.showToast('耳语已启动', 'success');
          this.addEvent('WHISPER_RESULT', { agent, ...res });
        } else {
          this.showToast(`耳语失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`耳语异常: ${err.message}`, 'danger');
      }
    },

    async unWhisper() {
      if (!this.canUnwhisper) return;
      try {
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.unWhisper();
        if (res.code === 0) {
          this.isWhispering = false;
          this.whisperTarget = null;
          // 退回到监听状态
          this.showToast('耳语已取消，回到监听状态', 'success');
          this.addEvent('WHISPER_UNLINK', res);
        } else {
          this.showToast(`取消耳语失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`取消耳语异常: ${err.message}`, 'danger');
      }
    },

    async barge() {
      if (!this.canBarge) return;
      try {
        const agent = this.spyTarget || prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.barge({ agentNo: agent });
        if (res.code === 0) {
          this.isBarging = true;
          this.bargeTarget = agent;
          this.showToast('强插已启动', 'success');
          this.addEvent('BARGE_RESULT', { agent, ...res });
        } else {
          this.showToast(`强插失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`强插异常: ${err.message}`, 'danger');
      }
    },

    async cancelBarge() {
      if (!this.canCancelBarge) return;
      try {
        // 强插没有专门的取消方法，通常通过挂断来取消
        const AgentSDK = await getAgentSDK();
        // 使用 sipUnlink 或 unlink 来结束强插
        const res = await AgentSDK.sipUnlink ? await AgentSDK.sipUnlink() : await AgentSDK.unlink({ side: 1 });
        if (res.code === 0) {
          this.isBarging = false;
          this.bargeTarget = null;
          // 可能回到监听状态或完全退出
          this.showToast('强插已取消', 'success');
          this.addEvent('BARGE_UNLINK', res);
        } else {
          this.showToast(`取消强插失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`取消强插异常: ${err.message}`, 'danger');
      }
    },

    async disconnect() {
      if (!this.canDisconnect) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.disconnect({ agentNo: agent });
        if (res.code === 0) {
          this.showToast('强拆已执行', 'success');
          this.addEvent('DISCONNECT_RESULT', { agent, ...res });
        } else {
          this.showToast(`强拆失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`强拆异常: ${err.message}`, 'danger');
      }
    },

    async setOnline() {
      if (!this.loggedIn) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const endpoint = prompt('请输入绑定终端（手机号或分机号）:');
        if (!endpoint) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.setOnline({
          agentNo: agent,
          bindEndpoint: { endpointType: 1, endpoint }
        });
        if (res.code === 0) {
          this.showToast(`坐席 ${agent} 已强制上线`, 'success');
          this.addEvent('SET_ONLINE', { agent, ...res });
        } else {
          this.showToast(`强制上线失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`强制上线异常: ${err.message}`, 'danger');
      }
    },

    async setOffline() {
      if (!this.loggedIn) return;
      try {
        const agent = prompt('请输入目标坐席号:');
        if (!agent) return;
        
        const AgentSDK = await getAgentSDK();
        const res = await AgentSDK.setOffline({ agentNo: agent, unbindEndpoint: 0 });
        if (res.code === 0) {
          this.showToast(`坐席 ${agent} 已强制下线`, 'success');
          this.addEvent('SET_OFFLINE', { agent, ...res });
        } else {
          this.showToast(`强制下线失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`强制下线异常: ${err.message}`, 'danger');
      }
    },

    async setBusy() {
      if (!this.canSetBusy) return;
      try {
        const AgentSDK = await getAgentSDK();
        // 使用正确的 pause 方法
        const res = await AgentSDK.pause({ 
          pauseType: 2,  // 2 = 非生产性忙碌
          pauseDescription: 'BUSY' 
        });
        if (res.code === 0) {
          this.showToast('已置忙', 'warning');
          this.addEvent('SET_BUSY', res);
        } else {
          this.showToast(`置忙失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`置忙异常: ${err.message}`, 'danger');
      }
    },

    async setIdle() {
      if (!this.canSetIdle) return;
      try {
        const AgentSDK = await getAgentSDK();
        // 使用正确的 unpause 方法
        const res = await AgentSDK.unpause();
        if (res.code === 0) {
          this.showToast('已置闲', 'success');
          this.addEvent('SET_IDLE', res);
        } else {
          this.showToast(`置闲失败: ${res.message || res.errorCode}`, 'danger');
        }
      } catch (err) {
        this.showToast(`置闲异常: ${err.message}`, 'danger');
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

    // 测试辅助方法：用于集成测试中正确更新响应式状态
    // 注意：这个方法会触发 PetiteVue 的响应式更新
    setTestState(newState) {
      Object.keys(newState).forEach(key => {
        this[key] = newState[key];
      });
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
  // 注意：PetiteVue.createApp 返回的是应用实例，不是响应式对象
  // 需要使用 PetiteVue.reactive 来创建响应式对象
  const reactiveApp = PetiteVue.reactive(App);
  
  // 创建应用实例并挂载
  const app = PetiteVue.createApp(reactiveApp);
  app.mount('#app');
  
  // 暴露响应式对象到全局作用域（用于测试）
  window.App = reactiveApp;
  
  // 初始化
  reactiveApp.init();

})();
