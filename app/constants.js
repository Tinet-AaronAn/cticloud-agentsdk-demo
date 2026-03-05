/**
 * CTICloud AgentSDK 常量定义
 * 
 * 所有状态码和枚举值的单一真相源
 * 文档：docs/CONSTANTS.md
 */

// 设备状态
const DeviceStatus = {
  UNBIND: 0,      // 未绑定
  IDLE: 1,        // 空闲
  WAITING: 2,     // 等待
  RINGING: 3,     // 振铃中
  TALKING: 4,     // 通话中
  WRAPUP: 5,      // 话后处理
  OFFLINE: 6      // 离线
};

// 坐席状态
const AgentStatus = {
  IDLE: 1,        // 空闲
  BUSY: 2,        // 忙碌
  WRAPUP: 3       // 话后整理
};

// 终端类型
const EndpointType = {
  PSTN: 1,        // 手机/固话
  SIP_PHONE: 2,   // SIP 硬话机
  WEBRTC: 3       // WebRTC 软电话
};

// 呼叫类型
const CallType = {
  INBOUND: 1,           // 呼入
  WEBCALL: 2,           // WebCall
  PREVIEW_OBCALL: 4,    // 预览外呼
  PREDICTIVE_OBCALL: 5, // 预测外呼
  OUTBOUND: 6,          // 外呼
  INTERNAL: 9,          // 内部呼叫
  SIP_INBOUND: 11       // SIP接入
};

// 置忙类型
const PauseType = {
  PRODUCTIVE: 0,        // 生产性忙碌
  NON_PRODUCTIVE: 2     // 非生产性忙碌
};

// 登出模式
const LogoutMode = {
  NORMAL: 1,      // 正常登出
  FORCE: 2        // 强制登出
};

// 导出（兼容不同模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DeviceStatus,
    AgentStatus,
    EndpointType,
    CallType,
    PauseType,
    LogoutMode
  };
}

// 全局挂载（用于浏览器环境）
if (typeof window !== 'undefined') {
  window.Constants = {
    DeviceStatus,
    AgentStatus,
    EndpointType,
    CallType,
    PauseType,
    LogoutMode
  };
}
