# 常量定义 — CTICloud AgentSDK

> **单一真相源（Single Source of Truth）**：所有状态码和枚举值的权威定义

---

## 📱 设备状态 (DeviceStatus)

设备状态表示坐席绑定的终端设备当前状态。

| 值 | 常量名 | 说明 | 可用操作 |
|----|--------|------|----------|
| 0 | UNBIND | 未绑定 | - |
| 1 | IDLE | 空闲 | 外呼、接听 |
| 2 | WAITING | 等待 | - |
| 3 | RINGING | 振铃中 | 接听（软电话） |
| 4 | TALKING | 通话中 | 挂断、保持、静音、咨询、转接 |
| 5 | WRAPUP | 话后处理 | 置闲 |
| 6 | OFFLINE | 离线 | - |

**代码定义**：
```javascript
const DeviceStatus = {
  UNBIND: 0,
  IDLE: 1,
  WAITING: 2,
  RINGING: 3,
  TALKING: 4,
  WRAPUP: 5,
  OFFLINE: 6
};
```

---

## 👤 坐席状态 (AgentStatus)

坐席状态表示坐席的业务状态（工作状态）。

| 值 | 常量名 | 说明 | 可用操作 |
|----|--------|------|----------|
| 1 | IDLE | 空闲（可接听/外呼） | 置忙、外呼 |
| 2 | BUSY | 忙碌（不接听） | 置闲 |
| 3 | WRAPUP | 话后整理 | 置闲 |

**代码定义**：
```javascript
const AgentStatus = {
  IDLE: 1,
  BUSY: 2,
  WRAPUP: 3
};
```

**注意**：
- `AgentStatus` 和 `DeviceStatus` 是两个独立维度
- 例如：坐席状态=空闲，设备状态=振铃中 → 可以接听
- 例如：坐席状态=忙碌，设备状态=空闲 → 不能外呼

---

## 📞 终端类型 (EndpointType)

坐席绑定的语音终端类型。

| 值 | 常量名 | 说明 | 特性 |
|----|--------|------|------|
| 1 | PSTN | 手机/固话 | 需要接听/挂断操作 |
| 2 | SIP_PHONE | SIP 硬话机 | 物理设备 |
| 3 | WEBRTC | WebRTC 软电话 | 浏览器内通话，支持接听/挂断 |

**代码定义**：
```javascript
const EndpointType = {
  PSTN: 1,
  SIP_PHONE: 2,
  WEBRTC: 3
};
```

**配置示例**：
```json
{
  "bindEndpoint": {
    "endpointType": 3,
    "endpoint": "1865"
  }
}
```

---

## 📞 呼叫类型 (CallType)

呼叫的业务类型，用于标识呼叫来源和目的。

| 值 | 常量名 | 说明 | 场景 |
|----|--------|------|------|
| 1 | INBOUND | 呼入 | 客户来电 |
| 2 | WEBCALL | WebCall | 网页回呼 |
| 4 | PREVIEW_OBCALL | 预览外呼 | 坐席预览后外呼 |
| 5 | PREDICTIVE_OBCALL | 预测外呼 | 系统自动外呼 |
| 6 | OUTBOUND | 外呼 | 普通外呼 |
| 9 | INTERNAL | 内部呼叫 | 坐席间通话 |
| 11 | SIP_INBOUND | SIP接入 | SIP 中继接入 |

**代码定义**：
```javascript
const CallType = {
  INBOUND: 1,
  WEBCALL: 2,
  PREVIEW_OBCALL: 4,
  PREDICTIVE_OBCALL: 5,
  OUTBOUND: 6,
  INTERNAL: 9,
  SIP_INBOUND: 11
};
```

---

## 🚫 置忙类型 (PauseType)

置忙的业务类型，用于区分忙碌原因。

| 值 | 常量名 | 说明 | 场景 |
|----|--------|------|------|
| 0 | PRODUCTIVE | 生产性忙碌 | 通话后整理 |
| 2 | NON_PRODUCTIVE | 非生产性忙碌 | 会议、培训、小休 |

**代码定义**：
```javascript
const PauseType = {
  PRODUCTIVE: 0,
  NON_PRODUCTIVE: 2
};
```

**使用示例**：
```javascript
AgentSDK.pause({
  pauseType: PauseType.NON_PRODUCTIVE,
  pauseDescription: 'MEETING'
});
```

---

## 🚪 登出模式 (LogoutMode)

登出的处理方式。

| 值 | 常量名 | 说明 | 影响 |
|----|--------|------|------|
| 1 | NORMAL | 正常登出 | 清理会话，释放资源 |
| 2 | FORCE | 强制登出 | 立即断开，可能有未完成通话 |

**代码定义**：
```javascript
const LogoutMode = {
  NORMAL: 1,
  FORCE: 2
};
```

---

## 🔄 WebRTC 统计指标

WebRTC 通话质量指标，通过 `WEBRTC_STATS` 事件每秒上报。

| 字段 | 类型 | 单位 | 说明 | 健康阈值 |
|------|------|------|------|----------|
| `jitter` | number | ms | 抖动（延迟变化） | < 30ms 优良 |
| `packetLossRate` | number | 0-1 | 丢包率（比例） | < 1% 优良 |
| `rtt` | number | ms | 往返时延 | < 150ms 优良 |

**使用示例**：
```javascript
AgentSDK.on(EventType.WEBRTC_STATS, (stats) => {
  console.log('抖动:', stats.jitter, 'ms');
  console.log('丢包:', (stats.packetLossRate * 100).toFixed(2), '%');
  console.log('延迟:', stats.rtt, 'ms');
});
```

---

## 🎯 初始状态 (InitialStatus)

登录后的初始坐席状态。

| 值 | 常量名 | 说明 |
|----|--------|------|
| 1 | IDLE | 空闲（可接听） |
| 2 | BUSY | 忙碌（不接听） |

**默认值**：`1`（空闲）

---

## 📋 使用建议

### 1. 在代码中定义常量

```javascript
// constants.js
export const DeviceStatus = {
  UNBIND: 0,
  IDLE: 1,
  WAITING: 2,
  RINGING: 3,
  TALKING: 4,
  WRAPUP: 5,
  OFFLINE: 6
};

// 使用
import { DeviceStatus } from './constants';

if (this.deviceStatus === DeviceStatus.TALKING) {
  // 允许挂断、保持等操作
}
```

### 2. 避免魔法数字

```javascript
// ❌ 不好 - 魔法数字
if (deviceStatus === 4) { ... }

// ✅ 好 - 使用常量
if (deviceStatus === DeviceStatus.TALKING) { ... }
```

### 3. 文档引用

所有文档中的状态码应该引用本文档，避免重复定义：

```markdown
设备状态 3（振铃中），详见 [CONSTANTS.md](./CONSTANTS.md#-设备状态-devicestatus)
```

---

## 🔍 快速查询

### 通话相关状态判断

```javascript
// 是否可以外呼
canCall = agentStatus === AgentStatus.IDLE 
       && deviceStatus === DeviceStatus.IDLE;

// 是否可以接听（软电话）
canAnswer = deviceStatus === DeviceStatus.RINGING 
         && bindEndpoint.endpointType === EndpointType.WEBRTC;

// 是否可以挂断
canHangup = deviceStatus === DeviceStatus.TALKING;

// 是否可以进行咨询转接
canStartAtxfer = deviceStatus === DeviceStatus.TALKING 
             && !isConsulting;
```

---

**最后更新**: 2026-03-05  
**维护者**: 随行 🦞  
**相关文档**: [API.md](./API.md) | [TEST_CASES.md](./TEST_CASES.md)
